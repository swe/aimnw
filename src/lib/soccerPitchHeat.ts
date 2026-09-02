import type { SportRouteCoordinate, SportSoccerPitchHeat, SportSoccerPitchSpot } from '@/types'

/**
 * Pitch image convention
 * ----------------------
 * x: 0 = own goal (left) → 100 = attack (right)
 * y: 0 = left wing (top of image) → 100 = right wing (bottom)
 *
 * Default role: left / center attacker.
 * Auto GPS heat is oriented so the busy region lands in the top-right
 * (attacking left) — not left defense.
 */
const FIELD_LENGTH_M = 105
const FIELD_WIDTH_M = 68

/** Prefer this quadrant for auto-generated soccer heat. */
const ATTACKING_LEFT = {
  /** Attack starts at midfield on our pitch image. */
  lengthOriginM: FIELD_LENGTH_M / 2,
  lengthSpanM: FIELD_LENGTH_M / 2,
  /** Left/center band: top half of the pitch image. */
  widthOriginM: 0,
  widthSpanM: FIELD_WIDTH_M / 2,
} as const

const GRID_COLS = 14
const GRID_ROWS = 9
const MIN_CELL_FRACTION = 0.04

function toLocalMeters(points: SportRouteCoordinate[], refLat: number, refLon: number) {
  const mPerDegLat = 111_320
  const mPerDegLon = 111_320 * Math.cos((refLat * Math.PI) / 180)
  return points.map((point) => ({
    east: (point.lon - refLon) * mPerDegLon,
    north: (point.lat - refLat) * mPerDegLat,
  }))
}

/** Rotate so principal axes align with pitch length/width. */
function alignAxes(local: { east: number; north: number }[]) {
  const n = local.length
  const meanE = local.reduce((sum, point) => sum + point.east, 0) / n
  const meanN = local.reduce((sum, point) => sum + point.north, 0) / n

  let sEE = 0
  let sNN = 0
  let sEN = 0
  for (const point of local) {
    const de = point.east - meanE
    const dn = point.north - meanN
    sEE += de * de
    sNN += dn * dn
    sEN += de * dn
  }

  const angle = 0.5 * Math.atan2(2 * sEN, sEE - sNN)
  const cos = Math.cos(-angle)
  const sin = Math.sin(-angle)

  return local.map((point) => ({
    u: point.east * cos - point.north * sin,
    v: point.east * sin + point.north * cos,
  }))
}

function bbox(points: { u: number; v: number }[]) {
  let minU = points[0].u
  let maxU = points[0].u
  let minV = points[0].v
  let maxV = points[0].v
  for (const point of points) {
    minU = Math.min(minU, point.u)
    maxU = Math.max(maxU, point.u)
    minV = Math.min(minV, point.v)
    maxV = Math.max(maxV, point.v)
  }
  return { minU, maxU, minV, maxV, spanU: maxU - minU, spanV: maxV - minV }
}

/**
 * Place a GPS span inside the preferred attacking-left band.
 * If the span is larger than that half, pin toward attack / left wing
 * instead of recentering on midfield.
 */
function originForBand(spanM: number, bandOriginM: number, bandSpanM: number, fullSpanM: number) {
  if (spanM <= bandSpanM) {
    return bandOriginM + (bandSpanM - spanM) / 2
  }
  // Prefer the left-wing edge (band starts at 0) or the attack end.
  if (bandOriginM <= 0) return 0
  return Math.max(0, fullSpanM - spanM)
}

/**
 * Map GPS onto the pitch image in the attacking-left convention.
 * Half-field sessions sit in the top-right (left wing + attack), not midfield
 * and not left defense.
 */
function pitchPercent(aligned: { u: number; v: number }[]) {
  const box = bbox(aligned)
  const uIsLength = box.spanU >= box.spanV

  const lengthSpan = uIsLength ? box.spanU : box.spanV
  const widthSpan = uIsLength ? box.spanV : box.spanU
  const lengthMin = uIsLength ? box.minU : box.minV
  const widthMin = uIsLength ? box.minV : box.minU

  const lengthOffset = originForBand(
    lengthSpan,
    ATTACKING_LEFT.lengthOriginM,
    ATTACKING_LEFT.lengthSpanM,
    FIELD_LENGTH_M,
  )
  const widthOffset = originForBand(
    widthSpan,
    ATTACKING_LEFT.widthOriginM,
    ATTACKING_LEFT.widthSpanM,
    FIELD_WIDTH_M,
  )

  const clamp = (value: number) => Math.max(0, Math.min(100, value))

  let mapped = aligned.map((point) => {
    const alongLength = uIsLength ? point.u : point.v
    const alongWidth = uIsLength ? point.v : point.u
    return {
      x: clamp(((alongLength - lengthMin + lengthOffset) / FIELD_LENGTH_M) * 100),
      y: clamp(((alongWidth - widthMin + widthOffset) / FIELD_WIDTH_M) * 100),
    }
  })

  // Dense end of the track → attacking half (top-right / left attack).
  const leftCount = mapped.filter((point) => point.x < 50).length
  if (leftCount > mapped.length - leftCount) {
    mapped = mapped.map((point) => ({ x: 100 - point.x, y: point.y }))
  }

  // Dense wing → top of image (left wing).
  const topCount = mapped.filter((point) => point.y < 50).length
  if (topCount < mapped.length - topCount) {
    mapped = mapped.map((point) => ({ x: point.x, y: 100 - point.y }))
  }

  return mapped
}

function spotsFromPitchPoints(pitch: { x: number; y: number }[]): SportSoccerPitchSpot[] {
  const grid = Array.from({ length: GRID_COLS * GRID_ROWS }, () => 0)
  for (const point of pitch) {
    const col = Math.min(GRID_COLS - 1, Math.floor((point.x / 100) * GRID_COLS))
    const row = Math.min(GRID_ROWS - 1, Math.floor((point.y / 100) * GRID_ROWS))
    grid[row * GRID_COLS + col] += 1
  }

  const peak = Math.max(...grid)
  if (peak <= 0) return []

  const cellW = 100 / GRID_COLS
  const cellH = 100 / GRID_ROWS
  const spots: SportSoccerPitchSpot[] = []

  for (let row = 0; row < GRID_ROWS; row += 1) {
    for (let col = 0; col < GRID_COLS; col += 1) {
      const count = grid[row * GRID_COLS + col]
      if (count < peak * MIN_CELL_FRACTION) continue
      const weight = count / peak
      spots.push({
        x: (col + 0.5) * cellW,
        y: (row + 0.5) * cellH,
        r: 8 + weight * 10,
        intensity: 0.15 + weight * 0.75,
      })
    }
  }

  return spots
}

/**
 * Project Garmin GPS track points onto the pitch image as occupancy blobs.
 * Oriented for left/center attack → top-right of the pitch image.
 */
export function buildPitchHeatFromPoints(
  points: SportRouteCoordinate[],
): SportSoccerPitchHeat | null {
  if (points.length < 10) return null

  const refLat = points.reduce((sum, point) => sum + point.lat, 0) / points.length
  const refLon = points.reduce((sum, point) => sum + point.lon, 0) / points.length
  const local = toLocalMeters(points, refLat, refLon)
  const aligned = alignAxes(local)
  const pitch = pitchPercent(aligned)
  const spots = spotsFromPitchPoints(pitch)
  if (!spots.length) return null

  return {
    pitchSrc: '/sport/soccer-pitch.jpg',
    spots,
  }
}
