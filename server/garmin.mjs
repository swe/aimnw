/**
 * Garmin Connect proxy — activities, HR zones, and on-demand GPS routes.
 *
 * Session: run `pnpm garmin:login` (writes .garmin-session.json).
 * Workouts only. Sleep / HRV / VO₂ stay on Oura; gym volume stays on Hevy.
 */
import { ttlFromEnv, withTtlCache } from './ttlCache.mjs'
import {
  LOGIN_HELP,
  connectGet,
  connectGetBinary,
  garminCredentials,
  loadDotEnv,
  sessionConfigured,
} from './garminSession.mjs'

const LOOKBACK_DAYS = 400
const ACTIVITY_PAGE_SIZE = 100
const MIN_ZONE_DURATION_SEC = 120
const ZONE_CONCURRENCY = 4
const DEFAULT_CACHE_TTL_MS = 10 * 60_000
const ROUTE_CACHE_TTL_MS = 30 * 60_000
const ROUTE_MAX_POINTS = 240

const RUNNING_KEYS = new Set([
  'running',
  'trail_running',
  'treadmill_running',
  'indoor_running',
  'ultra_run',
  'virtual_run',
  'track_running',
  'obstacle_run',
])
const CYCLING_KEYS = new Set([
  'cycling',
  'biking',
  'indoor_cycling',
  'road_biking',
  'mountain_biking',
  'gravel_cycling',
  'virtual_ride',
  'cyclocross',
  'handcycling',
  'gravel_cycling_v2',
])
const HIKING_KEYS = new Set(['hiking', 'mountaineering'])
const SOCCER_KEYS = new Set(['soccer', 'football', 'futsal', 'indoor_soccer'])
const SWIMMING_KEYS = new Set([
  'swimming',
  'lap_swimming',
  'open_water_swimming',
  'pool_swimming',
])
const STRENGTH_KEYS = new Set(['strength_training', 'indoor_cardio', 'cardio'])
const SKIP_KEYS = new Set([
  'walking',
  'casual_walking',
  'golf',
  'golfing',
  'elliptical',
  'yoga',
  'pilates',
  'breathwork',
  'meditation',
  'stretching',
  'e_bike',
  'e_bike_fitness',
  'e_biking',
])

/** Garmin sometimes splits one match into a short + long row — keep the match only. */
const SOCCER_KEEP_LONGEST_DATES = new Set(['2026-08-19'])

const loggedUnknownTypes = new Set()
const routeCache = new Map()

function dateWindow() {
  const now = new Date()
  const end = new Date(now)
  end.setUTCDate(end.getUTCDate() + 1)
  const start = new Date(now)
  start.setUTCDate(start.getUTCDate() - LOOKBACK_DAYS)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

function activityTypeKey(row) {
  return String(row?.activityType?.typeKey || row?.activityTypeDTO?.typeKey || '')
    .trim()
    .toLowerCase()
}

function kindForTypeKey(typeKey) {
  if (RUNNING_KEYS.has(typeKey)) return 'running'
  if (CYCLING_KEYS.has(typeKey)) return 'cycling'
  if (HIKING_KEYS.has(typeKey)) return 'hiking'
  if (SOCCER_KEYS.has(typeKey)) return 'soccer'
  if (SWIMMING_KEYS.has(typeKey)) return 'swimming'
  if (STRENGTH_KEYS.has(typeKey)) return 'strength_training'
  return null
}

function logUnknownType(typeKey) {
  if (!typeKey || SKIP_KEYS.has(typeKey) || loggedUnknownTypes.has(typeKey)) return
  loggedUnknownTypes.add(typeKey)
  console.warn(`[garmin] skipped unknown activity type: ${typeKey}`)
}

function toUtcIso(value) {
  if (!value) return null
  const raw = String(value).trim()
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T')
  const withZone = /Z$|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`
  const ms = Date.parse(withZone)
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toISOString()
}

function civilDate(value) {
  if (!value) return null
  const day = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
}

function num(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function hasGpsFlag(row, typeKey) {
  if (row?.hasPolyline === true || row?.hasPolyline === 'true') return true
  if (row?.hasPolyline === false) return false
  if (typeKey.includes('indoor') || typeKey.includes('treadmill') || typeKey === 'lap_swimming') {
    return false
  }
  if (typeKey === 'strength_training' || typeKey === 'cardio' || typeKey === 'indoor_cardio') {
    return false
  }
  return Boolean(
    num(row?.distance) > 50 &&
      (RUNNING_KEYS.has(typeKey) ||
        CYCLING_KEYS.has(typeKey) ||
        HIKING_KEYS.has(typeKey) ||
        SOCCER_KEYS.has(typeKey) ||
        typeKey === 'open_water_swimming'),
  )
}

function zonesFromGarmin(rows) {
  if (!Array.isArray(rows) || !rows.length) return null
  const zones = [0, 0, 0, 0, 0]
  for (const row of rows) {
    const zone = Number(row?.zoneNumber ?? row?.zone)
    const secs = Number(row?.secsInZone ?? row?.timeInSeconds ?? row?.durationInZone)
    if (!Number.isFinite(zone) || zone < 1 || zone > 5) continue
    if (!Number.isFinite(secs) || secs <= 0) continue
    zones[zone - 1] += Math.round(secs)
  }
  return zones.some((value) => value > 0)
    ? { z1Sec: zones[0], z2Sec: zones[1], z3Sec: zones[2], z4Sec: zones[3], z5Sec: zones[4] }
    : null
}

async function mapPool(items, concurrency, mapper) {
  const results = new Array(items.length)
  let cursor = 0

  async function worker() {
    while (cursor < items.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(items[index], index)
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker())
  await Promise.all(workers)
  return results
}

function applyDistanceDetail(detail, kind, distanceM, durationSec) {
  detail.distanceM = Math.round(distanceM * 10) / 10
  if (kind === 'running' && durationSec > 0 && distanceM > 0) {
    detail.paceSecPerKm = Math.round(durationSec / (distanceM / 1000))
    detail.speedKmH = Math.round((distanceM / 1000 / (durationSec / 3600)) * 10) / 10
  } else if ((kind === 'cycling' || kind === 'hiking') && durationSec > 0 && distanceM > 0) {
    detail.speedKmH = Math.round((distanceM / 1000 / (durationSec / 3600)) * 10) / 10
  } else if (kind === 'swimming' && durationSec > 0 && distanceM > 0) {
    detail.paceSecPer100m = Math.round(durationSec / (distanceM / 100))
  }
}

export function mapGarminActivityToTraining(row, hrZones = null) {
  const typeKey = activityTypeKey(row)
  if (SKIP_KEYS.has(typeKey)) return null
  const kind = kindForTypeKey(typeKey)
  if (!kind) {
    logUnknownType(typeKey)
    return null
  }

  const startedAt = toUtcIso(row.startTimeGMT || row.startTimeLocal)
  if (!startedAt) return null
  const durationSec = Math.max(0, Math.round(num(row.elapsedDuration) || num(row.duration) || num(row.movingDuration) || 0))
  if (durationSec <= 0) return null
  const endedAt = toUtcIso(row.endTimeGMT) || new Date(Date.parse(startedAt) + durationSec * 1000).toISOString()
  const date = civilDate(row.startTimeLocal) || startedAt.slice(0, 10)
  const distanceM = num(row.distance)
  const elevationM = num(row.elevationGain)
  const calories = num(row.calories)
  const avgHr = num(row.averageHR)
  const maxHr = num(row.maxHR)
  const id = String(row.activityId ?? row.activityIdDTO ?? '')
  if (!id) return null

  const detail = {}
  if (distanceM != null && distanceM > 0 && kind !== 'soccer') {
    applyDistanceDetail(detail, kind, distanceM, durationSec)
  }
  if (elevationM != null && elevationM > 0) detail.elevationGainM = Math.round(elevationM)
  if (kind === 'swimming') {
    detail.outdoor = typeKey === 'open_water_swimming' || typeKey === 'swimming'
  }
  detail.hasGps = hasGpsFlag(row, typeKey)

  const rawTitle = String(row.activityName || '').trim()
  const genericSoccer =
    kind === 'soccer' &&
    /^(soccer|football|futsal)(\s*[/\-|]\s*(soccer|football|futsal))?$/i.test(rawTitle)

  return {
    id: `garmin-${id}`,
    kind,
    title: !rawTitle || genericSoccer ? titleFor(kind, typeKey) : rawTitle,
    date,
    startedAt,
    endedAt,
    durationSec,
    metrics: {
      ...(calories != null && calories > 0 ? { caloriesBurnt: Math.round(calories) } : {}),
      ...(avgHr != null && avgHr > 0 ? { avgHrBpm: Math.round(avgHr) } : {}),
      ...(maxHr != null && maxHr > 0 ? { maxHrBpm: Math.round(maxHr) } : {}),
      ...(hrZones ? { hrZones } : {}),
    },
    detail,
    source: 'garmin',
    externalId: id,
    notes: null,
    isPublic: true,
    createdAt: endedAt,
    imageAssetId: null,
  }
}

function titleFor(kind, typeKey) {
  if (kind === 'running') return typeKey.includes('trail') ? 'Trail Run' : 'Run'
  if (kind === 'cycling') {
    if (typeKey.includes('indoor')) return 'Indoor Ride'
    if (typeKey.includes('mountain')) return 'Mountain Bike'
    return 'Ride'
  }
  if (kind === 'hiking') return 'Hike'
  if (kind === 'soccer') return 'Football / Soccer'
  if (kind === 'swimming') return typeKey.includes('open') ? 'Open Water Swim' : 'Swim'
  return 'Strength'
}

async function fetchActivityPages(startDate, endDate, signal) {
  const rows = []
  for (let start = 0; start < 2000; start += ACTIVITY_PAGE_SIZE) {
    const page = await connectGet(
      '/activitylist-service/activities/search/activities',
      { start, limit: ACTIVITY_PAGE_SIZE, startDate, endDate },
      signal,
    )
    const batch = Array.isArray(page)
      ? page
      : Array.isArray(page?.activityList)
        ? page.activityList
        : []
    rows.push(...batch)
    if (batch.length < ACTIVITY_PAGE_SIZE) break
  }
  return rows
}

async function fetchHrZones(activityId, durationSec, signal) {
  if (durationSec < MIN_ZONE_DURATION_SEC) return null
  try {
    const payload = await connectGet(`/activity-service/activity/${activityId}/hrTimeInZones`, {}, signal)
    return zonesFromGarmin(payload)
  } catch {
    return null
  }
}

function keepLongestSoccerOnDates(activities, dates) {
  const drop = new Set()
  for (const date of dates) {
    const soccer = activities.filter((row) => row.kind === 'soccer' && row.date === date)
    if (soccer.length <= 1) continue
    let keep = soccer[0]
    for (const row of soccer) {
      if (row.durationSec > keep.durationSec) keep = row
    }
    for (const row of soccer) {
      if (row.id !== keep.id) drop.add(row.id)
    }
  }
  return drop.size ? activities.filter((row) => !drop.has(row.id)) : activities
}

export async function fetchGarminWorkoutsSummary(signal) {
  const { startDate, endDate } = dateWindow()
  const raw = await fetchActivityPages(startDate, endDate, signal)
  const relevant = raw.filter((row) => {
    const typeKey = activityTypeKey(row)
    if (SKIP_KEYS.has(typeKey)) return false
    const kind = kindForTypeKey(typeKey)
    if (!kind) {
      logUnknownType(typeKey)
      return false
    }
    return true
  })

  const mapped = (
    await mapPool(relevant, ZONE_CONCURRENCY, async (row) => {
      const durationSec = Math.round(num(row.elapsedDuration) || num(row.duration) || 0)
      const zones = await fetchHrZones(String(row.activityId), durationSec, signal)
      return mapGarminActivityToTraining(row, zones)
    })
  ).filter(Boolean)

  const activities = keepLongestSoccerOnDates(mapped, SOCCER_KEEP_LONGEST_DATES).sort((a, b) =>
    b.startedAt.localeCompare(a.startedAt),
  )

  return {
    fetchedAt: new Date().toISOString(),
    startDate,
    endDate,
    activityCount: activities.length,
    activities,
  }
}

const loadGarminWorkoutsSummary = withTtlCache(
  () => fetchGarminWorkoutsSummary(),
  () => {
    loadDotEnv()
    return ttlFromEnv('GARMIN_CACHE_TTL_MS', DEFAULT_CACHE_TTL_MS)
  },
)

function downsamplePoints(points, maxPoints = ROUTE_MAX_POINTS) {
  if (points.length <= maxPoints) return points
  const out = []
  const step = (points.length - 1) / (maxPoints - 1)
  for (let i = 0; i < maxPoints; i += 1) {
    out.push(points[Math.round(i * step)])
  }
  return out
}

function pointFromPair(lat, lon) {
  const latitude = Number(lat)
  const longitude = Number(lon)
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null
  if (latitude === 0 && longitude === 0) return null
  return { lat: latitude, lon: longitude }
}

function pointsFromDetails(payload) {
  const points = []
  const descriptors = Array.isArray(payload?.metricDescriptors) ? payload.metricDescriptors : []
  const latIndex = descriptors.findIndex((row) => /lat/i.test(String(row?.key || '')))
  const lonIndex = descriptors.findIndex((row) => /lon/i.test(String(row?.key || '')))
  const metrics = Array.isArray(payload?.activityDetailMetrics) ? payload.activityDetailMetrics : []
  if (latIndex >= 0 && lonIndex >= 0 && metrics.length) {
    for (const row of metrics) {
      const values = row?.metrics
      if (!Array.isArray(values)) continue
      const point = pointFromPair(values[latIndex], values[lonIndex])
      if (point) points.push(point)
    }
  }

  if (points.length >= 2) return points

  const geo = payload?.geoPolylineDTO || payload?.geoPolyline
  const samples = Array.isArray(geo?.polyline) ? geo.polyline : []
  for (const sample of samples) {
    const point = pointFromPair(sample?.lat ?? sample?.latitude, sample?.lon ?? sample?.longitude)
    if (point) points.push(point)
  }
  if (points.length >= 2) return points

  const start = pointFromPair(geo?.startPoint?.lat, geo?.startPoint?.lon)
  const end = pointFromPair(geo?.endPoint?.lat, geo?.endPoint?.lon)
  if (start && end) return [start, end]
  return []
}

function pointsFromGpx(xml) {
  const points = []
  const re = /<trkpt\b([^>]*)>/gi
  let match = re.exec(xml)
  while (match) {
    const attrs = match[1]
    const lat = /lat="([^"]+)"/i.exec(attrs)?.[1]
    const lon = /lon="([^"]+)"/i.exec(attrs)?.[1]
    const point = pointFromPair(lat, lon)
    if (point) points.push(point)
    match = re.exec(xml)
  }
  return points
}

async function fetchActivityRoute(activityId, signal) {
  const cached = routeCache.get(activityId)
  if (cached && cached.expiresAt > Date.now()) return cached.body

  let name = null
  let sport = 'unknown'
  let startedAt = new Date().toISOString()
  let points = []

  try {
    const summary = await connectGet(`/activity-service/activity/${activityId}`, {}, signal)
    name = summary?.activityName || null
    sport = activityTypeKey(summary) || 'unknown'
    startedAt = toUtcIso(summary?.startTimeGMT || summary?.summaryDTO?.startTimeGMT) || startedAt
  } catch {
    /* details can still succeed */
  }

  try {
    const details = await connectGet(
      `/activity-service/activity/${activityId}/details`,
      { maxChartSize: 2000, maxPolylineSize: 4000 },
      signal,
    )
    points = pointsFromDetails(details)
  } catch {
    points = []
  }

  if (points.length < 2) {
    try {
      const gpx = await connectGetBinary(`/download-service/export/gpx/activity/${activityId}`, signal)
      if (typeof gpx === 'string') points = pointsFromGpx(gpx)
    } catch {
      /* indoor / no GPS */
    }
  }

  const body = {
    activityId,
    name,
    sport,
    startedAt,
    points: downsamplePoints(points),
  }
  routeCache.set(activityId, { expiresAt: Date.now() + ROUTE_CACHE_TTL_MS, body })
  return body
}

function notConfigured() {
  return {
    status: 503,
    body: {
      configured: false,
      error: LOGIN_HELP,
      message: LOGIN_HELP,
    },
  }
}

export async function handleGarminRequest(method = 'GET', pathname = '/api/garmin/status') {
  if (method !== 'GET') {
    return { status: 405, body: { error: 'Method not allowed' } }
  }

  loadDotEnv()
  const configured = sessionConfigured()
  const { email, password } = garminCredentials()
  const canLogin = Boolean(email && password)

  if (pathname === '/api/garmin/status') {
    return {
      status: 200,
      body: {
        configured,
        message: configured
          ? 'Garmin Connect workouts (runs, rides, hikes, football, swims, gym HR) are available.'
          : canLogin
            ? 'Garmin credentials are in .env. Loading a session — if MFA is on, run `pnpm garmin:login`.'
            : LOGIN_HELP,
      },
    }
  }

  if (!configured && !canLogin) return notConfigured()

  if (pathname === '/api/garmin/workouts' || pathname === '/api/garmin/summary') {
    try {
      const summary = await loadGarminWorkoutsSummary()
      return { status: 200, body: summary }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load Garmin workout data'
      return {
        status: /pnpm garmin:login|MFA|blocked automated/.test(message) ? 503 : 502,
        body: { error: message },
      }
    }
  }

  const routeMatch = pathname.match(/^\/api\/garmin\/activities\/([^/]+)\/route$/)
  if (routeMatch) {
    try {
      const route = await fetchActivityRoute(decodeURIComponent(routeMatch[1]))
      return { status: 200, body: route }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load Garmin route'
      return { status: 502, body: { error: message } }
    }
  }

  return { status: 404, body: { error: 'Not found' } }
}
