import { median } from './metrics'
import { addDays, dateKey, weekWindow, zonedMidnightMs } from './time'
import type {
  HealthActivity,
  HealthBiometricDay,
  HealthSleep,
  HevyWorkout,
} from '@/types'

/** Windowing and classification of the raw Hevy / Oura rows the hub builds on. */

export function hevyInRange(workouts: HevyWorkout[], startMs: number, endMs: number) {
  return workouts.filter((workout) => {
    const ms = Date.parse(workout.startTime)
    return Number.isFinite(ms) && ms >= startMs && ms < endMs
  })
}

export function activitiesInRange(activities: HealthActivity[], startMs: number, endMs: number) {
  return activities.filter((activity) => {
    const ms = Date.parse(activity.started_at)
    return Number.isFinite(ms) && ms >= startMs && ms < endMs
  })
}

export function sleepInRange(sleep: HealthSleep[], startMs: number, endMs: number) {
  return sleep.filter((row) => {
    const ms = zonedMidnightMs(row.date)
    return Number.isFinite(ms) && ms >= startMs && ms < endMs
  })
}

export function biometricsInRange(rows: HealthBiometricDay[], startMs: number, endMs: number) {
  return rows.filter((row) => {
    const ms = zonedMidnightMs(row.date)
    return Number.isFinite(ms) && ms >= startMs && ms < endMs
  })
}

function biometricValue(
  row: HealthBiometricDay,
  pick: (row: HealthBiometricDay) => number | null | undefined,
  min: number,
) {
  const value = pick(row)
  if (value == null || !Number.isFinite(value) || value <= min) return null
  return value
}

/** Most recent valid daily reading on or before `throughMs`. */
export function latestBiometric(
  rows: HealthBiometricDay[],
  pick: (row: HealthBiometricDay) => number | null | undefined,
  options: { throughMs?: number; min?: number } = {},
): { date: string; value: number } | null {
  const throughMs = options.throughMs ?? Number.POSITIVE_INFINITY
  const min = options.min ?? 0
  let best: { date: string; value: number } | null = null
  for (const row of rows) {
    const value = biometricValue(row, pick, min)
    if (value == null) continue
    const ms = zonedMidnightMs(row.date)
    if (!Number.isFinite(ms) || ms >= throughMs) continue
    if (!best || row.date > best.date) best = { date: row.date, value }
  }
  return best
}

/** Median of daily readings inside `[startMs, endMs)`. */
export function medianBiometric(
  rows: HealthBiometricDay[],
  pick: (row: HealthBiometricDay) => number | null | undefined,
  startMs: number,
  endMs: number,
  min = 0,
) {
  const values = biometricsInRange(rows, startMs, endMs)
    .map((row) => biometricValue(row, pick, min))
    .filter((value): value is number => value != null)
  return median(values)
}

export function summarizeHevy(workouts: HevyWorkout[]) {
  return {
    workouts: workouts.length,
    durationSec: workouts.reduce((sum, workout) => sum + workout.durationSec, 0),
    volumeKg: Math.round(workouts.reduce((sum, workout) => sum + workout.volumeKg, 0) * 10) / 10,
    sets: workouts.reduce((sum, workout) => sum + workout.sets, 0),
  }
}

export function lastGymWeekBefore(workouts: HevyWorkout[], weekStart: string, maxLookback = 16) {
  for (let i = 1; i <= maxLookback; i += 1) {
    const start = addDays(new Date(`${weekStart}T00:00:00.000Z`), -7 * i)
      .toISOString()
      .slice(0, 10)
    const window = weekWindow(start)
    const summary = summarizeHevy(hevyInRange(workouts, window.startMs, window.endMs))
    if (summary.workouts > 0 && summary.volumeKg >= 1) {
      return { weekStart: start, weeksAgo: i, ...summary }
    }
  }
  return null
}

export function isRun(activity: HealthActivity) {
  // Avoid false positives like "trail" inside non-run activity names.
  return /\b(run|running|jog|jogging|trail\s*run)\b/i.test(activity.activity_type)
}

export function isStrengthHealth(activity: HealthActivity) {
  return /strength|weight|functional|core/i.test(activity.activity_type)
}

/** Pair each Hevy workout with a same-day Health strength session (closest start). */
export function matchGymHealth(
  workouts: HevyWorkout[],
  activities: HealthActivity[],
): Map<string, HealthActivity> {
  const pool = activities
    .filter(isStrengthHealth)
    .slice()
    .sort((a, b) => Date.parse(a.started_at) - Date.parse(b.started_at))
  const used = new Set<number>()
  const matched = new Map<string, HealthActivity>()

  const ordered = [...workouts].sort(
    (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime),
  )

  for (const workout of ordered) {
    const day = dateKey(workout.startTime)
    if (!day) continue
    const workoutMs = Date.parse(workout.startTime)
    let best: HealthActivity | null = null
    let bestDelta = Number.POSITIVE_INFINITY
    for (const activity of pool) {
      if (used.has(activity.id)) continue
      if (activity.date !== day) continue
      const delta = Math.abs(Date.parse(activity.started_at) - workoutMs)
      if (delta < bestDelta) {
        bestDelta = delta
        best = activity
      }
    }
    if (best) {
      used.add(best.id)
      matched.set(workout.id, best)
    }
  }

  return matched
}
