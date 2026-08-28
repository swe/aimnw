import styles from './WeekMixBar.module.css'
import type { SportWeeklyMix } from '@/types'

type Props = {
  mix: SportWeeklyMix[]
  durationLabel: string
  /** This week's hours as % of the busiest week (0–100). */
  fillPercent: number
  empty?: boolean
}

export function WeekMixBar({ mix, durationLabel, fillPercent, empty }: Props) {
  const width = Math.max(0, Math.min(100, fillPercent))

  return (
    <div className={styles.row}>
      <div className={styles.track} aria-hidden="true">
        {empty || mix.length === 0 || width === 0 ? (
          <span className={styles.empty} />
        ) : (
          <div className={styles.fill} style={{ width: `${width}%` }}>
            {mix.map((part) => (
              <span
                key={part.kind}
                className={styles.seg}
                data-kind={part.kind}
                style={{ width: `${Math.max(part.percent, 1)}%` }}
                title={`${part.label}: ${part.percent}%`}
              />
            ))}
          </div>
        )}
      </div>
      <strong className={styles.duration}>{durationLabel}</strong>
    </div>
  )
}
