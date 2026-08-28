import { SPORT_SESSION_OVERRIDES, type SportSessionOverride } from '@/data/sportSessionOverrides'
import type { SportHrZoneSeconds, SportWeekSession } from '@/types'

function sessionOuraExternalId(session: SportWeekSession): string | null {
  const id = session.id
  if (id.startsWith('training-oura-')) return id.slice('training-oura-'.length)
  if (id.startsWith('oura-')) return id.slice('oura-'.length)
  return null
}

function overrideMatchesSession(row: SportSessionOverride, session: SportWeekSession): boolean {
  if (session.date !== row.date || session.kind !== row.kind) return false
  if (!row.externalId) return true
  const ouraId = sessionOuraExternalId(session)
  if (ouraId) return ouraId === row.externalId
  return true
}

function overrideFor(session: SportWeekSession): SportSessionOverride | null {
  for (const row of SPORT_SESSION_OVERRIDES) {
    if (overrideMatchesSession(row, session)) return row
  }
  return null
}

function dominantHrZone(zones: SportHrZoneSeconds): 1 | 2 | 3 | 4 | 5 {
  let bestIndex = 0
  let best = zones[0]
  for (let i = 1; i < zones.length; i += 1) {
    if (zones[i] > best) {
      best = zones[i]
      bestIndex = i
    }
  }
  return (bestIndex + 1) as 1 | 2 | 3 | 4 | 5
}

function sessionFromOverride(row: SportSessionOverride): SportWeekSession | null {
  if (!row.inject || row.kind !== 'running') return null
  if (row.durationMin == null || !row.zones?.length) return null

  const zoneTotal = row.zones.reduce((sum, value) => sum + value, 0)
  const paceSecPerKm =
    row.paceSecPerKm ??
    (row.distanceKm != null && row.distanceKm > 0 && row.durationMin > 0
      ? Math.round((row.durationMin * 60) / row.distanceKm)
      : null)

  return {
    id: row.id ?? `override-${row.date}-${row.kind}`,
    kind: row.kind,
    title: row.title ?? 'Run',
    date: row.date,
    startedAt: row.startedAt ?? `${row.date}T12:00:00.000Z`,
    durationMin: row.durationMin,
    hrZone: zoneTotal > 0 ? dominantHrZone(row.zones) : null,
    detail: {
      kind: 'running',
      distanceKm: row.distanceKm ?? 0,
      paceSecPerKm,
      elevationM: row.elevationM ?? null,
      avgHr: row.avgHr ?? null,
      maxHr: row.maxHr ?? null,
      zones: row.zones,
      calories: row.calories ?? null,
      map: null,
      gpxPath: row.gpxPath,
      mapLabel: row.mapLabel ?? row.title ?? null,
    },
  }
}

/** Insert curated sessions missing from Oura / training feeds. */
export function injectSportSessionOverrides(
  sessions: SportWeekSession[],
  year: number,
): SportWeekSession[] {
  const prefix = String(year)
  const next = [...sessions]

  for (const row of SPORT_SESSION_OVERRIDES) {
    if (!row.inject || !row.date.startsWith(prefix)) continue
    if (next.some((session) => overrideMatchesSession(row, session))) continue
    const session = sessionFromOverride(row)
    if (session) next.push(session)
  }

  return next
}

/** Apply curated titles, GPX, zones, and soccer pitch heat for known sessions. */
export function applySportSessionOverrides(sessions: SportWeekSession[]): SportWeekSession[] {
  return sessions.map((session) => {
    const row = overrideFor(session)
    if (!row) return session

    const next: SportWeekSession = { ...session }
    if (row.title) next.title = row.title

    const { detail } = session

    if (detail.kind === 'soccer') {
      const patched = { ...detail }
      if (row.pitchHeat) patched.pitchHeat = row.pitchHeat
      return { ...next, detail: patched }
    }

    if (detail.kind !== 'running') return next

    const patched = { ...detail }
    if (row.gpxPath) patched.gpxPath = row.gpxPath
    if (row.mapLabel) patched.mapLabel = row.mapLabel
    if (row.distanceKm != null && !(patched.distanceKm > 0)) patched.distanceKm = row.distanceKm
    if (row.paceSecPerKm != null && patched.paceSecPerKm == null) {
      patched.paceSecPerKm = row.paceSecPerKm
    } else if (
      patched.paceSecPerKm == null &&
      row.distanceKm != null &&
      row.distanceKm > 0 &&
      session.durationMin > 0
    ) {
      patched.paceSecPerKm = Math.round((session.durationMin * 60) / row.distanceKm)
    }
    if (row.elevationM != null && patched.elevationM == null) patched.elevationM = row.elevationM

    let hrZone = session.hrZone
    const existingZones = patched.zones?.reduce((sum, value) => sum + value, 0) ?? 0
    if ((!patched.zones || existingZones <= 0) && row.zones) {
      patched.zones = row.zones
      const zoneTotal = row.zones.reduce((sum, value) => sum + value, 0)
      if (zoneTotal > 0) hrZone = dominantHrZone(row.zones)
    }

    return { ...next, hrZone, detail: patched }
  })
}
