/** Training days and weeks use Vancouver civil time, not UTC. */
export const SPORT_TIMEZONE = 'America/Vancouver'

const civilDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: SPORT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

const zonedPartFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: SPORT_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

const CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

export function isCivilDate(value: string) {
  return CIVIL_DATE.test(value)
}

export function utcMidnight(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`)
}

export function addCalendarDays(dateKey: string, days: number) {
  const match = CIVIL_DATE.exec(dateKey)
  if (!match) return dateKey
  const utc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days)
  return new Date(utc).toISOString().slice(0, 10)
}

function ymdFromParts(date: Date, formatter: Intl.DateTimeFormat) {
  const parts: Record<string, string> = {}
  for (const part of formatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }
  return `${parts.year}-${parts.month}-${parts.day}`
}

export function zonedDateKey(date: Date) {
  return ymdFromParts(date, civilDateFormatter)
}

export function zonedYear(date: Date) {
  return Number(zonedDateKey(date).slice(0, 4))
}

export function todayKey(now = new Date()) {
  return zonedDateKey(now)
}

function zonedParts(date: Date) {
  const parts: Record<string, string> = {}
  for (const part of zonedPartFormatter.formatToParts(date)) {
    if (part.type !== 'literal') parts[part.type] = part.value
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

/** Offset from UTC for this instant in the training timezone (ms). PST = -8h. */
function tzOffsetMs(date: Date) {
  const parts = zonedParts(date)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - date.getTime()
}

/** UTC timestamp of 00:00:00 on this civil date in America/Vancouver. */
export function zonedMidnightMs(dateKey: string) {
  const match = CIVIL_DATE.exec(dateKey)
  if (!match) return Number.NaN
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const guess = Date.UTC(year, month - 1, day)
  const first = guess - tzOffsetMs(new Date(guess))
  const second = guess - tzOffsetMs(new Date(first))
  return second
}

function isoWeekday(dateKey: string) {
  const date = utcMidnight(dateKey)
  return date.getUTCDay() || 7
}

export function startOfIsoWeekFromKey(dateKey: string) {
  return utcMidnight(addCalendarDays(dateKey, 1 - isoWeekday(dateKey)))
}

/** Monday of the ISO week containing this instant, as UTC midnight of that civil date. */
export function startOfIsoWeek(date: Date) {
  return startOfIsoWeekFromKey(zonedDateKey(date))
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

/** Calendar day of an instant in Vancouver. Date-only strings stay as-is. */
export function dateKey(iso: string) {
  if (isCivilDate(iso)) return iso
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  return zonedDateKey(new Date(ms))
}

export function weekWindow(weekStart: string) {
  const startMs = zonedMidnightMs(weekStart)
  return { startMs, endMs: zonedMidnightMs(addCalendarDays(weekStart, 7)) }
}

export function buildYearWeekStarts(
  year: number,
  options: { through?: 'now' | 'year-end'; now?: Date } = {},
) {
  const now = options.now ?? new Date()
  const through = options.through ?? 'now'
  let cursor = startOfIsoWeekFromKey(`${year}-01-01`)
  const end =
    through === 'year-end' || zonedYear(now) !== year
      ? startOfIsoWeekFromKey(`${year}-12-31`)
      : startOfIsoWeek(now)
  const weeks: string[] = []
  while (cursor.getTime() <= end.getTime()) {
    weeks.push(cursor.toISOString().slice(0, 10))
    cursor = addDays(cursor, 7)
  }
  return weeks
}

export function buildWeekStarts(count: number, now = new Date()) {
  const thisWeek = startOfIsoWeek(now)
  return Array.from({ length: count }, (_, index) =>
    addDays(thisWeek, -7 * (count - 1 - index)).toISOString().slice(0, 10),
  )
}

export function isoWeekNumber(weekStart: string) {
  const date = utcMidnight(weekStart)
  if (!Number.isFinite(date.getTime())) return 0
  const thursday = new Date(date)
  thursday.setUTCDate(date.getUTCDate() + 3)
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1))
  return Math.floor((thursday.getTime() - yearStart.getTime()) / 86400000 / 7) + 1
}

export function weekRangeLabel(weekStart: string) {
  const start = utcMidnight(weekStart)
  if (!Number.isFinite(start.getTime())) return weekStart
  const end = addDays(start, 6)
  const fmt = (date: Date) =>
    new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(date)
  return `${fmt(start)} – ${fmt(end)}`
}

export function formatCivilDate(
  dateKey: string,
  options: Intl.DateTimeFormatOptions,
) {
  const ms = Date.parse(`${dateKey}T12:00:00.000Z`)
  if (!Number.isFinite(ms)) return dateKey
  return new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' }).format(ms)
}

export function formatZonedTime(iso: string) {
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return null
  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: SPORT_TIMEZONE,
  }).format(ms)
}
