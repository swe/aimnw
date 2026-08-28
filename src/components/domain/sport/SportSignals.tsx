import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { Minus, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import shell from './sportShell.module.css'
import styles from './SportSignals.module.css'
import type { SportKpiTile } from '@/types'

type Props = {
  tiles: SportKpiTile[]
}

const SPARK_HEIGHT = 44
const POINT_STEP = 6

function TrendIcon({ direction }: { direction: SportKpiTile['direction'] }) {
  if (direction === 'up') return <TrendingUp aria-hidden size={12} strokeWidth={2.5} />
  if (direction === 'down') return <TrendingDown aria-hidden size={12} strokeWidth={2.5} />
  return <Minus aria-hidden size={11} strokeWidth={2.5} />
}

function sparkGeometry(values: number[], goalLine?: number) {
  const series = values.length === 1 ? [values[0], values[0]] : values
  if (series.length === 0) {
    return { width: POINT_STEP, line: '', area: '', goalY: null as number | null }
  }

  const width = Math.max(POINT_STEP, (series.length - 1) * POINT_STEP || POINT_STEP)
  const rangeValues = goalLine != null ? [...series, goalLine] : series
  const min = Math.min(...rangeValues)
  const max = Math.max(...rangeValues)
  const range = max - min || 1
  const padY = 6
  const plotHeight = SPARK_HEIGHT - padY * 2

  const points = series.map((value, index) => {
    const x = series.length === 1 ? width / 2 : (index / (series.length - 1)) * width
    const y = SPARK_HEIGHT - ((value - min) / range) * plotHeight - padY
    return { x, y }
  })

  const line = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ')
  const area = `${line} L${width} ${SPARK_HEIGHT} L0 ${SPARK_HEIGHT} Z`
  const goalY =
    goalLine != null ? SPARK_HEIGHT - ((goalLine - min) / range) * plotHeight - padY : null

  return { width, line, area, goalY }
}

function goalText(tile: SportKpiTile) {
  if (!tile.goal) return null
  const label = tile.goalLabel === 'Age' ? 'Age' : tile.goalPrefix ? 'Goal' : 'Target'
  const prefix = tile.goalPrefix ? `${tile.goalPrefix} ` : ''
  const suffix = tile.unit && tile.goalLabel !== 'Age' ? ` ${tile.unit}` : ''
  return `${label} ${prefix}${tile.goal}${suffix}`
}

function trendText(tile: SportKpiTile) {
  const showDelta = tile.showDelta !== false
  if (!showDelta || tile.delta === '0') return null
  const unit = tile.deltaUnit ? ` ${tile.deltaUnit}` : ''
  return `${tile.delta}${unit}`
}

function KpiSparkline({ tile }: { tile: SportKpiTile }) {
  if (!tile.sparkline?.length) return null

  const spark = sparkGeometry(tile.sparkline, tile.goalLine)
  if (!spark.line) return null

  return (
    <svg
      className={styles.spark}
      viewBox={`0 0 ${spark.width} ${SPARK_HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-hidden="true"
    >
      {spark.goalY != null ? (
        <line
          x1={0}
          y1={spark.goalY}
          x2={spark.width}
          y2={spark.goalY}
          className={styles.goalLine}
        />
      ) : null}
      <path d={spark.area} className={styles.sparkArea} />
      <path d={spark.line} className={styles.sparkLine} fill="none" />
    </svg>
  )
}

function KpiHint({ hint }: { hint: string }) {
  const [open, setOpen] = useState(false)
  const [align, setAlign] = useState<'start' | 'center' | 'end'>('end')
  const hintId = useId()
  const hintRef = useRef<HTMLSpanElement>(null)
  const markRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLSpanElement>(null)

  const syncAlign = useCallback(() => {
    const panel = panelRef.current
    const mark = markRef.current
    if (!panel || !mark) return

    const pad = 12
    const panelWidth = panel.offsetWidth
    const markRect = mark.getBoundingClientRect()
    const centeredLeft = markRect.left + markRect.width / 2 - panelWidth / 2
    const centeredRight = centeredLeft + panelWidth

    if (centeredLeft < pad) setAlign('start')
    else if (centeredRight > window.innerWidth - pad) setAlign('end')
    else setAlign('center')
  }, [])

  useLayoutEffect(() => {
    if (!open) return
    syncAlign()
  }, [open, hint, syncAlign])

  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!hintRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('resize', syncAlign)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('resize', syncAlign)
    }
  }, [open, syncAlign])

  return (
    <span
      ref={hintRef}
      className={[styles.hint, open ? styles.hintOpen : ''].filter(Boolean).join(' ')}
    >
      <button
        ref={markRef}
        type="button"
        className={styles.hintMark}
        aria-label={hint}
        aria-describedby={open ? hintId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        ?
      </button>
      <span
        ref={panelRef}
        id={hintId}
        className={styles.hintPanel}
        data-align={align}
        role="tooltip"
      >
        {hint}
      </span>
    </span>
  )
}

function KpiTile({ tile }: { tile: SportKpiTile }) {
  const showDelta = tile.showDelta !== false
  const trend = trendText(tile)
  const goal = goalText(tile)
  const hasSparkline = Boolean(tile.sparkline?.length && !tile.emptyMessage)

  return (
    <article
      className={styles.tile}
      data-accent={tile.accent}
      data-has-spark={hasSparkline ? 'true' : undefined}
      aria-label={`${tile.label}. ${tile.value}${tile.unit ? ` ${tile.unit}` : ''}.`}
    >
      <div className={styles.head}>
        <span className={styles.label}>{tile.label}</span>
        {tile.hint ? <KpiHint hint={tile.hint} /> : null}
      </div>

      {tile.emptyMessage ? (
        <p className={styles.emptyMessage}>{tile.emptyMessage}</p>
      ) : (
        <>
          <div className={styles.metric}>
            <div className={styles.reading}>
              <span className={styles.value} data-status={tile.valueStatus}>
                {tile.value}
              </span>
              {tile.unit ? <span className={styles.unit}>{tile.unit}</span> : null}
            </div>
            {showDelta && trend ? (
              <span className={styles.trend} data-tone={tile.tone} data-direction={tile.direction}>
                <TrendIcon direction={tile.direction} />
                <span>{trend}</span>
              </span>
            ) : null}
          </div>

          {tile.badge ? (
            <p className={styles.badge} data-status={tile.valueStatus}>
              <Sparkles aria-hidden size={11} strokeWidth={2.2} />
              <span>{tile.badge}</span>
            </p>
          ) : null}

          {goal ? <p className={styles.footnote}>{goal}</p> : null}

          <KpiSparkline tile={tile} />
        </>
      )}
    </article>
  )
}

export function SportSignals({ tiles }: Props) {
  return (
    <section className={shell.card} aria-labelledby="sport-kpi-heading">
      <h2 id="sport-kpi-heading" className={`ui-kicker ${shell.title}`}>
        Key signals this week
      </h2>
      <div className={styles.grid}>
        {tiles.map((tile) => (
          <KpiTile key={tile.id} tile={tile} />
        ))}
      </div>
    </section>
  )
}
