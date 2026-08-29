import { dateKey, zonedMidnightMs } from './time'
import { matchGymHealth } from './sources'
import { trainingToHealth, trainingToSessions } from '@/api/training'
import {
  applySportSessionOverrides,
  injectSportSessionOverrides,
} from '@/lib/sportSessionOverrides'
import type {
  HealthActivity,
  HevySummary,
  HevyWorkout,
  SportActivityKind,
  SportHrZoneSeconds,
  SportWeekSession,
  SportWeeklyMix,
  TrainingPayload,
} from '@/types'

export const ACTIVITY_KIND_LABELS: Record<SportActivityKind, string> = {
  cycling: 'Cycling',
  running: 'Running',
  swimming: 'Swimming',
  sauna: 'Sauna',
  gym: 'Gym',
  cold_plunge: 'Cold plunge',
  hiking: 'Hiking',
  soccer: 'Football / Soccer',
  bouldering: 'Bouldering',
  contrast: 'Contrast',
}

export function sessionsInRange(sessions: SportWeekSession[], startMs: number, endMs: number) {
  return sessions.filter((session) => {
    const ms = zonedMidnightMs(session.date)
    return Number.isFinite(ms) && ms >= startMs && ms < endMs
  })
}

export function sessionZones(session: SportWeekSession): SportHrZoneSeconds | null {
  const { detail } = session
  const zones =
    detail.kind === 'gym' ||
    detail.kind === 'running' ||
    detail.kind === 'cycling' ||
    detail.kind === 'swimming' ||
    detail.kind === 'hiking' ||
    detail.kind === 'soccer' ||
    detail.kind === 'bouldering'
      ? detail.zones
      : null
  if (!zones) return null
  return zones.reduce((sum, value) => sum + value, 0) > 0 ? zones : null
}

export function addZones(
  a: [number, number, number, number, number],
  b: [number, number, number, number, number],
): [number, number, number, number, number] {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2], a[3] + b[3], a[4] + b[4]]
}

export function zonesToPercents(zones: [number, number, number, number, number]) {
  const total = zones.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return [0, 0, 0, 0, 0] as [number, number, number, number, number]
  const percents = zones.map((value) => Math.round((value / total) * 100)) as [
    number,
    number,
    number,
    number,
    number,
  ]
  // Rounding can leave a gap at the top of stacked bars — fold remainder into the largest slice.
  const sum = percents.reduce((acc, value) => acc + value, 0)
  if (sum !== 100) {
    let best = 0
    for (let i = 1; i < percents.length; i += 1) {
      if (percents[i] > percents[best]) best = i
    }
    percents[best] += 100 - sum
  }
  return percents
}

export function sessionDistanceKm(session: SportWeekSession): number | null {
  const { detail } = session
  if (
    detail.kind === 'running' ||
    detail.kind === 'cycling' ||
    detail.kind === 'swimming' ||
    detail.kind === 'hiking'
  ) {
    return detail.distanceKm
  }
  return null
}

export function sessionElevationM(session: SportWeekSession): number | null {
  const { detail } = session
  if (detail.kind === 'running' || detail.kind === 'cycling') {
    return detail.elevationM
  }
  if (detail.kind === 'hiking') return detail.elevationM
  return null
}

export function sessionAvgHr(session: SportWeekSession): number | null {
  const { detail } = session
  if (
    detail.kind === 'running' ||
    detail.kind === 'cycling' ||
    detail.kind === 'swimming' ||
    detail.kind === 'hiking' ||
    detail.kind === 'soccer' ||
    detail.kind === 'bouldering' ||
    detail.kind === 'sauna' ||
    detail.kind === 'gym' ||
    detail.kind === 'contrast'
  ) {
    return detail.avgHr
  }
  return null
}

export function sessionCalories(session: SportWeekSession): number | null {
  const { detail } = session
  if (
    detail.kind === 'running' ||
    detail.kind === 'cycling' ||
    detail.kind === 'swimming' ||
    detail.kind === 'hiking' ||
    detail.kind === 'soccer' ||
    detail.kind === 'bouldering' ||
    detail.kind === 'gym'
  ) {
    return detail.calories
  }
  return null
}

export function sortWeeklySessions(a: SportWeekSession, b: SportWeekSession) {
  const byDate = b.date.localeCompare(a.date)
  if (byDate !== 0) return byDate
  return a.title.localeCompare(b.title)
}

/** Session-count mix; largest segment absorbs rounding remainder so bar = 100%. */
export function buildSessionMix(items: SportWeekSession[]): SportWeeklyMix[] {
  if (items.length === 0) return []
  const counts = new Map<SportActivityKind, number>()
  for (const item of items) {
    counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1)
  }
  const total = items.length
  const parts = [...counts.entries()]
    .map(([kind, sessions]) => ({
      kind,
      label: ACTIVITY_KIND_LABELS[kind],
      sessions,
      percent: Math.round((sessions / total) * 100),
    }))
    .sort((a, b) => b.sessions - a.sessions || a.label.localeCompare(b.label))

  const sum = parts.reduce((acc, part) => acc + part.percent, 0)
  if (parts.length && sum !== 100) {
    parts[0].percent += 100 - sum
  }
  return parts
}

export function mergeContrastSessions(items: SportWeekSession[]): SportWeekSession[] {
  const used = new Set<string>()
  const merged: SportWeekSession[] = []

  for (const item of items) {
    if (used.has(item.id)) continue

    if (item.kind === 'sauna') {
      const plunge = items.find(
        (other) =>
          other.kind === 'cold_plunge' && other.date === item.date && !used.has(other.id),
      )
      if (plunge) {
        used.add(item.id)
        used.add(plunge.id)
        const saunaHr = item.detail.kind === 'sauna' ? item.detail.avgHr : null
        const saunaMax = item.detail.kind === 'sauna' ? item.detail.maxHr : null
        const notes =
          item.detail.kind === 'sauna' && item.detail.notes
            ? item.detail.notes
            : plunge.detail.kind === 'cold_plunge'
              ? plunge.detail.notes
              : null
        merged.push({
          id: `contrast-${item.date}-${item.id}`,
          kind: 'contrast',
          title: 'Contrast',
          date: item.date,
          startedAt: item.startedAt,
          durationMin: item.durationMin + plunge.durationMin,
          hrZone: item.hrZone,
          detail: {
            kind: 'contrast',
            saunaMin: item.durationMin,
            plungeMin: plunge.durationMin,
            avgHr: saunaHr,
            maxHr: saunaMax,
            notes,
          },
        })
        continue
      }
    }

    if (item.kind === 'cold_plunge') {
      const hasSauna = items.some(
        (other) => other.kind === 'sauna' && other.date === item.date,
      )
      if (hasSauna) continue
    }

    used.add(item.id)
    merged.push(item)
  }

  return merged
}

/** Proxy PRs: new max per-exercise session volume within the year. */
export function countPersonalRecords(
  workouts: HevyWorkout[],
  year: number,
  range?: { startMs: number; endMs: number },
) {
  const chronological = [...workouts]
    .filter((workout) => dateKey(workout.startTime)?.startsWith(String(year)))
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))

  const best = new Map<string, number>()
  let total = 0
  let inRange = 0

  for (const workout of chronological) {
    const ms = Date.parse(workout.startTime)
    for (const exercise of workout.exercises) {
      const prior = best.get(exercise.title) ?? 0
      if (exercise.volumeKg <= prior) continue
      best.set(exercise.title, exercise.volumeKg)
      total += 1
      if (range && Number.isFinite(ms) && ms >= range.startMs && ms < range.endMs) {
        inRange += 1
      }
    }
  }

  return { total, inRange }
}

/** PRs earned inside a single workout (vs prior year history). */
function prsInWorkout(allWorkouts: HevyWorkout[], workout: HevyWorkout, year: number) {
  const chronological = [...allWorkouts]
    .filter((row) => dateKey(row.startTime)?.startsWith(String(year)))
    .sort((a, b) => Date.parse(a.startTime) - Date.parse(b.startTime))

  const best = new Map<string, number>()
  let prs = 0
  for (const row of chronological) {
    for (const exercise of row.exercises) {
      const prior = best.get(exercise.title) ?? 0
      if (exercise.volumeKg <= prior) continue
      best.set(exercise.title, exercise.volumeKg)
      if (row.id === workout.id) prs += 1
    }
  }
  return prs
}

export function hevyToGymSession(
  workout: HevyWorkout,
  allWorkouts: HevyWorkout[],
  year: number,
  healthMatch: HealthActivity | null,
): SportWeekSession {
  const date = dateKey(workout.startTime) ?? workout.startTime.slice(0, 10)
  const zones = healthMatch
    ? ([
        healthMatch.hr_zone_1_sec,
        healthMatch.hr_zone_2_sec,
        healthMatch.hr_zone_3_sec,
        healthMatch.hr_zone_4_sec,
        healthMatch.hr_zone_5_sec,
      ] as SportHrZoneSeconds)
    : null
  const zoneTotal = zones?.reduce((sum, value) => sum + value, 0) ?? 0

  let hrZone: 1 | 2 | 3 | 4 | 5 | null = null
  if (zones && zoneTotal > 0) {
    let bestIndex = 0
    let best = zones[0]
    for (let i = 1; i < zones.length; i += 1) {
      if (zones[i] > best) {
        best = zones[i]
        bestIndex = i
      }
    }
    hrZone = (bestIndex + 1) as 1 | 2 | 3 | 4 | 5
  }

  return {
    id: `hevy-${workout.id}`,
    kind: 'gym',
    title: workout.title,
    date,
    startedAt: workout.startTime,
    durationMin: Math.max(1, Math.round(workout.durationSec / 60)),
    hrZone,
    detail: {
      kind: 'gym',
      volumeKg: workout.volumeKg,
      sets: workout.sets,
      exerciseCount: workout.exercises.length,
      prs: prsInWorkout(allWorkouts, workout, year),
      avgHr: healthMatch?.avg_hr_bpm ?? null,
      maxHr: healthMatch?.max_hr_bpm ?? null,
      zones: zoneTotal > 0 ? zones : null,
      calories: healthMatch?.calories_burnt ?? null,
    },
  }
}

/** Every session the hub knows about for the year: Hevy gym plus Oura activities. */
export function yearHubSessions(
  hevy: HevySummary,
  training: TrainingPayload,
): SportWeekSession[] {
  const health = trainingToHealth(training)
  const activitySessions = trainingToSessions(training, hevy.year)
  const prefix = String(hevy.year)
  const yearWorkouts = hevy.workouts.filter((workout) => {
    const key = dateKey(workout.startTime) ?? workout.startTime.slice(0, 10)
    return key.startsWith(prefix)
  })
  const healthMatches = matchGymHealth(yearWorkouts, health.activities)
  const gymSessions = yearWorkouts.map((workout) =>
    hevyToGymSession(
      workout,
      hevy.workouts,
      hevy.year,
      healthMatches.get(workout.id) ?? null,
    ),
  )
  return applySportSessionOverrides(
    injectSportSessionOverrides(
      mergeContrastSessions([...gymSessions, ...activitySessions]),
      hevy.year,
    ),
  )
}
