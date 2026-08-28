import type { SportRouteCoordinate, SportRouteMap } from '@/types'

function projectToSvg(points: SportRouteCoordinate[]): string {
  if (points.length < 2) return ''
  const width = 320
  const height = 140
  const padX = 16
  const padY = 14

  let minLat = points[0].lat
  let maxLat = points[0].lat
  let minLon = points[0].lon
  let maxLon = points[0].lon
  for (const point of points) {
    minLat = Math.min(minLat, point.lat)
    maxLat = Math.max(maxLat, point.lat)
    minLon = Math.min(minLon, point.lon)
    maxLon = Math.max(maxLon, point.lon)
  }

  const latSpan = Math.max(maxLat - minLat, 1e-6)
  const lonSpan = Math.max(maxLon - minLon, 1e-6)

  const projected = points.map((point) => ({
    x: padX + ((point.lon - minLon) / lonSpan) * (width - padX * 2),
    y: padY + (1 - (point.lat - minLat) / latSpan) * (height - padY * 2),
  }))

  let d = `M ${projected[0].x.toFixed(1)} ${projected[0].y.toFixed(1)}`
  for (let i = 1; i < projected.length; i += 1) {
    d += ` L ${projected[i].x.toFixed(1)} ${projected[i].y.toFixed(1)}`
  }
  return d
}

/** Project GPS points into SVG + keep raw coordinates for MapKit. */
export function garminPointsToRouteMap(
  points: SportRouteCoordinate[],
  label: string | null = null,
  garminActivityId: string | null = null,
): SportRouteMap | null {
  if (points.length < 2) return null
  return {
    path: projectToSvg(points),
    label,
    source: 'garmin',
    garminActivityId,
    coordinates: points,
  }
}

/** Build a route map from a parsed GPX track (same shape as Garmin points). */
export function gpxPointsToRouteMap(
  points: SportRouteCoordinate[],
  label: string | null = null,
): SportRouteMap | null {
  if (points.length < 2) return null
  return {
    path: projectToSvg(points),
    label,
    source: 'gpx',
    garminActivityId: null,
    coordinates: points,
  }
}
