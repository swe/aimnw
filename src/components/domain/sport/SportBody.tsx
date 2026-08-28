import { useMemo } from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import shell from './sportShell.module.css'
import styles from './SportBody.module.css'
import type { SportBodySeries } from '@/types'

type Props = {
  series: SportBodySeries[]
}

const SPARK_HEIGHT = 64
const POINT_STEP = 8

function sparkGeometry(values: number[]) {
  if (values.length === 0) {
    return { width: POINT_STEP, line: '', area: '' }
  }
  const width = Math.max(POINT_STEP, (values.length - 1) * POINT_STEP || POINT_STEP)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const padY = 8
  const points = values.map((value, index) => {
    const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width
    const y = SPARK_HEIGHT - ((value - min) / range) * (SPARK_HEIGHT - padY * 2) - padY
    return { x, y }
  })
  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
  const area = `${line} L${width} ${SPARK_HEIGHT} L0 ${SPARK_HEIGHT} Z`
  return { width, line, area }
}

function TrendIcon({ direction }: { direction: 'up' | 'down' }) {
  if (direction === 'up') return <TrendingUp aria-hidden size={13} strokeWidth={2.4} />
  return <TrendingDown aria-hidden size={13} strokeWidth={2.4} />
}

export function SportBody({ series }: Props) {
  const cards = useMemo(() => {
    return series.map((row) => {
      const spark = sparkGeometry(row.values)
      return { ...row, ...spark }
    })
  }, [series])

  if (cards.every((card) => card.empty)) return null

  return (
    <section className={shell.card} aria-labelledby="sport-body-heading">
      <h2 id="sport-body-heading" className={`ui-kicker ${shell.title}`}>
        Body composition trends
      </h2>
      <div className={styles.grid}>
        {cards.map((card) => (
          <article key={card.id} className={styles.tile} data-empty={card.empty ? 'true' : undefined}>
            <div className={styles.head}>
              <span className={styles.label}>{card.label}</span>
              {!card.empty && card.direction !== 'flat' ? (
                <span className={styles.trend} data-tone={card.tone} aria-hidden="true">
                  <TrendIcon direction={card.direction} />
                </span>
              ) : null}
            </div>
            {card.empty ? (
              <div className={styles.emptySpark} aria-hidden="true" />
            ) : (
              <svg
                className={styles.spark}
                viewBox={`0 0 ${card.width} ${SPARK_HEIGHT}`}
                preserveAspectRatio="none"
                role="img"
                aria-label={`${card.label} trend over recent readings`}
                data-tone={card.tone}
              >
                <path d={card.area} className={styles.area} />
                <path d={card.line} className={styles.line} fill="none" />
              </svg>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
