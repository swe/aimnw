import { useMemo } from 'react'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  createCoordinates,
} from '@vnedyalk0v/react19-simple-maps'
import { getPlaces } from '@/api/map'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import {
  WORLD_GEOGRAPHY,
  geoCountryKey,
  isVisitedCountry,
} from '@/lib/mapCountries'
import styles from './WorldMapPreview.module.css'

const MAP_WIDTH = 800
const MAP_HEIGHT = 420
const VANCOUVER = createCoordinates(-123.1207, 49.2827)

const NORTH_AMERICA = new Set([
  'Canada',
  'United States of America',
  'Mexico',
  'Greenland',
  'Cuba',
  'Haiti',
  'Dominican Rep.',
  'Jamaica',
  'Bahamas',
  'Puerto Rico',
  'Belize',
  'Guatemala',
  'Honduras',
  'El Salvador',
  'Nicaragua',
  'Costa Rica',
  'Panama',
])

export function WorldMapPreview() {
  const places = useAsyncResource('map', (signal) => getPlaces(signal))

  const visitedGeoKeys = useMemo(() => {
    if (places.status !== 'success') return new Set<string>()
    return new Set(
      places.data.map((place) => geoCountryKey(place.country)).filter(Boolean),
    )
  }, [places])

  return (
    <div className={styles.root}>
      <div className={styles.stage}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 540,
            center: createCoordinates(-106, 52),
          }}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          className={styles.map}
          aria-label="North America map with current location in Vancouver"
        >
          <Geographies geography={WORLD_GEOGRAPHY}>
            {({ geographies }) =>
              geographies
                .filter((geo) => NORTH_AMERICA.has(String(geo.properties?.name ?? '')))
                .map((geo) => {
                const name = String(geo.properties?.name ?? '')
                const visited = isVisitedCountry(name, visitedGeoKeys)
                return (
                  <Geography
                    key={String(geo.id ?? name)}
                    geography={geo}
                    tabIndex={-1}
                    focusable={false}
                    style={{
                      default: {
                        fill: visited ? 'var(--map-visited)' : 'var(--map-land)',
                        stroke: 'var(--map-stroke)',
                        strokeWidth: 0.7,
                        outline: 'none',
                        cursor: 'default',
                        pointerEvents: 'none',
                      },
                      hover: {
                        fill: visited ? 'var(--map-visited)' : 'var(--map-land)',
                        outline: 'none',
                        cursor: 'default',
                        pointerEvents: 'none',
                      },
                      pressed: {
                        fill: visited ? 'var(--map-visited)' : 'var(--map-land)',
                        outline: 'none',
                        cursor: 'default',
                        pointerEvents: 'none',
                      },
                    }}
                  />
                )
              })
            }
          </Geographies>

          <Marker coordinates={VANCOUVER}>
            <g className={styles.here} aria-label="Vancouver">
              <circle className={styles.herePulse} cx={0} cy={0} r={24}>
                <animate
                  attributeName="r"
                  values="16;52"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.55;0"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle className={styles.herePulse} cx={0} cy={0} r={24}>
                <animate
                  attributeName="r"
                  values="16;52"
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
              <circle className={styles.hereDot} cx={0} cy={0} r={15} />
            </g>
          </Marker>
        </ComposableMap>
      </div>
    </div>
  )
}
