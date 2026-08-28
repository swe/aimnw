/** Deltas, tones, and the number formatting the hub's own labels use. */

export function avg(values: number[]) {
  if (!values.length) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function median(values: number[]) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function pctChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100
  return Math.round(((current - previous) / previous) * 1000) / 10
}

export function directionOf(delta: number): 'up' | 'down' | 'flat' {
  if (!Number.isFinite(delta) || delta === 0) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

export function deltaTone(delta: number, lowerIsBetter = false) {
  if (delta === 0) return 'flat' as const
  const positive = delta > 0
  if (lowerIsBetter) return positive ? ('down' as const) : ('up' as const)
  return positive ? ('up' as const) : ('down' as const)
}

/**
 * Green when the change closes the gap to `goal`, red when it widens it.
 * Below target: up is good. Above target: down is good. At target: any move is bad.
 */
export function toneTowardGoal(
  current: number | null | undefined,
  delta: number,
  goal: number | null | undefined,
  fallbackLowerIsBetter = false,
) {
  if (!Number.isFinite(delta) || delta === 0) return 'flat' as const
  if (current == null || goal == null || !Number.isFinite(current) || !Number.isFinite(goal)) {
    return deltaTone(delta, fallbackLowerIsBetter)
  }
  const error = current - goal
  if (error === 0) return 'down' as const
  return error * delta < 0 ? ('up' as const) : ('down' as const)
}

/** Absolute magnitude only — direction is shown via icon + color. */
export function formatMagnitude(delta: number, digits = 0) {
  if (!Number.isFinite(delta) || Math.abs(delta) < 1 / 10 ** Math.max(digits, 0) / 2) return '0'
  const abs = Math.abs(delta)
  return digits > 0 ? abs.toFixed(digits) : Math.round(abs).toLocaleString()
}

/** Coarser than the shared formatter: whole kilometres once past 10. */
export function formatKm(km: number) {
  if (!Number.isFinite(km) || km <= 0) return '0km'
  return `${km >= 10 ? km.toFixed(0) : km.toFixed(1)}km`
}

export function formatElev(meters: number) {
  if (!Number.isFinite(meters) || meters <= 0) return '0m'
  return `${Math.round(meters)}m`
}

export function formatStrengthVolumeKg(kg: number) {
  if (!Number.isFinite(kg) || kg <= 0) return { value: '—' as const, unit: undefined }
  if (kg >= 1000) {
    return {
      value: (kg / 1000).toFixed(kg >= 10000 ? 0 : 1),
      unit: 't' as const,
    }
  }
  return { value: Math.round(kg).toLocaleString(), unit: 'kg' as const }
}

export function formatTrendVolumeKg(kg: number) {
  const formatted = formatStrengthVolumeKg(kg)
  if (formatted.value === '—') return '—'
  return formatted.unit ? `${formatted.value} ${formatted.unit}` : formatted.value
}
