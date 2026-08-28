import styles from './RouteMap.module.css'
import type { SportRouteMap } from '@/types'

type Props = {
  map: SportRouteMap
  kind: 'running' | 'cycling' | 'swimming' | 'hiking' | 'soccer'
}

export function RouteMapSvg({ map, kind }: Props) {
  return (
    <figure className={styles.figure} data-kind={kind}>
      <svg
        className={styles.svg}
        viewBox="0 0 320 140"
        role="img"
        aria-label={map.label ? `Route map: ${map.label}` : 'Route map'}
      >
        <defs>
          <linearGradient id={`route-fade-${kind}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <rect width="320" height="140" rx="10" fill={`url(#route-fade-${kind})`} />
        <g opacity="0.18" stroke="currentColor" strokeWidth="0.6">
          <path d="M0 35 H320 M0 70 H320 M0 105 H320" />
          <path d="M80 0 V140 M160 0 V140 M240 0 V140" />
        </g>
        <path
          d={map.path}
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={styles.route}
        />
      </svg>
    </figure>
  )
}
