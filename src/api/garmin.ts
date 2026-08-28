/**
 * Garmin Connect proxy — workouts, HR zones, and lazy GPS routes.
 * Session lives server-side in `.garmin-session.json` (`pnpm garmin:login`).
 */
import { proxyFailure, proxyGet } from './client'
import type { SportRouteMap, TrainingActivity } from '@/types'
import { garminPointsToRouteMap } from '@/lib/sportRouteMap'

export type GarminWorkoutsSummary = {
  fetchedAt: string
  startDate: string
  endDate: string
  activityCount: number
  activities: TrainingActivity[]
}

export type GarminRoutePoint = {
  lat: number
  lon: number
}

export type GarminActivityRoute = {
  activityId: string
  name: string | null
  sport: string
  startedAt: string
  points: GarminRoutePoint[]
}

export type GarminStatus = {
  configured: boolean
  message: string
}

export function getGarminStatus(signal?: AbortSignal): Promise<GarminStatus> {
  return proxyGet<GarminStatus>('/api/garmin/status', { signal })
}

export function getGarminWorkouts(signal?: AbortSignal): Promise<GarminWorkoutsSummary> {
  return proxyGet<GarminWorkoutsSummary>('/api/garmin/workouts', {
    signal,
    purpose: 'load Garmin workouts',
  })
}

/**
 * Fetch a single activity polyline and project it to our SVG map shape.
 * Returns null while Garmin is unconfigured or the activity has no GPS.
 */
export async function getGarminActivityMap(
  activityId: string,
  label: string | null = null,
  signal?: AbortSignal,
): Promise<SportRouteMap | null> {
  const response = await fetch(`/api/garmin/activities/${encodeURIComponent(activityId)}/route`, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  })

  if (response.status === 503 || response.status === 404) return null

  if (!response.ok) throw await proxyFailure(response)

  const route = (await response.json()) as GarminActivityRoute
  if (!route.points?.length) return null
  return garminPointsToRouteMap(route.points, label ?? route.name, route.activityId)
}
