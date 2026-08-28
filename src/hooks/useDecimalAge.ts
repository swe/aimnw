import { useEffect, useState } from 'react'

/** Mean Gregorian year length in milliseconds. */
const YEAR_MS = 365.2425 * 24 * 60 * 60 * 1000

/** One step at 9 decimal places ≈ 31.6ms — 50ms is enough and cheaper than 4ms. */
const TICK_MS = 50

export function formatDecimalAge(birthIso: string, nowMs = Date.now(), digits = 9): string {
  const birth = Date.parse(birthIso)
  if (!Number.isFinite(birth)) return '—'
  return ((nowMs - birth) / YEAR_MS).toFixed(digits)
}

export function useDecimalAge(birthIso: string, digits = 9): string {
  const [age, setAge] = useState(() => formatDecimalAge(birthIso, Date.now(), digits))

  useEffect(() => {
    const update = () => setAge(formatDecimalAge(birthIso, Date.now(), digits))
    update()
    const id = window.setInterval(update, TICK_MS)
    return () => window.clearInterval(id)
  }, [birthIso, digits])

  return age
}
