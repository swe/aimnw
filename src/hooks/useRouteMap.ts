import { useEffect, useState } from 'react'
import { loadGarminRouteMap, peekGarminRouteMap } from '@/lib/loadGarminMap'
import { loadGpxRouteMap, peekGpxRouteMap } from '@/lib/loadGpxMap'
import type { SportRouteMap } from '@/types'

export function useGarminRouteMap(
  activityId: string | null | undefined,
  label: string | null = null,
): SportRouteMap | null {
  const [map, setMap] = useState<SportRouteMap | null>(() =>
    activityId ? peekGarminRouteMap(activityId, label) : null,
  )

  useEffect(() => {
    if (!activityId) {
      setMap(null)
      return
    }

    const warm = peekGarminRouteMap(activityId, label)
    setMap(warm)
    if (warm) return

    let cancelled = false
    loadGarminRouteMap(activityId, label)
      .then((loaded) => {
        if (!cancelled) setMap(loaded)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [activityId, label])

  return map
}

export function useGpxRouteMap(
  gpxPath: string | null | undefined,
  label: string | null = null,
): SportRouteMap | null {
  const [map, setMap] = useState<SportRouteMap | null>(() =>
    gpxPath ? peekGpxRouteMap(gpxPath) : null,
  )

  useEffect(() => {
    if (!gpxPath) {
      setMap(null)
      return
    }

    const warm = peekGpxRouteMap(gpxPath)
    setMap(warm)
    if (warm) return

    let cancelled = false
    loadGpxRouteMap(gpxPath, label)
      .then((loaded) => {
        if (!cancelled) setMap(loaded)
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [gpxPath, label])

  return map
}
