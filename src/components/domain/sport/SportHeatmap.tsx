import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { ACTIVITY_ICONS } from './weekly/activityMeta'
import shell from './sportShell.module.css'
import styles from './SportHeatmap.module.css'
import {
  formatDurationMin,
  formatHrZone,
  formatKm,
  formatPace,
} from '@/lib/sportFormat'
import { formatCivilDate, formatZonedTime, todayKey } from '@/api/sport/time'
import { sessionCalories } from '@/api/sport/sessions'
import type { SportHeatDay, SportWeekSession } from '@/types'

type Props = {
  year: number
  days: SportHeatDay[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

function formatDayLabel(iso: string) {
  return formatCivilDate(iso, { weekday: 'short', month: 'short', day: 'numeric' })
}

function formatDayHeading(iso: string) {
  return formatCivilDate(iso, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatStartTime(iso: string | null) {
  if (!iso) return null
  return formatZonedTime(iso)
}

function sessionAvgHr(session: SportWeekSession) {
  const { detail } = session
  if (
    detail.kind === 'running' ||
    detail.kind === 'cycling' ||
    detail.kind === 'swimming' ||
    detail.kind === 'hiking' ||
    detail.kind === 'soccer' ||
    detail.kind === 'bouldering' ||
    detail.kind === 'sauna' ||
    detail.kind === 'gym' ||
    detail.kind === 'contrast'
  ) {
    return detail.avgHr
  }
  return null
}

function sessionDistanceKm(session: SportWeekSession) {
  const { detail } = session
  if (
    detail.kind === 'running' ||
    detail.kind === 'cycling' ||
    detail.kind === 'swimming' ||
    detail.kind === 'hiking'
  ) {
    return detail.distanceKm
  }
  return null
}

function sessionPace(session: SportWeekSession) {
  const { detail } = session
  if (detail.kind === 'running' && detail.paceSecPerKm != null) {
    return formatPace(detail.paceSecPerKm, ' /km')
  }
  if (detail.kind === 'swimming' && detail.paceSecPer100m != null) {
    return formatPace(detail.paceSecPer100m, ' /100m')
  }
  return null
}

function daySummaryLine(day: SportHeatDay) {
  const parts = [
    `${day.count} ${day.count === 1 ? 'activity' : 'activities'}`,
    formatDurationMin(day.durationMin),
  ]
  if (day.distanceKm != null && day.distanceKm > 0) {
    parts.push(formatKm(day.distanceKm, 1).replace('km', ' km'))
  }
  if (day.calories != null && day.calories > 0) {
    parts.push(`${day.calories} cal`)
  }
  return parts.join(' · ')
}

function HeatSessionRow({ session }: { session: SportWeekSession }) {
  const Icon = ACTIVITY_ICONS[session.kind]
  const avgHr = sessionAvgHr(session)
  const distanceKm = sessionDistanceKm(session)
  const calories = sessionCalories(session)
  const pace = sessionPace(session)
  const startTime = formatStartTime(session.startedAt)
  const duration = formatDurationMin(session.durationMin)
  const hasDistance = distanceKm != null && distanceKm > 0
  const showCalories = session.kind === 'soccer' && calories != null
  const meta = [
    avgHr != null ? <span key="hr">{avgHr} bpm</span> : null,
    startTime ? <span key="time">{startTime}</span> : null,
    session.hrZone != null ? (
      <span key="zone" className={styles.zone} data-zone={session.hrZone}>
        {formatHrZone(session.hrZone)}
      </span>
    ) : null,
  ].filter(Boolean)

  return (
    <li className={styles.session}>
      <span className={styles.sessionIcon} data-kind={session.kind} aria-hidden="true">
        <Icon size={18} strokeWidth={1.75} />
      </span>

      <div className={styles.sessionBody}>
        <strong className={styles.sessionTitle}>{session.title}</strong>
        {meta.length > 0 ? (
          <div className={styles.sessionMeta}>
            {meta.map((item, index) => (
              <span key={index} className={styles.metaBit}>
                {index > 0 ? (
                  <span className={styles.dot} aria-hidden="true">
                    ·
                  </span>
                ) : null}
                {item}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      <div className={styles.sessionMetrics}>
        {showCalories ? (
          <strong>
            {calories} cal · {duration}
          </strong>
        ) : hasDistance ? (
          <>
            <strong>
              {formatKm(distanceKm, 1).replace('km', ' km')} · {duration}
            </strong>
            {pace ? <span>{pace}</span> : null}
          </>
        ) : (
          <strong>{duration}</strong>
        )}
      </div>
    </li>
  )
}

export function SportHeatmap({ year, days }: Props) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const today = useMemo(() => todayKey(), [])

  const { cells, weeks, monthLabels } = useMemo(() => {
    if (!days.length) {
      return { cells: [], weeks: 0, monthLabels: [] as { label: string; week: number; span: number }[] }
    }

    type Cell = {
      date: string
      level: number
      count: number
      summary: string
      month: number
      week: number
      future: boolean
    }

    const first = new Date(`${days[0].date}T00:00:00.000Z`)
    const weekday = (first.getUTCDay() + 6) % 7
    const leading: Cell[] = Array.from({ length: weekday }, (_, index) => ({
      date: `pad-${index}`,
      level: -1,
      count: 0,
      summary: '',
      month: -1,
      week: Math.floor(index / 7),
      future: false,
    }))
    const body: Cell[] = days.map((day, index) => {
      const offset = leading.length + index
      return {
        date: day.date,
        level: day.level,
        count: day.count,
        summary: day.summary,
        month: Number(day.date.slice(5, 7)) - 1,
        week: Math.floor(offset / 7),
        future: day.date > today,
      }
    })
    const all = [...leading, ...body]
    const weekCount = Math.ceil(all.length / 7)
    const labels: { label: string; week: number; span: number }[] = []
    let lastMonth = -1
    for (let week = 0; week < weekCount; week += 1) {
      const sample = all[week * 7 + 3] ?? all[week * 7]
      if (!sample || sample.month < 0) continue
      if (sample.month !== lastMonth) {
        labels.push({ label: MONTHS[sample.month], week, span: 1 })
        lastMonth = sample.month
      }
    }
    labels.forEach((month, index) => {
      const next = labels[index + 1]
      month.span = Math.max(1, (next?.week ?? weekCount) - month.week)
    })
    return { cells: all, weeks: weekCount, monthLabels: labels }
  }, [days, today])

  const selected = useMemo(
    () => (selectedDate ? (days.find((day) => day.date === selectedDate) ?? null) : null),
    [days, selectedDate],
  )

  function toggleDay(date: string, future: boolean) {
    if (future) return
    setSelectedDate((current) => (current === date ? null : date))
  }

  return (
    <section className={shell.card} aria-labelledby="sport-heatmap-heading">
      <h2 id="sport-heatmap-heading" className={`ui-kicker ${shell.title}`}>
        Activity heatmap
      </h2>

      <div className={styles.frame}>
        <div className={styles.chart}>
        <div className={styles.months} style={{ gridTemplateColumns: `repeat(${weeks}, var(--heat-cell))` }}>
          {monthLabels.map((month) => (
            <span
              key={`${month.label}-${month.week}`}
              className={styles.month}
              style={{ gridColumn: `${month.week + 1} / span ${month.span}` }}
            >
              {month.label}
            </span>
          ))}
        </div>
        <div className={styles.weekdays} aria-hidden="true">
          {WEEKDAYS.map((day) => (
            <span key={day} className={day === 'Sa' || day === 'Su' ? styles.weekend : undefined}>
              {day}
            </span>
          ))}
        </div>
        <div
          className={styles.grid}
          style={{ gridTemplateColumns: `repeat(${weeks}, var(--heat-cell))` }}
          role="grid"
          aria-label={`${year} activity heatmap`}
        >
          {cells.map((day) =>
            day.level < 0 ? (
              <span key={day.date} className={styles.pad} />
            ) : day.future ? (
              <div
                key={day.date}
                className={`${styles.cell} ${styles.future}`}
                data-level={day.level}
                aria-hidden="true"
              />
            ) : (
              <button
                key={day.date}
                type="button"
                className={styles.cell}
                data-level={day.level}
                data-today={day.date === today ? 'true' : undefined}
                data-selected={selectedDate === day.date ? 'true' : undefined}
                aria-current={day.date === today ? 'date' : undefined}
                aria-pressed={selectedDate === day.date}
                aria-label={
                  day.summary
                    ? `${formatDayLabel(day.date)}${day.date === today ? ', today' : ''}. ${day.summary}. ${day.count} ${day.count === 1 ? 'session' : 'sessions'}.`
                    : `${formatDayLabel(day.date)}${day.date === today ? ', today' : ''}. No sessions logged.`
                }
                onClick={() => toggleDay(day.date, day.future)}
              />
            ),
          )}
        </div>
        </div>
      </div>

      {selected ? (
        <div className={styles.detail} aria-live="polite">
          <div className={styles.detailHeader}>
            <div className={styles.detailIntro}>
              <h3 className={styles.detailTitle}>{formatDayHeading(selected.date)}</h3>
              {selected.count > 0 ? (
                <p className={styles.detailSummary}>{daySummaryLine(selected)}</p>
              ) : (
                <p className={styles.detailSummary}>No sessions logged.</p>
              )}
            </div>
            <button
              type="button"
              className={styles.close}
              aria-label="Close day details"
              onClick={() => setSelectedDate(null)}
            >
              <X size={16} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>

          {selected.count > 0 ? (
            <ul className={styles.sessions}>
              {selected.sessions.map((session) => (
                <HeatSessionRow key={session.id} session={session} />
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
