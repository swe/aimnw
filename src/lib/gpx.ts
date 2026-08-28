import type { SportRouteCoordinate } from '@/types'

export type ParsedGpxTrack = {
  name: string | null
  coordinates: SportRouteCoordinate[]
  /** Cumulative distance in meters (haversine). */
  distanceM: number
  elevationGainM: number
  startedAt: string | null
  endedAt: string | null
  /** Overall average speed (distance / elapsed), km/h. */
  avgSpeedKmH: number | null
  /** Moving average (ignores near-stationary gaps), km/h. */
  movingSpeedKmH: number | null
}

function haversineM(a: SportRouteCoordinate, b: SportRouteCoordinate) {
  const r = 6371000
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Minimal GPX 1.1 track parser (trkpt lat/lon + optional ele/time). */
export function parseGpxTrack(xml: string): ParsedGpxTrack | null {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  if (doc.querySelector('parsererror')) return null

  const name =
    doc.querySelector('trk > name')?.textContent?.trim() ||
    doc.querySelector('metadata > name')?.textContent?.trim() ||
    null

  const points = [...doc.querySelectorAll('trkpt')]
  if (points.length < 2) return null

  const coordinates: SportRouteCoordinate[] = []
  const elevations: number[] = []
  const timesMs: (number | null)[] = []
  let startedAt: string | null = null
  let endedAt: string | null = null

  for (const point of points) {
    const lat = Number(point.getAttribute('lat'))
    const lon = Number(point.getAttribute('lon'))
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    coordinates.push({ lat, lon })
    const ele = Number(point.querySelector('ele')?.textContent)
    elevations.push(Number.isFinite(ele) ? ele : Number.NaN)
    const time = point.querySelector('time')?.textContent?.trim() ?? null
    const ms = time ? Date.parse(time) : Number.NaN
    timesMs.push(Number.isFinite(ms) ? ms : null)
    if (time) {
      if (!startedAt) startedAt = time
      endedAt = time
    }
  }

  if (coordinates.length < 2) return null

  let distanceM = 0
  let elevationGainM = 0
  let movingDistanceM = 0
  let movingTimeSec = 0

  for (let i = 1; i < coordinates.length; i += 1) {
    const segM = haversineM(coordinates[i - 1], coordinates[i])
    distanceM += segM
    const prevEle = elevations[i - 1]
    const nextEle = elevations[i]
    if (Number.isFinite(prevEle) && Number.isFinite(nextEle) && nextEle > prevEle) {
      elevationGainM += nextEle - prevEle
    }

    const t0 = timesMs[i - 1]
    const t1 = timesMs[i]
    if (t0 != null && t1 != null && t1 > t0) {
      const dtSec = (t1 - t0) / 1000
      const speedMs = segM / dtSec
      // Treat < 0.2 m/s (~0.7 km/h) as paused / GPS jitter.
      if (speedMs >= 0.2) {
        movingDistanceM += segM
        movingTimeSec += dtSec
      }
    }
  }

  const elapsedSec =
    startedAt && endedAt
      ? Math.max(0, (Date.parse(endedAt) - Date.parse(startedAt)) / 1000)
      : 0

  const avgSpeedKmH =
    elapsedSec > 0 && distanceM > 0
      ? Math.round(((distanceM / elapsedSec) * 3.6) * 10) / 10
      : null
  const movingSpeedKmH =
    movingTimeSec > 0 && movingDistanceM > 0
      ? Math.round(((movingDistanceM / movingTimeSec) * 3.6) * 10) / 10
      : null

  return {
    name,
    coordinates,
    distanceM,
    elevationGainM,
    startedAt,
    endedAt,
    avgSpeedKmH,
    movingSpeedKmH,
  }
}

/** Keep map overlays snappy while preserving shape. */
export function downsampleCoordinates(
  points: SportRouteCoordinate[],
  maxPoints = 240,
): SportRouteCoordinate[] {
  if (points.length <= maxPoints) return points
  const out: SportRouteCoordinate[] = []
  const step = (points.length - 1) / (maxPoints - 1)
  for (let i = 0; i < maxPoints; i += 1) {
    out.push(points[Math.round(i * step)])
  }
  return out
}
