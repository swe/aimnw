import { useMemo } from 'react'
import { ChartTooltipAnchor } from './ChartTooltipAnchor'
import shell from './sportShell.module.css'
import tip from './chartTooltip.module.css'
import styles from './SportLongRun.module.css'
import { isoWeekNumber, weekRangeLabel } from '@/api/sport/time'
import type { SportLongRunWeek } from '@/types'

type Props = {
  weeks: SportLongRunWeek[]
}

function labelIndices(weeks: SportLongRunWeek[]) {
  const last = weeks.length - 1
  const shown: number[] = []
  weeks.forEach((week, index) => {
    const weekNum = isoWeekNumber(week.weekStart)
    if (weekNum === 1 || weekNum % 4 === 0) shown.push(index)
  })
  if (shown.length && last - shown[shown.length - 1] < 2) {
    shown.pop()
  }
  if (last >= 0 && shown[shown.length - 1] !== last) {
    shown.push(last)
  }
  return new Set(shown)
}

function tooltipEdge(index: number, total: number): 'start' | 'mid' | 'end' {
  if (index < 6) return 'start'
  if (index > total - 7) return 'end'
  return 'mid'
}

function tickEdge(index: number, total: number): 'start' | 'mid' | 'end' {
  if (index === 0) return 'start'
  if (index === total - 1) return 'end'
  return 'mid'
}

function formatKm(km: number) {
  if (!Number.isFinite(km) || km <= 0) return '0 km'
  const rounded = Math.round(km * 10) / 10
  const label = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1)
  return `${label} km`
}

export function SportLongRun({ weeks }: Props) {
  const ticks = useMemo(() => labelIndices(weeks), [weeks])
  const { max, peak, peakWeek, totalKm } = useMemo(() => {
    let peakKm = 0
    let peakStart = ''
    let sum = 0
    for (const week of weeks) {
      sum += week.km
      if (week.km > peakKm) {
        peakKm = week.km
        peakStart = week.weekStart
      }
    }
    return {
      max: Math.max(1, peakKm),
      peak: peakKm,
      peakWeek: peakStart ? isoWeekNumber(peakStart) : null,
      totalKm: Math.round(sum * 10) / 10,
    }
  }, [weeks])

  return (
    <section className={shell.card} aria-labelledby="sport-long-run-heading">
      <h2 id="sport-long-run-heading" className={`ui-kicker ${shell.title}`}>
        Weekly long run progression
      </h2>
      <div className={styles.chart}>
        <div className={styles.scroller}>
        <div
          className={styles.strip}
          style={{ gridTemplateColumns: `repeat(${Math.max(weeks.length, 1)}, minmax(0.55rem, 1fr))` }}
        >
          {weeks.map((week, index) => {
            const empty = week.km <= 0
            const weekNum = isoWeekNumber(week.weekStart)
            const weekLabel = `Week ${weekNum}`
            const range = weekRangeLabel(week.weekStart)
            const height = empty ? 4 : Math.max((week.km / max) * 100, 8)
            const detail = empty ? 'No long run' : formatKm(week.km)
            return (
              <ChartTooltipAnchor
                key={week.weekStart}
                className={styles.col}
                edge={tooltipEdge(index, weeks.length)}
                aria-label={`${weekLabel}, ${range}. ${detail}`}
                tooltip={
                  <>
                    <span className={tip.head}>{weekLabel}</span>
                    <span className={tip.range}>{range}</span>
                    {empty ? (
                      <span className={tip.empty}>No long run</span>
                    ) : (
                      <>
                        <div className={tip.divider} aria-hidden="true" />
                        <div className={tip.rows}>
                          <div className={tip.row}>
                            <span className={tip.rowLabel}>Long run</span>
                            <span className={tip.rowValue} data-peak={week.km === peak ? 'true' : undefined}>
                              {detail}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                }
              >
                <div className={styles.barWell} aria-hidden="true">
                  <span
                    className={[
                      styles.bar,
                      empty ? styles.empty : '',
                      !empty && week.km === peak ? styles.peak : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{ height: `${height}%` }}
                  />
                </div>
              </ChartTooltipAnchor>
            )
          })}
        </div>
        <div
          className={styles.axis}
          style={{ gridTemplateColumns: `repeat(${Math.max(weeks.length, 1)}, minmax(0.55rem, 1fr))` }}
          aria-hidden="true"
        >
          {weeks.map((week, index) =>
            ticks.has(index) ? (
              <span
                key={week.weekStart}
                className={styles.tick}
                data-edge={tickEdge(index, weeks.length)}
                style={{ gridColumn: index + 1 }}
              >
                W{isoWeekNumber(week.weekStart)}
              </span>
            ) : null,
          )}
        </div>
        </div>
      </div>

      <div className={styles.statsRow}>
        <p className={styles.total} aria-label={`Year total long-run distance ${formatKm(totalKm)}`}>
          <span className={styles.statLabel} aria-hidden="true">
            Σ
          </span>
          <strong>{formatKm(totalKm)}</strong>
        </p>
        <p className={styles.peakStat}>
          {peak > 0 && peakWeek != null ? (
            <>
              <span className={styles.statLabel}>Peak</span>
              <strong>{formatKm(peak)}</strong>
              <span className={styles.peakWeek}>W{peakWeek}</span>
            </>
          ) : (
            <span className={styles.statLabel}>No long runs yet</span>
          )}
        </p>
      </div>
    </section>
  )
}
