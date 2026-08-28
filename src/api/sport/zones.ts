import {
  addZones,
  sessionDistanceKm,
  sessionZones,
  sessionsInRange,
  zonesToPercents,
} from './sessions'
import { weekWindow } from './time'
import type {
  SportLongRunWeek,
  SportWeekSession,
  SportZoneWeek,
  SportZoneYearSummary,
} from '@/types'

export function buildZoneWeeks(
  sessions: SportWeekSession[],
  weekStarts: string[],
): SportZoneWeek[] {
  return weekStarts.map((weekStart) => {
    const { startMs, endMs } = weekWindow(weekStart)
    const weekSessions = sessionsInRange(sessions, startMs, endMs)
    const zones = weekSessions.reduce(
      (acc, session) => {
        const row = sessionZones(session)
        return row ? addZones(acc, row) : acc
      },
      [0, 0, 0, 0, 0] as [number, number, number, number, number],
    )
    return {
      weekStart,
      zones,
      percents: zonesToPercents(zones),
      totalSec: zones.reduce((sum, value) => sum + value, 0),
    }
  })
}

function yearZoneTotals(sessions: SportWeekSession[], year: number) {
  const prefix = String(year)
  return sessions
    .filter((session) => session.date.startsWith(prefix))
    .reduce(
      (acc, session) => {
        const row = sessionZones(session)
        return row ? addZones(acc, row) : acc
      },
      [0, 0, 0, 0, 0] as [number, number, number, number, number],
    )
}

export function buildZoneYearSummary(
  sessions: SportWeekSession[],
  year: number,
): SportZoneYearSummary {
  const previousYear = year - 1
  const currentZones = yearZoneTotals(sessions, year)
  const previousZones = yearZoneTotals(sessions, previousYear)
  const percents = zonesToPercents(currentZones)
  const previousPercents = zonesToPercents(previousZones)
  const hasPreviousYear = previousZones.reduce((sum, value) => sum + value, 0) > 0
  const deltas = percents.map((pct, index) =>
    hasPreviousYear ? pct - previousPercents[index] : 0,
  ) as [number, number, number, number, number]

  return {
    year,
    previousYear,
    percents,
    deltas,
    hasPreviousYear,
  }
}

export function buildLongRuns(
  sessions: SportWeekSession[],
  weekStarts: string[],
): SportLongRunWeek[] {
  return weekStarts.map((weekStart) => {
    const { startMs, endMs } = weekWindow(weekStart)
    const runs = sessionsInRange(sessions, startMs, endMs).filter(
      (session) => session.kind === 'running',
    )
    const km = Math.max(
      0,
      ...runs.map((session) => sessionDistanceKm(session) ?? 0),
    )
    return {
      weekStart,
      km: Math.round(km * 10) / 10,
    }
  })
}
