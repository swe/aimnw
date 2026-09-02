import { useEffect, useState } from 'react'
import { loadGarminRouteMap, peekGarminRouteMap } from '@/lib/loadGarminMap'
import { buildPitchHeatFromPoints } from '@/lib/soccerPitchHeat'
import { createOnceCache } from '@/lib/onceCache'
import type { SportSoccerPitchHeat } from '@/types'

const pitchHeatCache = createOnceCache<SportSoccerPitchHeat>()

function pitchHeatFromGarminId(garminId: string): Promise<SportSoccerPitchHeat | null> {
  return pitchHeatCache.get(garminId, async () => {
    const warm = peekGarminRouteMap(garminId)
    const map = warm ?? (await loadGarminRouteMap(garminId))
    if (!map?.coordinates?.length) return null
    return buildPitchHeatFromPoints(map.coordinates)
  })
}

/** Build pitch occupancy from a Garmin soccer track when no manual override exists. */
export function useSoccerPitchHeat(garminId: string | null | undefined): SportSoccerPitchHeat | null {
  const [heat, setHeat] = useState<SportSoccerPitchHeat | null>(() =>
    garminId ? pitchHeatCache.peek(garminId) : null,
  )

  useEffect(() => {
    if (!garminId) {
      setHeat(null)
      return
    }

    const warm = pitchHeatCache.peek(garminId)
    setHeat(warm)
    if (warm) return

    let cancelled = false
    pitchHeatFromGarminId(garminId)
      .then((loaded) => {
        if (!cancelled) setHeat(loaded)
      })
      .catch(() => {
        if (!cancelled) setHeat(null)
      })

    return () => {
      cancelled = true
    }
  }, [garminId])

  return heat
}
