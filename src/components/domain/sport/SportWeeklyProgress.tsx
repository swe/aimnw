import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { WeekMixBar } from './weekly/WeekMixBar'
import { WeekSessionRow } from './weekly/WeekSessionRow'
import { ACTIVITY_LABELS, ACTIVITY_LEGEND_ORDER } from './weekly/activityMeta'
import shell from './sportShell.module.css'
import styles from './SportWeeklyProgress.module.css'
import {
  formatDurationMin,
  formatElevation,
  formatKm,
} from '@/lib/sportFormat'
import { buildWeekStarts } from '@/api/sport/time'
import type { SportWeeklyProgress as Week } from '@/types'

type Props = {
  weeks: Week[]
}

export function SportWeeklyProgress({ weeks }: Props) {
  const [openWeek, setOpenWeek] = useState<string | null>(weeks[0]?.weekStart ?? null)
  const [openSession, setOpenSession] = useState<string | null>(null)
  const currentWeekStart = buildWeekStarts(1)[0]

  function toggleWeek(weekStart: string) {
    setOpenWeek((current) => {
      const next = current === weekStart ? null : weekStart
      setOpenSession(null)
      return next
    })
  }

  return (
    <section className={shell.card} aria-labelledby="sport-weekly-mix-heading">
      <h2 id="sport-weekly-mix-heading" className={`ui-kicker ${shell.title}`}>
        Weekly mix
      </h2>
      <ul className={styles.list}>
        {weeks.map((week) => {
          const open = openWeek === week.weekStart
          const current = week.weekStart === currentWeekStart
          const empty = week.sessions === 0
          const deltaTone =
            week.durationDeltaPct > 0 ? 'up' : week.durationDeltaPct < 0 ? 'down' : 'flat'

          return (
            <li
              key={week.weekStart}
              className={[styles.row, open ? styles.open : ''].filter(Boolean).join(' ')}
            >
              <button
                type="button"
                className={styles.toggle}
                aria-expanded={open}
                onClick={() => toggleWeek(week.weekStart)}
              >
                <div className={styles.rowTop}>
                  <div className={styles.rowMeta}>
                    <strong className={styles.range}>{week.rangeLabel}</strong>
                    <span className={styles.weekCode}>W{week.weekNumber}</span>
                    {current ? <span className={styles.badge}>Current</span> : null}
                  </div>
                  <div className={styles.summary}>
                    <span className={styles.sessionsNote}>
                      {week.sessions} {week.sessions === 1 ? 'session' : 'sessions'}
                    </span>
                    {!empty ? (
                      <span className={styles.delta} data-tone={deltaTone}>
                        {week.durationDeltaPct > 0 ? '+' : week.durationDeltaPct < 0 ? '−' : ''}
                        {Math.abs(week.durationDeltaPct)}%
                      </span>
                    ) : null}
                    <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
                  </div>
                </div>
                <WeekMixBar
                  mix={week.mix}
                  durationLabel={formatDurationMin(week.durationMin)}
                  fillPercent={week.barFillPct}
                  empty={empty}
                />
              </button>

              {open ? (
                <div className={styles.details}>
                  {!empty ? (
                    <div className={styles.weekStats}>
                      {week.distanceKm != null ? <span>{formatKm(week.distanceKm)}</span> : null}
                      {week.elevationM != null ? (
                        <span>{formatElevation(week.elevationM)}</span>
                      ) : null}
                      {week.avgHr != null ? <span>{week.avgHr} bpm</span> : null}
                      {week.calories != null ? <span>{week.calories} cal</span> : null}
                    </div>
                  ) : null}

                  {empty ? (
                    <p className={styles.empty}>No sessions this week.</p>
                  ) : (
                    <ul className={styles.sessions}>
                      {week.items.map((session) => (
                        <WeekSessionRow
                          key={session.id}
                          session={session}
                          open={openSession === session.id}
                          onToggle={() =>
                            setOpenSession((current) =>
                              current === session.id ? null : session.id,
                            )
                          }
                        />
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
            </li>
          )
        })}
      </ul>

      <ul className={styles.legend} aria-label="Activity colors">
        {ACTIVITY_LEGEND_ORDER.map((kind) => (
          <li key={kind} className={styles.legendItem}>
            <i className={styles.swatch} data-kind={kind} aria-hidden="true" />
            {ACTIVITY_LABELS[kind]}
          </li>
        ))}
      </ul>
    </section>
  )
}
