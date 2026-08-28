import type { SportActivityKind, SportHrZoneSeconds, SportSoccerPitchHeat } from '@/types'

export type SportSessionOverride = {
  date: string
  kind: SportActivityKind
  externalId?: string
  /** Optional for non-running overrides (e.g. soccer pitch heat). */
  gpxPath?: string
  mapLabel?: string
  title?: string
  distanceKm?: number
  paceSecPerKm?: number
  elevationM?: number
  zones?: SportHrZoneSeconds
  /** Add this session when Oura / training feeds omit it. */
  inject?: boolean
  id?: string
  startedAt?: string
  durationMin?: number
  avgHr?: number
  maxHr?: number
  calories?: number
  /** Curated pitch occupancy for a football session. */
  pitchHeat?: SportSoccerPitchHeat
}

export const SPORT_SESSION_OVERRIDES: SportSessionOverride[] = [
  {
    date: '2026-04-19',
    kind: 'running',
    inject: true,
    id: 'override-vancouver-sun-run',
    startedAt: '2026-04-19T16:49:08.000Z',
    gpxPath: '/gpx/sunrun.gpx',
    mapLabel: 'Vancouver Sun Run',
    title: 'Vancouver Sun Run',
    distanceKm: 9.53,
    paceSecPerKm: 6 * 60 + 17,
    durationMin: 60,
    avgHr: 170,
    maxHr: 179,
    calories: 603,
    zones: [17 * 60, 27 * 60, 32 * 60, 17 * 60, 21 * 60],
  },
  {
    date: '2026-05-03',
    kind: 'running',
    externalId: '4ee5a189-0288-4bae-af29-6b49a72ff619',
    gpxPath: '/gpx/halfmarathon.gpx',
    mapLabel: 'Vancouver Half Marathon',
    title: 'Vancouver Half Marathon',
    distanceKm: 23.7,
    zones: [12 * 60, 6 * 60, 17 * 60, 45 * 60, 19 * 60],
  },
  {
    date: '2026-08-19',
    kind: 'soccer',
    title: 'GVBoT Corporate Cup',
    // Attack left → right. Hot: CAM / LW / CF. Cool: LCB.
    pitchHeat: {
      pitchSrc: '/sport/soccer-pitch.jpg',
      // Continuous occupancy: CAM↔LW↔CF corridor, cooler LCB, light elsewhere.
      spots: [
        // Attacking half — one connected cloud
        { x: 58, y: 48, r: 20, intensity: 0.72 },
        { x: 64, y: 36, r: 18, intensity: 0.7 },
        { x: 70, y: 24, r: 17, intensity: 0.68 },
        { x: 76, y: 32, r: 16, intensity: 0.65 },
        { x: 82, y: 44, r: 17, intensity: 0.7 },
        { x: 74, y: 48, r: 15, intensity: 0.55 },
        { x: 68, y: 52, r: 12, intensity: 0.4 },
        { x: 86, y: 52, r: 11, intensity: 0.42 },
        // Soft bridge into midfield
        { x: 48, y: 44, r: 14, intensity: 0.32 },
        { x: 52, y: 56, r: 11, intensity: 0.22 },
        // LCB — present but quieter, linked toward midfield
        { x: 24, y: 40, r: 13, intensity: 0.28 },
        { x: 32, y: 46, r: 12, intensity: 0.22 },
        { x: 38, y: 38, r: 10, intensity: 0.18 },
        // Trace elsewhere — full pitch, low
        { x: 42, y: 22, r: 9, intensity: 0.12 },
        { x: 55, y: 70, r: 10, intensity: 0.14 },
        { x: 78, y: 68, r: 9, intensity: 0.12 },
        { x: 30, y: 62, r: 9, intensity: 0.1 },
        { x: 18, y: 52, r: 8, intensity: 0.08 },
      ],
    },
  },
]
