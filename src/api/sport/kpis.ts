import { bodyReadingDelta, ffmiFromRow } from './body'
import {
  deltaTone,
  directionOf,
  formatMagnitude,
  formatStrengthVolumeKg,
  pctChange,
  toneTowardGoal,
} from './metrics'
import { countPersonalRecords } from './sessions'
import {
  hevyInRange,
  lastGymWeekBefore,
  latestBiometric,
  medianBiometric,
  sleepInRange,
  summarizeHevy,
} from './sources'
import { addCalendarDays, weekWindow, zonedMidnightMs } from './time'
import type { SportGoals } from './goals'
import type {
  HealthBiometricDay,
  HealthSleep,
  HevySummary,
  SportBodySeries,
  SportKpiTile,
} from '@/types'

const KPI_SPARK_DAYS = 30

function kpiTile(input: {
  id: string
  label: string
  value: string
  unit?: string
  goal?: string
  goalLabel?: string
  goalPrefix?: string
  delta: string
  deltaUnit?: string
  direction: 'up' | 'down' | 'flat'
  tone: 'up' | 'down' | 'flat'
  valueStatus?: 'good' | 'bad' | 'neutral'
  asOf?: string
  showDelta?: boolean
  hint?: string
  accent: SportKpiTile['accent']
  sparkline?: number[]
  goalLine?: number
  badge?: string
  caption?: string
  emptyMessage?: string
}): SportKpiTile {
  return {
    showDelta: true,
    ...input,
  }
}

function daysAgoMs(days: number, now = new Date()) {
  return now.getTime() - days * 24 * 60 * 60 * 1000
}

function bioSparkline(
  biometrics: HealthBiometricDay[],
  pick: (row: HealthBiometricDay) => number | null | undefined,
  days = KPI_SPARK_DAYS,
  now = new Date(),
) {
  const cutoff = daysAgoMs(days, now)
  return biometrics
    .filter((row) => {
      const value = pick(row)
      if (value == null || !Number.isFinite(value)) return false
      const ms = zonedMidnightMs(row.date)
      return Number.isFinite(ms) && ms >= cutoff
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((row) => pick(row) as number)
}

/** Sparse metrics (e.g. VO₂) — last N readings, not a rolling day window. */
function sparseBioSparkline(
  biometrics: HealthBiometricDay[],
  pick: (row: HealthBiometricDay) => number | null | undefined,
  limit = 12,
) {
  return biometrics
    .map((row) => ({ date: row.date, value: pick(row) }))
    .filter((row): row is { date: string; value: number } => row.value != null && Number.isFinite(row.value))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit)
    .map((row) => row.value)
}

const SLEEP_SPARK_NIGHTS = 7

function sleepSparkline(sleep: HealthSleep[]) {
  return sleep
    .filter((row) => Number.isFinite(row.total_sleep_min) && row.total_sleep_min > 0)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-SLEEP_SPARK_NIGHTS)
    .map((row) => Math.round((row.total_sleep_min / 60) * 10) / 10)
}

function average(values: number[]) {
  if (!values.length) return null
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

function weeklyLoadEmptyMessage(
  volumeKg: number,
  priorGym: ReturnType<typeof lastGymWeekBefore>,
) {
  if (volumeKg > 0) return undefined
  if (priorGym == null) return 'No gym volume logged yet.'
  if (priorGym.weeksAgo === 1) return 'No gym volume this week.'
  return `No gym volume this week. Last gym week was ${priorGym.weeksAgo} weeks ago.`
}

/** Latest VO₂ reading on or before `throughMs` (defaults to all history). */
function latestVo2Snapshot(biometrics: HealthBiometricDay[], throughMs = Number.POSITIVE_INFINITY) {
  return (
    biometrics
      .filter((row) => {
        if (row.vo2Max == null || !Number.isFinite(row.vo2Max)) return false
        const ms = Date.parse(`${row.date}T00:00:00.000Z`)
        return Number.isFinite(ms) && ms < throughMs
      })
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  )
}

function previousVo2Snapshot(biometrics: HealthBiometricDay[], beforeDate: string) {
  return (
    biometrics
      .filter(
        (row) =>
          row.vo2Max != null &&
          Number.isFinite(row.vo2Max) &&
          row.date < beforeDate,
      )
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  )
}

export function buildKpis(
  hevy: HevySummary,
  sleep: HealthSleep[],
  biometrics: HealthBiometricDay[],
  weekStart: string,
  goals: SportGoals,
  heightM: number | null,
  chronologicalAge: number | null,
  bodySeries: SportBodySeries[],
): SportKpiTile[] {
  const current = weekWindow(weekStart)
  const previous = weekWindow(addCalendarDays(weekStart, -7))

  const curWorkouts = hevyInRange(hevy.workouts, current.startMs, current.endMs)
  const curHevy = summarizeHevy(curWorkouts)
  const priorGym = lastGymWeekBefore(hevy.workouts, weekStart)
  const loadDeltaPct =
    priorGym && priorGym.volumeKg >= 1
      ? pctChange(curHevy.volumeKg, priorGym.volumeKg)
      : null
  const sessionDelta =
    priorGym != null ? curHevy.workouts - priorGym.workouts : null

  const curSleep = sleepInRange(sleep, current.startMs, current.endMs)
  const prevSleep = sleepInRange(sleep, previous.startMs, previous.endMs)

  const fitnessThis = latestBiometric(biometrics, (row) => row.fitnessAge, {
    throughMs: current.endMs,
  })?.value ?? null
  const hrvThis = latestBiometric(biometrics, (row) => row.hrvMs, {
    throughMs: current.endMs,
  })?.value ?? null
  const hrvPrev = medianBiometric(
    biometrics,
    (row) => row.hrvMs,
    previous.startMs,
    previous.endMs,
  )

  const latestVo2 = latestVo2Snapshot(biometrics, current.endMs)
  const priorVo2 = latestVo2 ? previousVo2Snapshot(biometrics, latestVo2.date) : null
  const vo2This = latestVo2?.vo2Max ?? null
  const vo2Prev = priorVo2?.vo2Max ?? null

  const sleepThisHours =
    curSleep.length > 0
      ? curSleep.reduce((sum, row) => sum + row.total_sleep_min, 0) / curSleep.length / 60
      : null
  const sleepPrevHours =
    prevSleep.length > 0
      ? prevSleep.reduce((sum, row) => sum + row.total_sleep_min, 0) / prevSleep.length / 60
      : null

  const weightSeries = bodySeries.find((row) => row.id === 'weight')
  const bodyFatSeries = bodySeries.find((row) => row.id === 'fat')
  const ffmi = bodyReadingDelta(hevy.bodyMeasurements, (row) => ffmiFromRow(row, heightM))
  const prs = countPersonalRecords(hevy.workouts, hevy.year, current)

  const fitnessRounded = fitnessThis != null ? Math.round(fitnessThis) : null
  const fitnessAgeGap =
    fitnessRounded != null && chronologicalAge != null
      ? chronologicalAge - fitnessRounded
      : null

  const hrvDelta = hrvThis != null && hrvPrev != null ? hrvThis - hrvPrev : 0
  const vo2Delta = vo2This != null && vo2Prev != null ? vo2This - vo2Prev : 0
  const sleepDelta =
    sleepThisHours != null && sleepPrevHours != null ? sleepThisHours - sleepPrevHours : 0
  const loadVolume = formatStrengthVolumeKg(curHevy.volumeKg)
  const sleepSpark = sleepSparkline(sleep)
  const sleepAvgLine = average(sleepSpark)

  return [
    // Row 1 — tiles with sparklines
    kpiTile({
      id: 'hrv',
      label: 'HRV',
      value: hrvThis != null ? String(Math.round(hrvThis)) : '—',
      unit: hrvThis != null ? 'ms' : undefined,
      goal: String(goals.hrvMs),
      goalPrefix: '≥',
      delta: formatMagnitude(hrvDelta),
      deltaUnit: hrvThis != null ? 'ms' : undefined,
      direction: directionOf(hrvDelta),
      tone: toneTowardGoal(hrvThis, hrvDelta, goals.hrvMs),
      accent: 'hrv',
      sparkline: bioSparkline(biometrics, (row) => row.hrvMs),
      goalLine: goals.hrvMs,
      showDelta: hrvPrev != null,
      hint:
        'Latest morning HRV. Delta is versus last week’s median. Below the target, up is good; above it, down is good.',
    }),
    kpiTile({
      id: 'avg_sleep',
      label: 'Avg Sleep',
      value: sleepThisHours != null ? sleepThisHours.toFixed(1) : '—',
      unit: sleepThisHours != null ? 'h' : undefined,
      delta: formatMagnitude(sleepDelta, 1),
      deltaUnit: sleepThisHours != null ? 'h' : undefined,
      direction: directionOf(sleepDelta),
      tone: deltaTone(sleepDelta),
      accent: 'sleep',
      sparkline: sleepSpark,
      goalLine: sleepAvgLine ?? undefined,
      showDelta: sleepPrevHours != null,
      hint:
        "This week's average duration. The chart is the last 7 nights; the dashed line is their average.",
    }),
    kpiTile({
      id: 'vo2_max',
      label: 'VO₂ max',
      value: vo2This != null ? vo2This.toFixed(1) : '—',
      goal: String(goals.vo2Max),
      delta: formatMagnitude(vo2Delta, 1),
      direction: directionOf(vo2Delta),
      tone: toneTowardGoal(vo2This, vo2Delta, goals.vo2Max),
      accent: 'vo2',
      sparkline: sparseBioSparkline(biometrics, (row) => row.vo2Max),
      goalLine: goals.vo2Max,
      showDelta: priorVo2 != null,
      hint:
        'Latest Oura VO₂ max estimate. Trend compares to the prior reading.',
    }),
    kpiTile({
      id: 'weight',
      label: 'Weight',
      value: weightSeries?.latest != null ? weightSeries.latest.toFixed(1) : '—',
      unit: weightSeries?.latest != null ? 'kg' : undefined,
      goal: String(goals.weightKg),
      delta: weightSeries ? formatMagnitude(weightSeries.delta, 1) : '0',
      deltaUnit: weightSeries?.latest != null ? 'kg' : undefined,
      direction: weightSeries?.direction ?? 'flat',
      tone: weightSeries?.kpiTone ?? 'flat',
      accent: 'weight',
      sparkline: weightSeries?.values,
      goalLine: goals.weightKg,
      showDelta: weightSeries != null && weightSeries.delta !== 0,
    }),
    kpiTile({
      id: 'body_fat',
      label: 'Body Fat',
      value: bodyFatSeries?.latest != null ? bodyFatSeries.latest.toFixed(1) : '—',
      unit: bodyFatSeries?.latest != null ? '%' : undefined,
      goal: goals.bodyFatPercent.toFixed(1),
      delta: bodyFatSeries ? formatMagnitude(bodyFatSeries.delta, 1) : '0',
      deltaUnit: bodyFatSeries?.latest != null ? '%' : undefined,
      direction: bodyFatSeries?.direction ?? 'flat',
      tone: bodyFatSeries?.kpiTone ?? 'flat',
      accent: 'bodyFat',
      sparkline: bodyFatSeries?.values,
      goalLine: goals.bodyFatPercent,
      showDelta: bodyFatSeries != null && bodyFatSeries.delta !== 0,
      hint:
        'Estimated body fat (%). Below the target, down is good; above it, up is bad.',
    }),
    // Row 2 — tiles without sparklines, plus weekly load
    kpiTile({
      id: 'fitness_age',
      label: 'Cardio Age',
      value: fitnessRounded != null ? String(fitnessRounded) : '—',
      unit: fitnessRounded != null ? 'yrs' : undefined,
      delta: fitnessAgeGap != null ? formatMagnitude(Math.abs(fitnessAgeGap)) : '0',
      deltaUnit: fitnessRounded != null ? 'yrs' : undefined,
      direction:
        fitnessAgeGap != null && fitnessAgeGap !== 0
          ? fitnessAgeGap > 0
            ? 'down'
            : 'up'
          : 'flat',
      tone:
        fitnessAgeGap != null && fitnessAgeGap !== 0
          ? fitnessAgeGap > 0
            ? 'up'
            : 'down'
          : 'flat',
      accent: 'cardio',
      showDelta: fitnessAgeGap != null && fitnessAgeGap !== 0,
      hint:
        'Latest Oura cardiovascular age vs your chronological age. Trend shows years below or above calendar age.',
    }),
    kpiTile({
      id: 'ffmi',
      label: 'FFMI',
      value: ffmi ? ffmi.latest.toFixed(1) : '—',
      delta: ffmi ? formatMagnitude(ffmi.delta, 1) : '0',
      direction: ffmi ? directionOf(ffmi.delta) : 'flat',
      tone: ffmi ? toneTowardGoal(ffmi.latest, ffmi.delta, goals.ffmi) : 'flat',
      accent: 'ffmi',
      showDelta: ffmi != null && ffmi.delta !== 0,
      hint: 'Fat-free mass index from Hevy body composition.',
    }),
    kpiTile({
      id: 'gym_sessions',
      label: 'Gym Sessions',
      value: String(curHevy.workouts),
      delta: sessionDelta != null ? formatMagnitude(sessionDelta) : '0',
      direction: sessionDelta != null ? directionOf(sessionDelta) : 'flat',
      tone: sessionDelta != null ? deltaTone(sessionDelta) : 'flat',
      accent: 'gym',
      showDelta: sessionDelta != null,
    }),
    kpiTile({
      id: 'personal_records',
      label: 'PRs',
      value: String(prs.total),
      delta: prs.inRange > 0 ? `+${formatMagnitude(prs.inRange)}` : '0',
      direction: 'up',
      tone: 'up',
      accent: 'trophy',
      showDelta: prs.inRange > 0,
      hint: 'Personal records logged in Hevy this year. The arrow is new PRs this week.',
    }),
    kpiTile({
      id: 'weekly_load',
      label: 'Weekly Load',
      value: loadVolume.value,
      unit: loadVolume.unit,
      delta: loadDeltaPct != null ? `${formatMagnitude(loadDeltaPct)}%` : '0',
      direction: loadDeltaPct != null ? directionOf(loadDeltaPct) : 'flat',
      tone: loadDeltaPct != null ? deltaTone(loadDeltaPct) : 'flat',
      accent: 'load',
      emptyMessage: weeklyLoadEmptyMessage(curHevy.volumeKg, priorGym),
      showDelta: false,
      hint:
        priorGym == null
          ? 'Hevy gym volume this week. No earlier gym week to compare.'
          : priorGym.weeksAgo === 1
            ? 'Hevy gym volume this week versus last week.'
            : `Hevy gym volume this week versus the last gym week (${priorGym.weeksAgo} weeks ago).`,
    }),
  ]
}
