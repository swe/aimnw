import { memo, useMemo } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  createCoordinates,
} from '@vnedyalk0v/react19-simple-maps'
import { WORLD_GEOGRAPHY } from '@/lib/mapCountries'
import styles from './PhotoLocationMap.module.css'

type Props = {
  latitude: number
  longitude: number
}

const MAP_WIDTH = 220
const MAP_HEIGHT = 108

function PhotoLocationMapInner({ latitude, longitude }: Props) {
  const coordinates = useMemo(
    () => createCoordinates(longitude, latitude),
    [latitude, longitude],
  )

  return (
    <div className={styles.root} aria-hidden="true">
      <ComposableMap
        projection="geoNaturalEarth1"
        projectionConfig={{
          scale: 72,
          center: coordinates,
        }}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        className={styles.map}
      >
        <Geographies geography={WORLD_GEOGRAPHY}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const name = String(geo.properties?.name ?? geo.id ?? '')
              return (
                <Geography
                  key={String(geo.id ?? name)}
                  geography={geo}
                  tabIndex={-1}
                  focusable={false}
                  style={{
                    default: {
                      fill: 'rgb(243 244 243 / 0.08)',
                      stroke: 'rgb(243 244 243 / 0.14)',
                      strokeWidth: 0.35,
                      outline: 'none',
                      pointerEvents: 'none',
                    },
                    hover: {
                      fill: 'rgb(243 244 243 / 0.08)',
                      outline: 'none',
                      pointerEvents: 'none',
                    },
                    pressed: {
                      fill: 'rgb(243 244 243 / 0.08)',
                      outline: 'none',
                      pointerEvents: 'none',
                    },
                  }}
                />
              )
            })
          }
        </Geographies>

        <Marker coordinates={coordinates}>
          <g className={styles.pin}>
            <circle className={styles.pulse} cx={0} cy={0} r={5}>
              <animate attributeName="r" values="3.5;12" dur="2.4s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.55;0" dur="2.4s" repeatCount="indefinite" />
            </circle>
            <circle className={styles.pulse} cx={0} cy={0} r={5}>
              <animate
                attributeName="r"
                values="3.5;12"
                dur="2.4s"
                begin="1.2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.55;0"
                dur="2.4s"
                begin="1.2s"
                repeatCount="indefinite"
              />
            </circle>
            <circle className={styles.dot} cx={0} cy={0} r={2.6} />
          </g>
        </Marker>
      </ComposableMap>
    </div>
  )
}

export const PhotoLocationMap = memo(PhotoLocationMapInner)
