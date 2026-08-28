import { loadDotEnv, requireServerEnv } from './env.mjs'
import { ttlFromEnv, withTtlCache } from './ttlCache.mjs'

const HEVY_BASE = 'https://api.hevyapp.com/v1'
const WORKOUT_PAGE_SIZE = 10
const MEASUREMENT_PAGE_SIZE = 10
/** Cap pages so a cold fetch stays bounded (~1 year of frequent training). */
const MAX_WORKOUT_PAGES = 40
const MAX_MEASUREMENT_PAGES = 40
/** A cold summary walks up to 80 upstream pages, so reuse it across visitors. */
const DEFAULT_CACHE_TTL_MS = 10 * 60_000

async function hevyGet(apiKey, pathname, searchParams, signal) {
  const url = new URL(`${HEVY_BASE}${pathname}`)
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, String(value))
  }

  const response = await fetch(url, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
      'api-key': apiKey,
    },
  })

  if (!response.ok) {
    throw new Error(`Hevy request failed: ${response.status}`)
  }

  return response.json()
}

function setVolumeKg(set) {
  if (set?.type === 'warmup') return 0
  const weight = Number(set?.weight_kg)
  const reps = Number(set?.reps)
  if (!Number.isFinite(weight) || !Number.isFinite(reps) || weight <= 0 || reps <= 0) {
    return 0
  }
  return weight * reps
}

function mapWorkout(workout) {
  const start = workout.start_time || workout.created_at
  const end = workout.end_time || start
  const startMs = Date.parse(start)
  const endMs = Date.parse(end)
  const durationSec =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
      ? Math.round((endMs - startMs) / 1000)
      : 0

  let sets = 0
  let volumeKg = 0
  const exercises = []

  for (const exercise of workout.exercises ?? []) {
    let exerciseSets = 0
    let exerciseVolume = 0
    for (const set of exercise.sets ?? []) {
      if (set?.type === 'warmup') continue
      exerciseSets += 1
      exerciseVolume += setVolumeKg(set)
    }
    sets += exerciseSets
    volumeKg += exerciseVolume
    exercises.push({
      title: exercise.title || 'Exercise',
      templateId: exercise.exercise_template_id || null,
      sets: exerciseSets,
      volumeKg: Math.round(exerciseVolume * 10) / 10,
    })
  }

  return {
    id: String(workout.id),
    title: workout.title?.trim() || 'Workout',
    startTime: start,
    endTime: end,
    durationSec,
    sets,
    volumeKg: Math.round(volumeKg * 10) / 10,
    exercises,
  }
}

function mapMeasurement(row) {
  return {
    date: row.date,
    weightKg: row.weight_kg ?? null,
    leanMassKg: row.lean_mass_kg ?? null,
    fatPercent: row.fat_percent ?? null,
    waist: row.waist ?? null,
    hips: row.hips ?? null,
    chestCm: row.chest_cm ?? null,
  }
}

async function fetchAllWorkouts(apiKey, signal) {
  const first = await hevyGet(
    apiKey,
    '/workouts',
    { page: 1, pageSize: WORKOUT_PAGE_SIZE },
    signal,
  )
  const pageCount = Math.min(
    MAX_WORKOUT_PAGES,
    Math.max(1, first.page_count ?? first.pageCount ?? 1),
  )
  const workouts = [...(first.workouts ?? [])]

  for (let page = 2; page <= pageCount; page += 1) {
    const next = await hevyGet(
      apiKey,
      '/workouts',
      { page, pageSize: WORKOUT_PAGE_SIZE },
      signal,
    )
    workouts.push(...(next.workouts ?? []))
  }

  return workouts.map(mapWorkout).sort((a, b) => b.startTime.localeCompare(a.startTime))
}

async function fetchAllMeasurements(apiKey, signal) {
  const rows = []
  for (let page = 1; page <= MAX_MEASUREMENT_PAGES; page += 1) {
    const next = await hevyGet(
      apiKey,
      '/body_measurements',
      { page, pageSize: MEASUREMENT_PAGE_SIZE },
      signal,
    )
    const batch = next.body_measurements ?? []
    rows.push(...batch)
    const pageCount = next.page_count ?? next.pageCount
    if (batch.length < MEASUREMENT_PAGE_SIZE) break
    if (pageCount != null && page >= pageCount) break
  }

  return rows
    .map(mapMeasurement)
    .filter((row) => row.date)
    .sort((a, b) => a.date.localeCompare(b.date))
}

const SPORT_TIMEZONE = 'America/Vancouver'
const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

const civilDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SPORT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const zonedPartFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SPORT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

function ymdFromParts(date, formatter) {
  const parts = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }
  return `${parts.year}-${parts.month}-${parts.day}`
}

function zonedDateKey(date) {
  return ymdFromParts(date, civilDateFormatter)
}

function zonedYear(date) {
  return Number(zonedDateKey(date).slice(0, 4))
}

function utcMidnight(dateKey) {
  return new Date(`${dateKey}T00:00:00.000Z`)
}

function addCalendarDays(dateKey, days) {
  const match = CIVIL_DATE.exec(dateKey)
  if (!match) return dateKey
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days)
  return new Date(utc).toISOString().slice(0, 10)
}

function zonedParts(date) {
  const parts = {}
  for (const part of zonedPartFormatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

function tzOffsetMs(date) {
  const parts = zonedParts(date)
  const asUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return asUtc - date.getTime()
}

function zonedMidnightMs(dateKey) {
  const match = CIVIL_DATE.exec(dateKey)
  if (!match) return Number.NaN
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const guess = Date.UTC(year, month - 1, day)
  const first = guess - tzOffsetMs(new Date(guess))
  return guess - tzOffsetMs(new Date(first))
}

function isoWeekday(dateKey) {
  return utcMidnight(dateKey).getUTCDay() || 7
}

function startOfIsoWeekFromKey(dateKey) {
  return utcMidnight(addCalendarDays(dateKey, 1 - isoWeekday(dateKey)))
}

function startOfIsoWeek(date) {
  return startOfIsoWeekFromKey(zonedDateKey(date))
}

function toDateKey(value) {
  if (CIVIL_DATE.test(value)) return value
  const ms = Date.parse(value)
  if (!Number.isFinite(ms)) return null
  return zonedDateKey(new Date(ms))
}

function aggregatePeriod(workouts, fromMs, toMs) {
  let count = 0
  let durationSec = 0
  let volumeKg = 0
  let sets = 0
  for (const workout of workouts) {
    const ms = Date.parse(workout.startTime)
    if (!Number.isFinite(ms) || ms < fromMs || ms >= toMs) continue
    count += 1
    durationSec += workout.durationSec
    volumeKg += workout.volumeKg
    sets += workout.sets
  }
  return {
    workouts: count,
    durationSec,
    volumeKg: Math.round(volumeKg * 10) / 10,
    sets,
  }
}

function buildHeatmap(workouts, year) {
  const counts = new Map()
  for (const workout of workouts) {
    const key = toDateKey(workout.startTime)
    if (!key || !key.startsWith(String(year))) continue
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  const days = []
  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year + 1, 0, 1))
  for (let cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const key = cursor.toISOString().slice(0, 10)
    days.push({ date: key, count: counts.get(key) ?? 0 })
  }
  return days
}

function buildWeeklyVolume(workouts, weekCount = 12) {
  const now = new Date()
  const thisWeekKey = startOfIsoWeek(now).toISOString().slice(0, 10)
  const weeks = []

  for (let i = weekCount - 1; i >= 0; i -= 1) {
    const startKey = addCalendarDays(thisWeekKey, -i * 7)
    const endKey = addCalendarDays(startKey, 7)
    const startMs = zonedMidnightMs(startKey)
    const endMs = zonedMidnightMs(endKey)
    const period = aggregatePeriod(workouts, startMs, endMs)
    const exerciseVolume = {}
    for (const workout of workouts) {
      const ms = Date.parse(workout.startTime)
      if (!Number.isFinite(ms) || ms < startMs || ms >= endMs) continue
      for (const exercise of workout.exercises) {
        exerciseVolume[exercise.title] =
          (exerciseVolume[exercise.title] ?? 0) + exercise.volumeKg
      }
    }
    const topExercises = Object.entries(exerciseVolume)
      .map(([title, volumeKg]) => ({ title, volumeKg: Math.round(volumeKg * 10) / 10 }))
      .sort((a, b) => b.volumeKg - a.volumeKg)
      .slice(0, 5)

    weeks.push({
      weekStart: startKey,
      ...period,
      topExercises,
    })
  }

  return weeks
}

/** Server-only Hevy fetch + aggregation. Keeps the API key off the client. */
export async function fetchHevySummary(signal) {
  const apiKey = requireServerEnv('HEVY_API_KEY')
  const [workouts, bodyMeasurements] = await Promise.all([
    fetchAllWorkouts(apiKey, signal),
    fetchAllMeasurements(apiKey, signal),
  ])

  const now = new Date()
  const year = zonedYear(now)
  const yearStart = zonedMidnightMs(`${year}-01-01`)
  const weekStartKey = startOfIsoWeek(now).toISOString().slice(0, 10)
  const weekStart = zonedMidnightMs(weekStartKey)
  const weekEnd = zonedMidnightMs(addCalendarDays(weekStartKey, 7))

  // Last 4 ISO weeks including the current week; previous block is the 4 before that.
  const last4Start = zonedMidnightMs(addCalendarDays(weekStartKey, -21))
  const previous4Start = zonedMidnightMs(addCalendarDays(weekStartKey, -49))
  const previous4End = last4Start

  return {
    fetchedAt: now.toISOString(),
    year,
    signals: {
      week: aggregatePeriod(workouts, weekStart, weekEnd),
      year: aggregatePeriod(workouts, yearStart, now.getTime() + 1),
    },
    trends: {
      last4Weeks: aggregatePeriod(workouts, last4Start, weekEnd),
      previous4Weeks: aggregatePeriod(workouts, previous4Start, previous4End),
    },
    heatmap: buildHeatmap(workouts, year),
    weekly: buildWeeklyVolume(workouts, 12),
    workouts,
    bodyMeasurements,
  }
}

const loadHevySummary = withTtlCache(
  () => fetchHevySummary(),
  () => {
    loadDotEnv()
    return ttlFromEnv('HEVY_CACHE_TTL_MS', DEFAULT_CACHE_TTL_MS)
  },
)

/** Shared JSON response helper for Vite middleware and production server. */
export async function handleHevyRequest(method, pathname = '/api/hevy/summary') {
  if (method !== 'GET') {
    return {
      status: 405,
      body: { error: 'Method not allowed' },
    }
  }

  if (pathname !== '/api/hevy/summary') {
    return {
      status: 404,
      body: { error: 'Not found' },
    }
  }

  try {
    const summary = await loadHevySummary()
    return { status: 200, body: summary }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load Hevy training data'
    return {
      status: message.startsWith('Missing ') ? 503 : 502,
      body: { error: message },
    }
  }
}
