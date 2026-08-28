import { formatKm } from './metrics'
import {
  hevyToGymSession,
  mergeContrastSessions,
  sessionCalories,
  sessionDistanceKm,
} from './sessions'
import { matchGymHealth } from './sources'
import { dateKey } from './time'
import type { HealthActivity, HevySummary, SportHeatDay, SportWeekSession } from '@/types'

function emptyHeatDay(date: string): SportHeatDay {
  return {
    date,
    level: 0,
    count: 0,
    summary: '',
    durationMin: 0,
    distanceKm: null,
    calories: null,
    sessions: [],
  }
}

/** One level step per session; darker cells = more activities that day. */
function heatLevel(count: number) {
  return Math.min(4, Math.max(0, count))
}

function sessionSummaryLabel(session: SportWeekSession) {
  if (session.kind === 'gym') return `Gym · ${session.title}`
  const distance = sessionDistanceKm(session)
  return distance != null && distance > 0
    ? `${session.title} ${formatKm(distance)}`
    : session.title
}

function finalizeHeatDay(entry: SportHeatDay): SportHeatDay {
  const sessions = [...entry.sessions].sort((a, b) => {
    const aMs = a.startedAt ? Date.parse(a.startedAt) : 0
    const bMs = b.startedAt ? Date.parse(b.startedAt) : 0
    if (aMs !== bMs) return aMs - bMs
    return a.title.localeCompare(b.title)
  })
  const durationMin = sessions.reduce((sum, item) => sum + item.durationMin, 0)
  const distances = sessions.map(sessionDistanceKm).filter((value): value is number => value != null)
  const caloriesList = sessions
    .map(sessionCalories)
    .filter((value): value is number => value != null)
  const bits = sessions.map(sessionSummaryLabel)

  return {
    ...entry,
    sessions,
    count: sessions.length,
    level: heatLevel(sessions.length),
    durationMin,
    distanceKm: distances.length
      ? Math.round(distances.reduce((sum, value) => sum + value, 0) * 10) / 10
      : null,
    calories: caloriesList.length
      ? Math.round(caloriesList.reduce((sum, value) => sum + value, 0))
      : null,
    summary: bits.slice(0, 3).join(' · '),
  }
}

export function buildHeatmap(
  hevy: HevySummary,
  healthActivities: HealthActivity[],
  activitySessions: SportWeekSession[],
): SportHeatDay[] {
  const year = hevy.year
  const byDate = new Map<string, SportWeekSession[]>()

  const push = (date: string, session: SportWeekSession) => {
    if (!date.startsWith(String(year))) return
    const list = byDate.get(date) ?? []
    list.push(session)
    byDate.set(date, list)
  }

  const healthMatches = matchGymHealth(hevy.workouts, healthActivities)
  for (const workout of hevy.workouts) {
    const key = dateKey(workout.startTime)
    if (!key) continue
    push(
      key,
      hevyToGymSession(workout, hevy.workouts, year, healthMatches.get(workout.id) ?? null),
    )
  }

  for (const session of activitySessions) {
    push(session.date, session)
  }

  const start = new Date(Date.UTC(year, 0, 1))
  const end = new Date(Date.UTC(year + 1, 0, 1))
  const days: SportHeatDay[] = []
  for (let cursor = new Date(start); cursor < end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
    const key = cursor.toISOString().slice(0, 10)
    const sessions = mergeContrastSessions(byDate.get(key) ?? [])
    days.push(finalizeHeatDay({ ...emptyHeatDay(key), sessions }))
  }
  return days
}
