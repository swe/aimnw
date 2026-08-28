import { useMemo } from 'react'
import { ChartTooltipAnchor } from './ChartTooltipAnchor'
import shell from './sportShell.module.css'
import hr from './hrZones.module.css'
import tip from './chartTooltip.module.css'
import styles from './SportHrZones.module.css'
import { isoWeekNumber, weekRangeLabel } from '@/api/sport/time'
import type { SportZoneWeek, SportZoneYearSummary } from '@/types'

const ZONES = [
  { id: 1, short: 'Z1' },
  { id: 2, short: 'Z2' },
  { id: 3, short: 'Z3' },
  { id: 4, short: 'Z4' },
  { id: 5, short: 'Z5' },
] as const

type Props = {
  weeks: SportZoneWeek[]
  yearSummary: SportZoneYearSummary
}

function zonePercent(pct: number) {
  if (!Number.isFinite(pct) || pct <= 0) return '0%'
  return `${Math.round(pct)}%`
}

function labelIndices(weeks: SportZoneWeek[]) {
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

export function SportHrZones({ weeks, yearSummary }: Props) {
  const ticks = useMemo(() => labelIndices(weeks), [weeks])

  return (
    <section className={shell.card} aria-labelledby="sport-zone-heading">
      <h2 id="sport-zone-heading" className={`ui-kicker ${shell.title}`}>
        Weekly HR zone distribution
      </h2>

      <div className={styles.chart}>
        <div className={styles.scroller}>
        <div
          className={styles.strip}
          style={{ gridTemplateColumns: `repeat(${Math.max(weeks.length, 1)}, minmax(0.55rem, 1fr))` }}
        >
          {weeks.map((week, index) => {
            const empty = week.totalSec <= 0
            const weekNum = isoWeekNumber(week.weekStart)
            const zoneLine = ZONES.flatMap((zone, zoneIndex) => {
              const pct = week.percents[zoneIndex]
              return pct > 0 ? [`${zone.short} ${zonePercent(pct)}`] : []
            }).join(' · ')
            const summary = empty
              ? `Week ${weekNum}. No HR data.`
              : `Week ${weekNum}. ${zoneLine}`

            return (
              <ChartTooltipAnchor
                key={week.weekStart}
                className={styles.week}
                edge={tooltipEdge(index, weeks.length)}
                aria-label={summary}
                tooltip={
                  <>
                    <span className={tip.head}>Week {weekNum}</span>
                    <span className={tip.range}>{weekRangeLabel(week.weekStart)}</span>
                    {empty ? (
                      <span className={tip.empty}>No HR data</span>
                    ) : (
                      <>
                        <div className={tip.divider} aria-hidden="true" />
                        <div className={tip.rows}>
                          {ZONES.map((zone, zoneIndex) =>
                            week.percents[zoneIndex] > 0 ? (
                              <div key={zone.short} className={tip.row}>
                                <span className={tip.rowLabel}>
                                  <span className={hr.swatch} data-zone={zone.id} aria-hidden="true" />
                                  <span className={hr.ink} data-zone={zone.id}>
                                    {zone.short}
                                  </span>
                                </span>
                                <span className={tip.rowValue}>
                                  {zonePercent(week.percents[zoneIndex])}
                                </span>
                              </div>
                            ) : null,
                          )}
                        </div>
                      </>
                    )}
                  </>
                }
              >
                <div className={styles.barWell} aria-hidden="true">
                  {empty ? (
                    <span className={styles.emptyFill} />
                  ) : (
                    <div className={styles.stack}>
                      {(() => {
                        const bottomIndex = week.percents.findIndex((value) => value > 0)
                        let topIndex = -1
                        for (let i = week.percents.length - 1; i >= 0; i -= 1) {
                          if (week.percents[i] > 0) {
                            topIndex = i
                            break
                          }
                        }
                        return week.percents.map((pct, zoneIndex) => {
                          if (pct <= 0) return null
                          const isTop = zoneIndex === topIndex
                          const isBottom = zoneIndex === bottomIndex
                          return (
                            <span
                              key={ZONES[zoneIndex].short}
                              className={`${styles.seg} ${hr.fill}`}
                              data-zone={zoneIndex + 1}
                              data-edge={
                                isTop && isBottom ? 'both' : isTop ? 'top' : isBottom ? 'bottom' : 'mid'
                              }
                              style={{ height: `${pct}%` }}
                            />
                          )
                        })
                      })()}
                    </div>
                  )}
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

      <div className={styles.totalsRow}>
        <p
          className={hr.legend}
          aria-label={`HR zone totals for ${yearSummary.year} vs ${yearSummary.previousYear}`}
        >
          {yearSummary.percents.map((pct, index) => {
            const delta = yearSummary.deltas[index]
            const showDelta = yearSummary.hasPreviousYear && delta !== 0
            const zone = ZONES[index]
            return (
              <span key={zone.short} className={hr.item}>
                <span className={hr.swatch} data-zone={zone.id} />
                <strong className={hr.ink} data-zone={zone.id}>
                  {zone.short}
                </strong>
                <span>{pct}%</span>
                {showDelta ? (
                  <span className={styles.totalDelta} data-tone={delta > 0 ? 'up' : 'down'}>
                    {delta > 0 ? '+' : '−'}
                    {Math.abs(delta)}
                  </span>
                ) : null}
              </span>
            )
          })}
        </p>
        <p className={styles.totalsNote}>
          {yearSummary.hasPreviousYear
            ? `vs ${yearSummary.previousYear} (percentage points)`
            : `No ${yearSummary.previousYear} HR data to compare yet`}
        </p>
      </div>
    </section>
  )
}
