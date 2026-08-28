export function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.round((seconds % 3600) / 60)
  if (hours <= 0) return `${minutes}m`
  if (minutes <= 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

export function formatVolume(kg: number) {
  if (!Number.isFinite(kg) || kg <= 0) return '0 kg'
  if (kg >= 1000) return `${(kg / 1000).toFixed(kg >= 10000 ? 0 : 1)} t`
  return `${Math.round(kg).toLocaleString()} kg`
}

export function formatNumber(value: number) {
  return Math.round(value).toLocaleString()
}

export function formatDelta(current: number, previous: number) {
  const delta = current - previous
  if (!Number.isFinite(delta) || delta === 0) return { label: '0', tone: 'flat' as const }
  const sign = delta > 0 ? '+' : '−'
  return {
    label: `${sign}${Math.abs(Math.round(delta)).toLocaleString()}`,
    tone: delta > 0 ? ('up' as const) : ('down' as const),
  }
}

export function formatPercentDelta(current: number, previous: number) {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return { label: '—', tone: 'flat' as const }
  }
  if (previous === 0) {
    if (current === 0) return { label: '0%', tone: 'flat' as const }
    return { label: '+100%', tone: 'up' as const }
  }
  const pct = Math.round(((current - previous) / previous) * 100)
  if (pct === 0) return { label: '0%', tone: 'flat' as const }
  const sign = pct > 0 ? '+' : '−'
  return {
    label: `${sign}${Math.abs(pct)}%`,
    tone: pct > 0 ? ('up' as const) : ('down' as const),
  }
}

export function formatWeekLabel(weekStart: string) {
  const ms = Date.parse(`${weekStart}T12:00:00.000Z`)
  if (!Number.isFinite(ms)) return weekStart
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(ms)
}

export function formatShortDate(iso: string) {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return iso
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(ms)
}

export function formatSleepHours(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins}m`
}

export function activityLabel(type: string) {
  return type.replaceAll('_', ' ')
}

export function formatDurationMin(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0m'
  return formatDuration(minutes * 60)
}

export function formatKm(km: number, digits = 1) {
  if (!Number.isFinite(km) || km <= 0) return '0km'
  const rounded = digits === 0 ? Math.round(km) : Math.round(km * 10 ** digits) / 10 ** digits
  return `${rounded}km`
}

export function formatElevation(meters: number) {
  if (!Number.isFinite(meters) || meters <= 0) return '0m'
  return `${Math.round(meters)}m ↑`
}

export function formatPace(secPerUnit: number, unitLabel = '/km') {
  if (!Number.isFinite(secPerUnit) || secPerUnit <= 0) return '—'
  const mins = Math.floor(secPerUnit / 60)
  const secs = Math.round(secPerUnit % 60)
  return `${mins}:${String(secs).padStart(2, '0')}${unitLabel}`
}

export function formatHrZone(zone: 1 | 2 | 3 | 4 | 5 | null) {
  if (zone == null) return null
  return `Z${zone}`
}
