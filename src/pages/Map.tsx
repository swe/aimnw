import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight } from 'lucide-react'
import { ApiEmptyState } from '@/components/domain/ApiEmptyState'
import { EmptyState } from '@/components/domain/EmptyState'
import { getPlaces } from '@/api/map'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { countVisitedCountries } from '@/lib/mapCountries'
import { loadMapkit, type MapKit } from '@/lib/mapkit'
import { groupPlacesByGeography } from '@/lib/placeGeography'
import type { PlaceItem } from '@/types'
import styles from './Map.module.css'

/** Match stats pill bottom offset so MapKit chrome lines up with it. */
const MAP_EDGE_INSET = 20
/** Desktop: keep annotations clear of the floating header + MapKit search bar. */
const MAP_TOP_PADDING_DESKTOP = 72

function mapTopPadding() {
  return window.matchMedia('(max-width: 860px)').matches ? 0 : MAP_TOP_PADDING_DESKTOP
}
/** Stagger pin reveals across this window after the map is ready. */
const PIN_REVEAL_MS = 3000
const EMPTY_PLACES: PlaceItem[] = []

type MapStatus = 'loading' | 'ready' | 'error'

function createPinElement() {
  const el = document.createElement('div')
  el.className = styles.pin
  el.setAttribute('aria-hidden', 'true')
  const core = document.createElement('span')
  core.className = styles.pinCore
  el.appendChild(core)
  return el
}

function addPins(
  mapkit: MapKit,
  map: InstanceType<MapKit['Map']>,
  plotted: { place: PlaceItem; lat: number; lng: number }[],
) {
  const annotations = plotted.map(
    ({ place, lat, lng }) =>
      new mapkit.Annotation(
        new mapkit.Coordinate(lat, lng),
        createPinElement,
        {
          title: place.name,
          subtitle: place.country,
          animates: false,
          appearanceAnimation: '',
          size: { width: 22, height: 22 },
          anchorOffset: new DOMPoint(0, 0),
          data: { id: place.id },
        },
      ),
  )

  if (annotations.length === 0) return () => {}

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion) {
    map.addAnnotations(annotations)
    return () => {}
  }

  const step = PIN_REVEAL_MS / annotations.length
  const timers: number[] = []

  annotations.forEach((annotation, index) => {
    const timer = window.setTimeout(() => {
      map.addAnnotation(annotation)
    }, index * step)
    timers.push(timer)
  })

  return () => {
    for (const timer of timers) window.clearTimeout(timer)
  }
}

export function MapPage() {
  const placesState = useAsyncResource('map', (signal) => getPlaces(signal))
  const containerRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLButtonElement>(null)
  const sheetBodyRef = useRef<HTMLDivElement>(null)
  const [mapStatus, setMapStatus] = useState<MapStatus>('loading')
  const [mapError, setMapError] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [tileWidth, setTileWidth] = useState<number | null>(null)

  const places = placesState.status === 'success' ? placesState.data : EMPTY_PLACES

  const plotted = useMemo(() => {
    const points: { place: PlaceItem; lat: number; lng: number }[] = []
    for (const place of places) {
      if (!Number.isFinite(place.latitude) || !Number.isFinite(place.longitude)) {
        continue
      }
      points.push({ place, lat: place.latitude, lng: place.longitude })
    }
    return points
  }, [places])

  const countryCount = useMemo(
    () => countVisitedCountries(places.map((place) => place.country)),
    [places],
  )

  const geography = useMemo(() => groupPlacesByGeography(places), [places])

  const closeSheet = useCallback(() => setSheetOpen(false), [])
  const toggleSheet = useCallback(() => setSheetOpen((open) => !open), [])

  const statsReady = placesState.status === 'success' && places.length > 0

  useLayoutEffect(() => {
    const el = statsRef.current
    if (!el || !statsReady || sheetOpen) return

    const measure = () => {
      setTileWidth(Math.ceil(el.getBoundingClientRect().width))
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [statsReady, sheetOpen, countryCount, plotted.length])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [])

  useEffect(() => {
    if (!sheetOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeSheet()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [sheetOpen, closeSheet])

  useLayoutEffect(() => {
    if (!sheetOpen) return
    const body = sheetBodyRef.current
    if (body) body.scrollTop = 0
  }, [sheetOpen])

  useEffect(() => {
    if (placesState.status === 'loading') {
      setMapStatus('loading')
      return
    }

    if (placesState.status === 'error') {
      setMapStatus('error')
      return
    }

    const container = containerRef.current
    if (!container) return

    const signal = { cancelled: false }
    let map: InstanceType<MapKit['Map']> | null = null
    let cancelPins: (() => void) | null = null

    ;(async () => {
      try {
        setMapStatus('loading')
        setMapError(null)
        const mapkit = await loadMapkit()
        if (signal.cancelled || !containerRef.current) return

        map = new mapkit.Map(containerRef.current, {
          colorScheme: mapkit.ColorScheme.Light,
          isRotationEnabled: false,
          showsCompass: mapkit.FeatureVisibility.Hidden,
          showsMapTypeControl: false,
          showsZoomControl: true,
          showsUserLocationControl: false,
          showsPointsOfInterest: false,
          padding: new mapkit.Padding({
            top: mapTopPadding(),
            right: 12,
            bottom: MAP_EDGE_INSET,
            left: 12,
          }),
          cameraDistance: 28_000_000,
          center: new mapkit.Coordinate(20, 10),
        })

        if (signal.cancelled) {
          map.destroy()
          map = null
          return
        }

        setMapStatus('ready')
        cancelPins = addPins(mapkit, map, plotted)

        if (signal.cancelled && map) {
          cancelPins?.()
          cancelPins = null
          map.destroy()
          map = null
        }
      } catch (error) {
        if (signal.cancelled) return
        setMapStatus('error')
        setMapError(
          error instanceof Error ? error.message : 'Unable to load Apple Maps.',
        )
      }
    })()

    return () => {
      signal.cancelled = true
      cancelPins?.()
      cancelPins = null
      if (map) {
        map.destroy()
        map = null
      }
    }
  }, [placesState.status, plotted])

  const showTokenOrMapError =
    mapStatus === 'error' && placesState.status !== 'error'

  return (
    <div className={styles.root}>
      <div
        ref={containerRef}
        className={styles.map}
        role="presentation"
        aria-label="World map of places visited"
      />

      {mapStatus === 'loading' ? (
        <div className={styles.overlay} aria-live="polite">
          <p className={styles.overlayText}>Loading map…</p>
        </div>
      ) : null}

      {placesState.status === 'error' ? (
        <div className={styles.overlay}>
          <ApiEmptyState error={placesState.error} notConfigured={placesState.notConfigured} />
        </div>
      ) : null}

      {placesState.status === 'success' && places.length === 0 ? (
        <div className={styles.overlay}>
          <EmptyState message="No places yet." />
        </div>
      ) : null}

      {showTokenOrMapError ? (
        <div className={styles.overlay}>
          <EmptyState message={mapError ?? 'Unable to load Apple Maps.'} />
        </div>
      ) : null}

      {statsReady
        ? createPortal(
            <>
              {sheetOpen ? (
                <button
                  type="button"
                  className={styles.sheetBackdrop}
                  aria-label="Close places list"
                  onClick={closeSheet}
                />
              ) : null}

              <div
                className={[styles.sheet, sheetOpen ? styles.sheetOpen : '']
                  .filter(Boolean)
                  .join(' ')}
                style={tileWidth ? { width: tileWidth } : undefined}
              >
                <div
                  className={styles.sheetPanel}
                  aria-hidden={!sheetOpen}
                >
                  <div
                    ref={sheetBodyRef}
                    id="map-places-sheet"
                    className={styles.sheetBody}
                    role="region"
                    aria-label="Visited places"
                    onWheel={(event) => event.stopPropagation()}
                    onTouchMove={(event) => event.stopPropagation()}
                  >
                    <div className={styles.sheetTopPad} aria-hidden="true" />
                    {geography.map((continent) => (
                      <section key={continent.continent} className={styles.continent}>
                        <h2 className={`ui-item-title ${styles.continentTitle}`}>{continent.continent}</h2>
                        <ul className={styles.countries}>
                          {continent.countries.map((country) => (
                            <li key={country.country} className={styles.country}>
                              <div className={styles.countryHead}>
                                <span className={styles.flag} aria-hidden="true">
                                  {country.flagSrc ? (
                                    <img
                                      src={country.flagSrc}
                                      alt=""
                                      className={styles.flagImg}
                                      loading="lazy"
                                      decoding="async"
                                    />
                                  ) : (
                                    country.flag
                                  )}
                                </span>
                                <span className={styles.countryName}>{country.country}</span>
                                <span className={styles.countryCount}>
                                  {country.places.length}
                                </span>
                              </div>
                              <ul className={styles.settlements}>
                                {country.places.map((place) => (
                                  <li key={place.id} className={styles.settlement}>
                                    {place.guideId ? (
                                      <a
                                        href={`#guide-${place.guideId}`}
                                        className={styles.settlementLink}
                                        onClick={(event) => event.preventDefault()}
                                      >
                                        <span className={styles.settlementLabel}>
                                          {place.name}
                                        </span>
                                        <ArrowUpRight
                                          className={styles.settlementLinkIcon}
                                          aria-hidden="true"
                                          strokeWidth={1.75}
                                        />
                                      </a>
                                    ) : (
                                      place.name
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  </div>
                </div>

                <button
                  ref={statsRef}
                  type="button"
                  className={styles.stats}
                  aria-expanded={sheetOpen}
                  aria-controls="map-places-sheet"
                  onClick={toggleSheet}
                >
                  {countryCount} {countryCount === 1 ? 'country' : 'countries'}
                  <span className={styles.statsSep} aria-hidden="true">
                    ·
                  </span>
                  {plotted.length} {plotted.length === 1 ? 'settlement' : 'settlements'}
                </button>
              </div>
            </>,
            document.body,
          )
        : null}
    </div>
  )
}
