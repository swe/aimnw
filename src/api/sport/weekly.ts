import { pctChange } from './metrics'
import {
  buildSessionMix,
  sessionAvgHr,
  sessionCalories,
  sessionDistanceKm,
  sessionElevationM,
  sortWeeklySessions,
} from './sessions'
import { isoWeekNumber, weekRangeLabel, weekWindow, zonedMidnightMs } from './time'
import type { SportWeekSession, SportWeeklyProgress } from '@/types'

function buildWeeklyProgress(
  sessions: SportWeekSession[],
  weekStarts: string[],
): SportWeeklyProgress[] {
  return [...weekStarts].reverse().map((weekStart) => {
    const { startMs, endMs } = weekWindow(weekStart)
    const items = sessions
      .filter((session) => {
        const ms = zonedMidnightMs(session.date)
        return Number.isFinite(ms) && ms >= startMs && ms < endMs
      })
      .sort(sortWeeklySessions)

    const durationMin = items.reduce((sum, item) => sum + item.durationMin, 0)
    const distances = items.map(sessionDistanceKm).filter((value): value is number => value != null)
    const elevations = items
      .map(sessionElevationM)
      .filter((value): value is number => value != null)
    const hrs = items.map(sessionAvgHr).filter((value): value is number => value != null)
    const caloriesList = items
      .map(sessionCalories)
      .filter((value): value is number => value != null)

    return {
      weekStart,
      rangeLabel: weekRangeLabel(weekStart),
      weekNumber: isoWeekNumber(weekStart),
      sessions: items.length,
      durationDeltaPct: 0,
      durationMin,
      barFillPct: 0,
      distanceKm: distances.length
        ? Math.round(distances.reduce((sum, value) => sum + value, 0) * 10) / 10
        : null,
      elevationM: elevations.length
        ? Math.round(elevations.reduce((sum, value) => sum + value, 0))
        : null,
      avgHr: hrs.length
        ? Math.round(hrs.reduce((sum, value) => sum + value, 0) / hrs.length)
        : null,
      calories: caloriesList.length
        ? Math.round(caloriesList.reduce((sum, value) => sum + value, 0))
        : null,
      mix: buildSessionMix(items),
      items,
    }
  })
}

/**
 * Bar fill is relative to the busiest week (max hours = 100%).
 * Duration delta is hours vs the previous calendar week — independent of the bar.
 * Weeks are newest-first.
 */
function withWeeklyBarMetrics(weeks: SportWeeklyProgress[]): SportWeeklyProgress[] {
  const maxDuration = Math.max(0, ...weeks.map((week) => week.durationMin))
  return weeks.map((week, index) => {
    const previous = weeks[index + 1]
    return {
      ...week,
      barFillPct:
        maxDuration > 0 ? Math.round((week.durationMin / maxDuration) * 100) : 0,
      durationDeltaPct: previous
        ? pctChange(week.durationMin, previous.durationMin)
        : 0,
    }
  })
}

export function buildWeekly(
  sessions: SportWeekSession[],
  weekStarts: string[],
): SportWeeklyProgress[] {
  return withWeeklyBarMetrics(buildWeeklyProgress(sessions, weekStarts))
}

/**
 * Home's teaser reads the hub the page already built, so the two can never
 * disagree. Weeks are newest-first and their items are already sorted.
 */
export function pickRecentSportSessions(
  weeks: SportWeeklyProgress[],
  count = 2,
): SportWeekSession[] {
  const recent: SportWeekSession[] = []
  for (const week of weeks) {
    for (const session of week.items) {
      recent.push(session)
      if (recent.length === count) return recent
    }
  }
  return recent
}
