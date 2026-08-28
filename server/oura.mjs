/**
 * Oura Ring API proxy — runs, cycling, and hikes as TrainingActivity rows.
 *
 * Env (server-only):
 *   OURA_ACCESS_TOKEN — bearer token (personal or OAuth access token)
 * Optional refresh (when access token expires):
 *   OURA_CLIENT_ID / OURA_CLIENT_SECRET / OURA_REFRESH_TOKEN
 *
 * Notes:
 *   - Oura has no GPS; workout docs never include map / route geometry.
 *   - Strava→Oura syncs often omit distance; we enrich avg/max HR from the
 *     heartrate time series when present.
 */
import { loadDotEnv, optionalServerEnv } from './env.mjs'
import { ttlFromEnv, withTtlCache } from './ttlCache.mjs'

const OURA_API = 'https://api.ouraring.com'
/** How far back to pull workouts (rolling window). */
const LOOKBACK_DAYS = 400
/** Parallel HR fetches when enriching workouts. */
const HR_CONCURRENCY = 4
/** A cold summary fans out one HR series per workout, so reuse it across visitors. */
const DEFAULT_CACHE_TTL_MS = 10 * 60_000

function env(name) {
  return optionalServerEnv(name)
}

async function refreshAccessToken() {
  const clientId = env('OURA_CLIENT_ID')
  const clientSecret = env('OURA_CLIENT_SECRET')
  const refreshToken = env('OURA_REFRESH_TOKEN')
  if (!clientId || !clientSecret || !refreshToken) return null

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch(`${OURA_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  })

  if (!response.ok) {
    throw new Error(`Oura token refresh failed: ${response.status}`)
  }

  const payload = await response.json()
  if (payload?.access_token) {
    process.env.OURA_ACCESS_TOKEN = String(payload.access_token)
  }
  if (payload?.refresh_token) {
    process.env.OURA_REFRESH_TOKEN = String(payload.refresh_token)
  }
  return payload?.access_token ? String(payload.access_token) : null
}

async function getAccessToken() {
  let token = env('OURA_ACCESS_TOKEN')
  if (token.toLowerCase().startsWith('bearer ')) token = token.slice(7).trim()
  if (token) return token

  const refreshed = await refreshAccessToken()
  if (refreshed) return refreshed

  throw new Error('Missing OURA_ACCESS_TOKEN')
}

async function ouraGet(token, pathname, searchParams, signal) {
  const url = new URL(`${OURA_API}${pathname}`)
  for (const [key, value] of Object.entries(searchParams)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value))
  }

  const response = await fetch(url, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    const refreshed = await refreshAccessToken()
    if (refreshed && refreshed !== token) {
      return ouraGet(refreshed, pathname, searchParams, signal)
    }
  }

  if (!response.ok) {
    let detail = String(response.status)
    try {
      const body = await response.json()
      if (body?.detail) detail = String(body.detail)
    } catch {
      /* ignore */
    }
    throw new Error(`Oura request failed: ${detail}`)
  }

  return response.json()
}

async function fetchAllCollection(token, pathname, startDate, endDate, signal) {
  const rows = []
  let nextToken = null

  do {
    const payload = await ouraGet(
      token,
      pathname,
      {
        start_date: startDate,
        end_date: endDate,
        next_token: nextToken,
      },
      signal,
    )
    const chunk = Array.isArray(payload?.data) ? payload.data : []
    rows.push(...chunk)
    nextToken = payload?.next_token ? String(payload.next_token) : null
  } while (nextToken)

  return rows
}

async function fetchAllWorkouts(token, startDate, endDate, signal) {
  return fetchAllCollection(token, '/v2/usercollection/workout', startDate, endDate, signal)
}

/** Best-effort fetch — returns [] when the token lacks scope (e.g. heart_health). */
async function fetchCollectionOptional(token, pathname, startDate, endDate, signal) {
  try {
    return await fetchAllCollection(token, pathname, startDate, endDate, signal)
  } catch {
    return []
  }
}

/** Probe whether the token can read cardiovascular age (requires heart_health OAuth scope). */
export async function probeOuraHeartHealth(token, signal) {
  const end = new Date()
  const start = new Date(end)
  start.setUTCDate(start.getUTCDate() - 14)
  try {
    const payload = await ouraGet(
      token,
      '/v2/usercollection/daily_cardiovascular_age',
      {
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
      },
      signal,
    )
    const rows = Array.isArray(payload?.data) ? payload.data : []
    return {
      available: true,
      needsScope: false,
      sampleCount: rows.length,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const needsScope = /heart_health|scope/i.test(message)
    return {
      available: false,
      needsScope,
      sampleCount: 0,
      error: message,
    }
  }
}

/**
 * Avg / max HR for a workout window. Prefers `source: workout` samples.
 * Returns null when the series is empty (common for short / outdoor-GPS-only activities).
 */
async function fetchWorkoutHrStats(token, startDatetime, endDatetime, signal) {
  if (!startDatetime || !endDatetime) return null

  try {
    const payload = await ouraGet(
      token,
      '/v2/usercollection/heartrate',
      {
        start_datetime: startDatetime,
        end_datetime: endDatetime,
      },
      signal,
    )
    const rows = Array.isArray(payload?.data) ? payload.data : []
    const workoutRows = rows.filter((row) => String(row?.source || '') === 'workout')
    const samples = (workoutRows.length ? workoutRows : rows)
      .map((row) => Number(row?.bpm))
      .filter((bpm) => Number.isFinite(bpm) && bpm > 0)

    if (!samples.length) return null

    const sum = samples.reduce((acc, bpm) => acc + bpm, 0)
    return {
      avgHrBpm: Math.round(sum / samples.length),
      maxHrBpm: Math.round(Math.max(...samples)),
    }
  } catch {
    return null
  }
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

function isoDay(value) {
  if (!value) return null
  const day = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null
}

function toUtcIso(value) {
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) return null
  return new Date(ms).toISOString()
}

function isRunActivity(activity) {
  const key = String(activity || '').toLowerCase()
  return (
    key === 'running' ||
    key === 'jogging' ||
    key === 'trail_running' ||
    key === 'trailrunning' ||
    key === 'indoor_running'
  )
}

function isCycleActivity(activity) {
  const key = String(activity || '').toLowerCase()
  return (
    key === 'cycling' ||
    key === 'biking' ||
    key === 'indoor_cycling' ||
    key === 'spinning' ||
    key === 'mountain_biking' ||
    key === 'gravel_cycling' ||
    key === 'road_biking'
  )
}

function isHikeActivity(activity) {
  const key = String(activity || '').toLowerCase()
  return key === 'hiking' || key === 'mountaineering'
}

function isSoccerActivity(activity) {
  const key = String(activity || '').toLowerCase()
  return key === 'soccer' || key === 'football' || key === 'futsal'
}

function kindForActivity(activity) {
  if (isRunActivity(activity)) return 'running'
  if (isCycleActivity(activity)) return 'cycling'
  if (isHikeActivity(activity)) return 'hiking'
  if (isSoccerActivity(activity)) return 'soccer'
  return null
}

function titleFor(workout, kind) {
  const label = String(workout.label || '').trim()
  if (label && !(kind === 'soccer' && /^(soccer|football|futsal)(\s*[/\-|]\s*(soccer|football|futsal))?$/i.test(label))) {
    return label
  }
  if (kind === 'running') {
    const activity = String(workout.activity || '').toLowerCase()
    if (activity.includes('trail')) return 'Trail Run'
    return 'Run'
  }
  if (kind === 'cycling') {
    const activity = String(workout.activity || '').toLowerCase()
    if (activity.includes('indoor') || activity === 'spinning') return 'Indoor Ride'
    if (activity.includes('mountain')) return 'Mountain Bike'
    return 'Ride'
  }
  if (kind === 'hiking') return 'Hike'
  if (kind === 'soccer') return 'Football / Soccer'
  return 'Workout'
}

function intensityNote(intensity) {
  const value = String(intensity || '').trim()
  if (!value) return null
  return `${value.charAt(0).toUpperCase()}${value.slice(1)} intensity`
}

/**
 * Oura/Strava syncs often omit GPS distance. Estimate from duration so long-run
 * charts and session details aren't empty for multi-hour workouts.
 */
function estimateDistanceM(kind, durationSec, intensity) {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return null
  const level = String(intensity || '').toLowerCase()

  if (kind === 'running') {
    // sec/km — easy slower, hard faster
    const paceSecPerKm = level === 'easy' ? 390 : level === 'hard' || level === 'high' ? 330 : 360
    return (durationSec / paceSecPerKm) * 1000
  }
  if (kind === 'cycling') {
    const speedKmh = level === 'easy' ? 20 : level === 'hard' || level === 'high' ? 30 : 25
    return (durationSec / 3600) * speedKmh * 1000
  }
  if (kind === 'hiking') {
    return (durationSec / 3600) * 4 * 1000
  }
  return null
}

function applyDistanceDetail(detail, kind, distanceM, durationSec) {
  detail.distanceM = Math.round(distanceM * 10) / 10
  if (kind === 'running' && durationSec > 0) {
    detail.paceSecPerKm = Math.round(durationSec / (distanceM / 1000))
    detail.speedKmH = Math.round((distanceM / 1000 / (durationSec / 3600)) * 10) / 10
  } else if ((kind === 'cycling' || kind === 'hiking') && durationSec > 0) {
    detail.speedKmH = Math.round((distanceM / 1000 / (durationSec / 3600)) * 10) / 10
  }
}

/**
 * Map an Oura workout into the TrainingActivity shape used by the sport hub.
 * Only runs, cycling, hikes, and football — walks and other auto-detect noise are skipped.
 * Returns null when the workout should be skipped.
 */
export function mapOuraWorkoutToTrainingActivity(workout, hrStats = null) {
  const kind = kindForActivity(workout?.activity)
  if (!kind) return null

  const startedAt = toUtcIso(workout.start_datetime)
  const endedAt = toUtcIso(workout.end_datetime)
  if (!startedAt || !endedAt) return null

  const startMs = Date.parse(startedAt)
  const endMs = Date.parse(endedAt)
  const durationSec =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs
      ? Math.round((endMs - startMs) / 1000)
      : 0
  if (durationSec <= 0) return null

  const rawDistance = Number(workout.distance)
  const hasGpsDistance = Number.isFinite(rawDistance) && rawDistance > 0
  const estimatedDistance = hasGpsDistance
    ? null
    : estimateDistanceM(kind, durationSec, workout.intensity)
  const distanceM = hasGpsDistance ? rawDistance : estimatedDistance
  const hasDistance = Number.isFinite(distanceM) && distanceM > 0

  const date = isoDay(workout.day) || startedAt.slice(0, 10)
  const calories = Number(workout.calories)
  const detail = {}
  if (hasDistance) {
    applyDistanceDetail(detail, kind, distanceM, durationSec)
  }

  const id = String(workout.id || `oura-${startedAt}`)
  const avgHrBpm = hrStats?.avgHrBpm
  const maxHrBpm = hrStats?.maxHrBpm
  const notes = [
    intensityNote(workout.intensity),
    !hasGpsDistance && hasDistance ? 'Distance estimated (Oura omitted GPS)' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return {
    id: `oura-${id}`,
    kind,
    title: titleFor(workout, kind),
    date,
    startedAt,
    endedAt,
    durationSec,
    metrics: {
      ...(Number.isFinite(calories) && calories > 0
        ? { caloriesBurnt: Math.round(calories) }
        : {}),
      ...(Number.isFinite(avgHrBpm) && avgHrBpm > 0 ? { avgHrBpm } : {}),
      ...(Number.isFinite(maxHrBpm) && maxHrBpm > 0 ? { maxHrBpm } : {}),
    },
    detail,
    source: 'oura',
    externalId: id,
    notes: notes || null,
    isPublic: true,
    createdAt: endedAt,
    imageAssetId: null,
  }
}

function dateWindow() {
  const now = new Date()
  // Oura's end_date is exclusive of in-progress / same-day sleep; use tomorrow
  // so today's completed overnight sleep is included in the window.
  const end = new Date(now)
  end.setUTCDate(end.getUTCDate() + 1)
  const start = new Date(now)
  start.setUTCDate(start.getUTCDate() - LOOKBACK_DAYS)
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  }
}

function mapOuraSleepSession(row) {
  // Prefer overnight sleep; skip short naps for KPI averages.
  const type = String(row?.type || '').toLowerCase()
  if (type && type !== 'long_sleep') return null

  const day = isoDay(row.day)
  if (!day) return null

  const totalSec = Number(row.total_sleep_duration)
  const deepSec = Number(row.deep_sleep_duration)
  const remSec = Number(row.rem_sleep_duration)
  const lightSec = Number(row.light_sleep_duration)
  const awakeSec = Number(row.awake_time)
  if (!Number.isFinite(totalSec) || totalSec <= 0) return null

  const bedtime = toUtcIso(row.bedtime_start) || `${day}T00:00:00.000Z`
  const wakeTime = toUtcIso(row.bedtime_end) || bedtime

  return {
    id: `oura-sleep-${row.id || day}`,
    date: day,
    bedtime,
    wakeTime,
    duration: {
      totalMin: Math.round(totalSec / 60),
      deepMin: Number.isFinite(deepSec) ? Math.round(deepSec / 60) : 0,
      remMin: Number.isFinite(remSec) ? Math.round(remSec / 60) : 0,
      coreMin: Number.isFinite(lightSec) ? Math.round(lightSec / 60) : 0,
      awakeMin: Number.isFinite(awakeSec) ? Math.round(awakeSec / 60) : 0,
    },
    qualityScore: Number.isFinite(Number(row.efficiency)) ? Math.round(Number(row.efficiency)) : null,
    source: 'oura',
    notes: null,
    isPublic: true,
    createdAt: wakeTime,
    /** Attached for biometric merge (average HRV overnight). */
    averageHrv: Number.isFinite(Number(row.average_hrv)) ? Number(row.average_hrv) : null,
  }
}

function buildBiometricsFromOura({ sleepRows, vo2Rows, cardioAgeRows }) {
  const byDay = new Map()

  for (const row of sleepRows) {
    if (!row?.date) continue
    const current = byDay.get(row.date) || {
      date: row.date,
      hrvMs: null,
      vo2Max: null,
      fitnessAge: null,
    }
    if (row.averageHrv != null && Number.isFinite(row.averageHrv)) {
      current.hrvMs = Math.round(row.averageHrv)
    }
    byDay.set(row.date, current)
  }

  for (const row of vo2Rows) {
    const day = isoDay(row.day)
    const vo2 = Number(row.vo2_max)
    if (!day || !Number.isFinite(vo2) || vo2 <= 0) continue
    const current = byDay.get(day) || {
      date: day,
      hrvMs: null,
      vo2Max: null,
      fitnessAge: null,
    }
    current.vo2Max = Math.round(vo2 * 10) / 10
    byDay.set(day, current)
  }

  for (const row of cardioAgeRows) {
    const day = isoDay(row.day)
    const age = Number(row.vascular_age)
    if (!day || !Number.isFinite(age) || age <= 0) continue
    const current = byDay.get(day) || {
      date: day,
      hrvMs: null,
      vo2Max: null,
      fitnessAge: null,
    }
    current.fitnessAge = Math.round(age)
    byDay.set(day, current)
  }

  return [...byDay.values()].sort((a, b) => b.date.localeCompare(a.date))
}

async function fetchChronologicalAge(token, signal) {
  try {
    const payload = await ouraGet(token, '/v2/usercollection/personal_info', {}, signal)
    const age = Number(payload?.age)
    return Number.isFinite(age) && age > 0 ? Math.round(age) : null
  } catch {
    return null
  }
}

export async function fetchOuraWorkoutsSummary(signal) {
  const token = await getAccessToken()
  const { startDate, endDate } = dateWindow()

  const [workouts, sleepRaw, vo2Rows, cardioAgeRows, chronologicalAge] = await Promise.all([
    fetchAllWorkouts(token, startDate, endDate, signal),
    fetchCollectionOptional(token, '/v2/usercollection/sleep', startDate, endDate, signal),
    fetchCollectionOptional(token, '/v2/usercollection/vO2_max', startDate, endDate, signal),
    fetchCollectionOptional(
      token,
      '/v2/usercollection/daily_cardiovascular_age',
      startDate,
      endDate,
      signal,
    ),
    fetchChronologicalAge(token, signal),
  ])

  const relevant = workouts.filter((workout) => kindForActivity(workout?.activity))

  const activities = (
    await mapPool(relevant, HR_CONCURRENCY, async (workout) => {
      const hrStats = await fetchWorkoutHrStats(
        token,
        workout.start_datetime,
        workout.end_datetime,
        signal,
      )
      return mapOuraWorkoutToTrainingActivity(workout, hrStats)
    })
  )
    .filter(Boolean)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))

  const sleep = sleepRaw.map(mapOuraSleepSession).filter(Boolean)
  const biometrics = buildBiometricsFromOura({ sleepRows: sleep, vo2Rows, cardioAgeRows })

  // Strip helper field before returning sleep in TrainingSleep shape.
  const sleepOut = sleep.map(({ averageHrv: _hrv, ...row }) => row)

  return {
    fetchedAt: new Date().toISOString(),
    startDate,
    endDate,
    workoutCount: workouts.length,
    activityCount: activities.length,
    /** Oura never returns GPS; kept explicit for clients / debugging. */
    hasMapData: false,
    activities,
    sleep: sleepOut,
    biometrics,
    chronologicalAge,
    /** Raw included workouts (runs / cycling / hikes only). */
    workouts: relevant,
  }
}

const loadOuraWorkoutsSummary = withTtlCache(
  () => fetchOuraWorkoutsSummary(),
  () => {
    loadDotEnv()
    return ttlFromEnv('OURA_CACHE_TTL_MS', DEFAULT_CACHE_TTL_MS)
  },
)

/** Shared JSON response helper for Vite middleware and production server. */
export async function handleOuraRequest(method, pathname = '/api/oura/workouts') {
  if (method !== 'GET') {
    return {
      status: 405,
      body: { error: 'Method not allowed' },
    }
  }

  if (pathname === '/api/oura/status') {
    const configured = Boolean(env('OURA_ACCESS_TOKEN') || env('OURA_REFRESH_TOKEN'))
    const hasOAuthApp = Boolean(env('OURA_CLIENT_ID') && env('OURA_CLIENT_SECRET'))
    let heartHealth = { available: false, needsScope: true, sampleCount: 0 }
    if (configured) {
      try {
        const token = await getAccessToken()
        heartHealth = await probeOuraHeartHealth(token)
      } catch {
        /* token probe failed — status still reports configured */
      }
    }

    const needsReauth = configured && hasOAuthApp && !heartHealth.available && heartHealth.needsScope

    const fitnessAgeMessage = heartHealth.available
      ? 'Cardiovascular age (Fitness Age tile) is available from Oura.'
      : needsReauth
        ? 'OURA_CLIENT_ID is set but OURA_ACCESS_TOKEN still lacks heart_health. Run `pnpm oura:oauth`, complete the browser login, then restart the dev server.'
        : heartHealth.needsScope
          ? 'Fitness Age and VO₂ max need the heart_health OAuth scope. Run `pnpm oura:oauth` after adding OURA_CLIENT_ID and OURA_CLIENT_SECRET to .env.'
          : 'Cardiovascular age data is not available for this account yet.'

    return {
      status: 200,
      body: {
        configured,
        hasOAuthApp,
        hasMapData: false,
        heartHealth,
        fitnessAgeAvailable: heartHealth.available,
        needsReauth,
        message: configured
          ? `Oura workouts (runs, cycling, hikes) are available. ${fitnessAgeMessage}`
          : 'Add OURA_ACCESS_TOKEN (or OAuth refresh credentials) to enable Oura workouts.',
      },
    }
  }

  if (pathname !== '/api/oura/workouts' && pathname !== '/api/oura/summary') {
    return {
      status: 404,
      body: { error: 'Not found' },
    }
  }

  try {
    const summary = await loadOuraWorkoutsSummary()
    return { status: 200, body: summary }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load Oura workout data'
    return {
      status: message.startsWith('Missing ') ? 503 : 502,
      body: { error: message },
    }
  }
}
