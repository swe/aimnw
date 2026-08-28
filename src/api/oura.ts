import { proxyGet } from './client'
import type { HealthBiometricDay, TrainingActivity, TrainingSleep } from '@/types'

export type OuraWorkoutsSummary = {
  fetchedAt: string
  startDate: string
  endDate: string
  workoutCount: number
  activityCount: number
  /** Always false — Oura does not expose GPS / route geometry. */
  hasMapData: false
  activities: TrainingActivity[]
  sleep: TrainingSleep[]
  biometrics: HealthBiometricDay[]
  /** Chronological age from Oura personal_info when available. */
  chronologicalAge: number | null
  workouts: OuraRawWorkout[]
}

export type OuraRawWorkout = {
  id: string
  activity: string
  calories: number | null
  day: string
  distance: number | null
  end_datetime: string
  intensity: string
  label: string | null
  source: string
  start_datetime: string
}

export type OuraStatus = {
  configured: boolean
  hasMapData: false
  message: string
}

export function getOuraStatus(signal?: AbortSignal): Promise<OuraStatus> {
  return proxyGet<OuraStatus>('/api/oura/status', { signal })
}

export function getOuraWorkouts(signal?: AbortSignal): Promise<OuraWorkoutsSummary> {
  return proxyGet<OuraWorkoutsSummary>('/api/oura/workouts', {
    signal,
    purpose: 'load Oura workouts',
  })
}

const DEDUPE_WINDOW_MS = 20 * 60 * 1000

/**
 * Merge Oura activities into a training payload, skipping Oura rows that
 * already have a same-kind session within ~20 minutes (prefer GPX / Health).
 */
export function mergeOuraIntoTraining(
  training: { activities: TrainingActivity[] },
  ouraActivities: TrainingActivity[],
): TrainingActivity[] {
  if (!ouraActivities.length) return training.activities

  const existing = training.activities
  const merged = [...existing]

  for (const activity of ouraActivities) {
    const startMs = Date.parse(activity.startedAt)
    if (!Number.isFinite(startMs)) continue

    const duplicate = existing.some((other) => {
      if (other.kind !== activity.kind) return false
      const otherMs = Date.parse(other.startedAt)
      if (!Number.isFinite(otherMs)) return false
      return Math.abs(otherMs - startMs) <= DEDUPE_WINDOW_MS
    })
    if (duplicate) continue

    merged.push(activity)
  }

  return merged.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
}

/** Prefer Oura sleep on a given date; keep other sources for days Oura doesn't cover. */
export function mergeOuraSleep(
  existing: TrainingSleep[],
  ouraSleep: TrainingSleep[],
): TrainingSleep[] {
  if (!ouraSleep.length) return existing
  const byDate = new Map<string, TrainingSleep>()
  for (const row of existing) byDate.set(row.date, row)
  for (const row of ouraSleep) byDate.set(row.date, row)
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
}

/** Overlay Oura biometrics onto any existing rows (Oura wins per field when present). */
export function mergeOuraBiometrics(
  existing: HealthBiometricDay[],
  oura: HealthBiometricDay[],
): HealthBiometricDay[] {
  if (!oura.length) return existing
  const byDate = new Map<string, HealthBiometricDay>()
  for (const row of existing) byDate.set(row.date, { ...row })
  for (const row of oura) {
    const current = byDate.get(row.date) || {
      date: row.date,
      hrvMs: null,
      vo2Max: null,
      fitnessAge: null,
    }
    byDate.set(row.date, {
      date: row.date,
      hrvMs: row.hrvMs ?? current.hrvMs,
      vo2Max: row.vo2Max ?? current.vo2Max,
      fitnessAge: row.fitnessAge ?? current.fitnessAge,
    })
  }
  return [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date))
}
