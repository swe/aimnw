import { downsampleCoordinates, parseGpxTrack } from '@/lib/gpx'
import { createOnceCache } from '@/lib/onceCache'
import { gpxPointsToRouteMap } from '@/lib/sportRouteMap'
import type { SportRouteMap } from '@/types'

const maps = createOnceCache<SportRouteMap>()

/** Already-parsed track, so a warmed route renders on first paint without a flash. */
export function peekGpxRouteMap(gpxPath: string): SportRouteMap | null {
  return maps.peek(gpxPath)
}

/** Fetch a GPX track and project it for MapKit / SVG route maps. */
export function loadGpxRouteMap(
  gpxPath: string,
  label: string | null = null,
): Promise<SportRouteMap | null> {
  return maps.get(gpxPath, async () => {
    const response = await fetch(gpxPath, {
      headers: { Accept: 'application/gpx+xml, application/xml, text/xml' },
    })
    if (!response.ok) return null

    const track = parseGpxTrack(await response.text())
    if (!track) return null

    return gpxPointsToRouteMap(downsampleCoordinates(track.coordinates), label ?? track.name)
  })
}
