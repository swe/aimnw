import { toneTowardGoal } from './metrics'
import type { SportGoals } from './goals'
import type { HevyBodyMeasurement, SportBodySeries } from '@/types'

const BODY_COMPOSITION_LIMIT = 50

export function leanMassKg(row: HevyBodyMeasurement) {
  if (row.leanMassKg != null) return row.leanMassKg
  if (row.weightKg != null && row.fatPercent != null) {
    return row.weightKg * (1 - row.fatPercent / 100)
  }
  return null
}

export function ffmiFromRow(row: HevyBodyMeasurement, heightM: number | null) {
  if (heightM == null || heightM <= 0) return null
  const lean = leanMassKg(row)
  if (lean == null || heightM <= 0) return null
  return Math.round((lean / (heightM * heightM)) * 10) / 10
}

export function bodyReadingDelta(
  rows: HevyBodyMeasurement[],
  pick: (row: HevyBodyMeasurement) => number | null,
) {
  const values = rows
    .map((row) => ({ date: row.date, value: pick(row) }))
    .filter((row): row is { date: string; value: number } => row.value != null)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!values.length) return null
  const latest = values[values.length - 1]
  const previous = values.length > 1 ? values[values.length - 2] : latest
  return { latest: latest.value, previous: previous.value, delta: latest.value - previous.value }
}

function bodyCompositionValues(
  rows: HevyBodyMeasurement[],
  pick: (row: HevyBodyMeasurement) => number | null,
  limit = BODY_COMPOSITION_LIMIT,
) {
  return rows
    .map((row) => ({ date: row.date, value: pick(row) }))
    .filter((row): row is { date: string; value: number } => row.value != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit)
    .map((row) => row.value)
}

function bodyCompositionTrend(
  values: number[],
  digits: number,
  goal: number | null,
  fallbackLowerIsBetter: boolean,
) {
  if (!values.length) return null
  const latest = values[values.length - 1]
  const delta = latest - values[0]
  if (Math.abs(delta) < 1 / 10 ** digits) {
    return {
      latest,
      delta: 0,
      direction: 'flat' as const,
      tone: 'flat' as const,
      kpiTone: 'flat' as const,
    }
  }
  const direction = delta > 0 ? ('up' as const) : ('down' as const)
  const kpiTone = toneTowardGoal(latest, delta, goal, fallbackLowerIsBetter)
  const tone: SportBodySeries['tone'] =
    kpiTone === 'up' ? 'good' : kpiTone === 'down' ? 'bad' : 'flat'
  return { latest, delta, direction, tone, kpiTone }
}

export function buildBodyCompositionSeries(
  measurements: HevyBodyMeasurement[],
  goals: SportGoals,
): SportBodySeries[] {
  const specs: Array<{
    id: string
    label: string
    pick: (row: HevyBodyMeasurement) => number | null
    digits: number
    suffix: string
    goal: number | null
    fallbackLowerIsBetter: boolean
  }> = [
    {
      id: 'weight',
      label: 'Weight',
      pick: (row) => row.weightKg,
      digits: 1,
      suffix: 'kg',
      goal: goals.weightKg,
      fallbackLowerIsBetter: true,
    },
    {
      id: 'fat',
      label: 'Body fat',
      pick: (row) => row.fatPercent,
      digits: 1,
      suffix: '%',
      goal: goals.bodyFatPercent,
      fallbackLowerIsBetter: true,
    },
    {
      id: 'muscle',
      label: 'Muscle mass',
      pick: leanMassKg,
      digits: 1,
      suffix: 'kg',
      goal: null,
      fallbackLowerIsBetter: false,
    },
  ]

  return specs.map((spec) => {
    const values = bodyCompositionValues(measurements, spec.pick)
    const trend = bodyCompositionTrend(
      values,
      spec.digits,
      spec.goal,
      spec.fallbackLowerIsBetter,
    )
    if (!trend) {
      return {
        id: spec.id,
        label: spec.label,
        value: '—',
        latest: null,
        delta: 0,
        direction: 'flat',
        tone: 'flat',
        kpiTone: 'flat',
        values: [],
        goalLine: spec.goal ?? undefined,
        empty: true,
      }
    }
    return {
      id: spec.id,
      label: spec.label,
      value: `${trend.latest.toFixed(spec.digits)}${spec.suffix}`,
      latest: trend.latest,
      delta: trend.delta,
      direction: trend.direction,
      tone: trend.tone,
      kpiTone: trend.kpiTone,
      values,
      goalLine: spec.goal ?? undefined,
      empty: false,
    }
  })
}
