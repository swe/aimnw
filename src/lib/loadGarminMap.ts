import { getGarminActivityMap } from '@/api/garmin'
import { createOnceCache } from '@/lib/onceCache'
import type { SportRouteMap } from '@/types'

const maps = createOnceCache<SportRouteMap>()

function cacheKey(activityId: string, label: string | null) {
  return `${activityId}::${label ?? ''}`
}

/** Already-fetched Garmin track, so a warmed route renders without a flash. */
export function peekGarminRouteMap(activityId: string, label: string | null = null): SportRouteMap | null {
  return maps.peek(cacheKey(activityId, label))
}

/** Fetch a Garmin activity polyline once its session detail is on screen. */
export function loadGarminRouteMap(
  activityId: string,
  label: string | null = null,
  signal?: AbortSignal,
): Promise<SportRouteMap | null> {
  return maps.get(cacheKey(activityId, label), () => getGarminActivityMap(activityId, label, signal))
}
