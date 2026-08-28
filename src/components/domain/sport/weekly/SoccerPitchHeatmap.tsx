import type { SportSoccerPitchHeat } from '@/types'
import styles from './SoccerPitchHeatmap.module.css'

type Props = {
  heat: SportSoccerPitchHeat
}

/**
 * Pitch photo + soft occupancy blobs. Coordinates are % of the field
 * (own goal left → attack right; left wing near the top edge).
 */
export function SoccerPitchHeatmap({ heat }: Props) {
  const spots = [...heat.spots].sort((a, b) => a.intensity - b.intensity)

  return (
    <figure className={styles.figure}>
      <div className={styles.frame}>
        <img
          className={styles.pitch}
          src={heat.pitchSrc}
          alt=""
          width={1024}
          height={682}
          decoding="async"
        />
        <svg
          className={styles.overlay}
          viewBox="0 0 100 66.6"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            {spots.map((spot, index) => {
              const hot = spot.intensity
              return (
                <radialGradient
                  key={`g-${index}`}
                  id={`pitch-heat-${index}`}
                  cx="50%"
                  cy="50%"
                  r="50%"
                >
                  <stop
                    offset="0%"
                    stopColor={`rgba(255, 168, 48, ${0.22 + hot * 0.42})`}
                  />
                  <stop
                    offset="35%"
                    stopColor={`rgba(255, 196, 72, ${0.14 + hot * 0.28})`}
                  />
                  <stop
                    offset="70%"
                    stopColor={`rgba(255, 220, 120, ${0.05 + hot * 0.12})`}
                  />
                  <stop offset="100%" stopColor="rgba(255, 230, 150, 0)" />
                </radialGradient>
              )
            })}
          </defs>
          {spots.map((spot, index) => (
            <ellipse
              key={`s-${index}`}
              cx={spot.x}
              cy={(spot.y / 100) * 66.6}
              rx={spot.r}
              ry={spot.r * 0.78}
              fill={`url(#pitch-heat-${index})`}
            />
          ))}
        </svg>
      </div>
    </figure>
  )
}
