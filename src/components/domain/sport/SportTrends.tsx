import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import shell from './sportShell.module.css'
import styles from './SportTrends.module.css'
import type { SportTrendRow, SportTrendTopic } from '@/types'

type Props = {
  rows: SportTrendRow[]
}

const TOPICS: { id: SportTrendTopic; label: string }[] = [
  { id: 'load', label: 'Training load' },
  { id: 'running', label: 'Running' },
  { id: 'recovery', label: 'Recovery' },
]

function TrendArrow({ direction }: { direction: SportTrendRow['direction'] }) {
  if (direction === 'up') return <TrendingUp aria-hidden size={13} strokeWidth={2.4} />
  if (direction === 'down') return <TrendingDown aria-hidden size={13} strokeWidth={2.4} />
  return <Minus aria-hidden size={12} strokeWidth={2.4} />
}

function formatPct(pct: number) {
  if (pct === 0) return '0%'
  const sign = pct > 0 ? '+' : '−'
  const abs = Math.abs(pct)
  const label = Number.isInteger(abs) ? String(abs) : abs.toFixed(1)
  return `${sign}${label}%`
}

function TrendMetric({ row }: { row: SportTrendRow }) {
  return (
    <div className={styles.metric} role="listitem">
      <span className={styles.arrow} data-tone={row.tone} data-direction={row.direction}>
        <TrendArrow direction={row.direction} />
      </span>
      <span className={styles.metricBody}>
        <span className={styles.metricLabel}>{row.label}</span>
        <span className={styles.values}>
          <span className={styles.comparison}>
            <span className={styles.previous}>{row.previousLabel}</span>
            <span className={styles.arrowSep} aria-hidden>
              →
            </span>
            <span className={styles.current}>{row.currentLabel}</span>
          </span>
          <span className={styles.delta} data-tone={row.tone}>
            {formatPct(row.pctChange)}
          </span>
        </span>
      </span>
    </div>
  )
}

export function SportTrends({ rows }: Props) {
  const grouped = TOPICS.map((topic) => ({
    ...topic,
    rows: rows
      .filter((row) => row.topic === topic.id)
      .sort((a, b) => Math.abs(b.pctChange) - Math.abs(a.pctChange)),
  })).filter((section) => section.rows.length > 0)

  return (
    <section className={shell.card} aria-labelledby="sport-trends-heading">
      <div className={shell.header}>
        <h2 id="sport-trends-heading" className={`ui-kicker ${shell.title}`}>
          Trends
        </h2>
        <span className={shell.sub}>last 4 weeks vs previous 4</span>
      </div>

      {grouped.length === 0 ? (
        <p className={styles.empty}>Not enough recent activity to compare yet.</p>
      ) : (
        <div className={styles.sections}>
          {grouped.map((section) => (
            <div key={section.id} className={styles.section} data-topic={section.id}>
              <h3 className={styles.sectionTitle}>{section.label}</h3>
              <div className={styles.grid} role="list">
                {section.rows.map((row) => (
                  <TrendMetric key={row.id} row={row} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
