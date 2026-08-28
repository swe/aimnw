import { useEffect, useState } from 'react'
import styles from './RouteMap.module.css'
import { loadMapkit, type MapKit } from '@/lib/mapkit'
import type { SportRouteMap } from '@/types'
import { RouteMapSvg } from './RouteMapSvg'

type Props = {
  map: SportRouteMap
  kind: 'running' | 'cycling' | 'swimming' | 'hiking' | 'soccer'
}

const STROKE: Record<Props['kind'], string> = {
  running: '#e07030',
  cycling: '#1f9aaa',
  swimming: '#3b6fb0',
  hiking: '#8a7a3a',
  soccer: '#5c4db8',
}

/**
 * Prefer Apple MapKit when GPS points exist.
 * Uses the SVG sketch if MapKit is unset or fails to init.
 */
export function RouteMap({ map, kind }: Props) {
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const [failed, setFailed] = useState(false)
  const coordsKey = map.coordinates?.map((p) => `${p.lat.toFixed(5)},${p.lon.toFixed(5)}`).join('|') ?? ''
  const canAttemptApple = (map.coordinates?.length ?? 0) >= 2

  useEffect(() => {
    setFailed(false)
  }, [coordsKey, kind])

  useEffect(() => {
    if (!canAttemptApple || failed || !host) return

    let cancelled = false
    let instance: InstanceType<MapKit['Map']> | null = null

    void (async () => {
      try {
        const mapkit = await loadMapkit()
        if (cancelled || !host.isConnected) return

        host.replaceChildren()

        const points = map.coordinates!
        const coords = points.map((point) => new mapkit.Coordinate(point.lat, point.lon))
        const style = new mapkit.Style({
          strokeColor: STROKE[kind],
          lineWidth: 3.5,
          strokeOpacity: 1,
        })
        const overlay = new mapkit.PolylineOverlay(coords, { style })

        const lats = points.map((p) => p.lat)
        const lons = points.map((p) => p.lon)
        const minLat = Math.min(...lats)
        const maxLat = Math.max(...lats)
        const minLon = Math.min(...lons)
        const maxLon = Math.max(...lons)
        const center = new mapkit.Coordinate((minLat + maxLat) / 2, (minLon + maxLon) / 2)
        const span = new mapkit.CoordinateSpan(
          Math.max((maxLat - minLat) * 1.7, 0.015),
          Math.max((maxLon - minLon) * 1.7, 0.015),
        )

        instance = new mapkit.Map(host, {
          colorScheme: mapkit.ColorScheme.Light,
          isZoomEnabled: false,
          isScrollEnabled: false,
          isRotationEnabled: false,
          showsMapTypeControl: false,
          showsCompass: mapkit.FeatureVisibility.Hidden,
          showsZoomControl: false,
          showsUserLocationControl: false,
          center,
          region: new mapkit.CoordinateRegion(center, span),
          overlays: [overlay],
        })

        instance.showItems([overlay], {
          animate: false,
          padding: new mapkit.Padding(20, 20, 20, 20),
        })

        if (cancelled) {
          instance.destroy()
          instance = null
        }
      } catch (error) {
        console.warn('[RouteMap] MapKit failed, using SVG fallback', error)
        if (!cancelled) setFailed(true)
      }
    })()

    return () => {
      cancelled = true
      instance?.destroy()
      instance = null
      host.replaceChildren()
    }
  }, [canAttemptApple, failed, host, kind, coordsKey, map.coordinates])

  if (!canAttemptApple || failed) {
    return <RouteMapSvg map={map} kind={kind} />
  }

  return (
    <figure className={styles.figure} data-kind={kind}>
      <div
        ref={setHost}
        className={styles.appleMap}
        role="img"
        aria-label={map.label ? `Route map: ${map.label}` : 'Route map'}
      />
    </figure>
  )
}
