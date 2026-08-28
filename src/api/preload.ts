import { getCameraRollPhotos, getViewfinderPhotos, type CameraPhoto } from './photos'
import { getDrinks } from './drinks'
import { getFieldNotes } from './notes'
import { getGear } from './gear'
import { getGoals } from './goals'
import { getHates } from './hates'
import { getLibrary } from './library'
import { getPlaces } from './map'
import { getQuests } from './quests'
import { getSportHub } from './sport'
import { getVinyl } from './vinyl'
import { mapWithConcurrency } from '@/lib/concurrency'
import { enableResourcePersistence, loadResource, peekResource } from '@/lib/resourceCache'

const IDLE_TIMEOUT_MS = 3000
const IDLE_FALLBACK_MS = 1200
/** Thumbnails warmed for /viewfinder, enough to cover the first screens of the grid. */
const IMAGE_WARM_LIMIT = 60
const IMAGE_WARM_CONCURRENCY = 4

type Loader = (signal: AbortSignal) => Promise<unknown>

const resourceLoaders: Record<string, Loader> = {
  library: getLibrary,
  goals: getGoals,
  hate: getHates,
  'camera-roll': getCameraRollPhotos,
  'joplin-posts': getFieldNotes,
  use: getGear,
  map: getPlaces,
  quests: getQuests,
  vinyl: getVinyl,
  drink: getDrinks,
  sport: getSportHub,
  viewfinder: getViewfinderPhotos,
}

type Route = {
  load: () => Promise<unknown>
  keys: string[]
  /** Runs at idle once the route's keys are warm. */
  onWarm?: () => void
}

/** Chunk plus the cache keys each route renders from, for boot and hover prefetch. */
const routes: Record<string, Route> = {
  '/whoami': { load: () => import('@/pages/Whoami'), keys: ['goals', 'quests', 'map'] },
  '/now': { load: () => import('@/pages/Now'), keys: [] },
  '/principles': { load: () => import('@/pages/Principles'), keys: [] },
  '/experiments': { load: () => import('@/pages/Experiments'), keys: [] },
  '/headspace': { load: () => import('@/pages/FieldNotes'), keys: ['joplin-posts'] },
  '/map': { load: () => import('@/pages/Map'), keys: ['map'] },
  '/library': { load: () => import('@/pages/Library'), keys: ['library', 'vinyl'] },
  '/goals': { load: () => import('@/pages/Goals'), keys: ['goals'] },
  '/sport': { load: () => import('@/pages/Sport'), keys: ['sport'] },
  '/ai': { load: () => import('@/pages/Ai'), keys: [] },
  '/use': { load: () => import('@/pages/Use'), keys: ['use'] },
  '/hate': { load: () => import('@/pages/Hate'), keys: ['hate'] },
  '/drink': { load: () => import('@/pages/Drink'), keys: ['drink'] },
  '/viewfinder': {
    load: () => import('@/pages/Viewfinder'),
    keys: ['viewfinder'],
    onWarm: warmViewfinderImages,
  },
}

/** Home renders from these, so they go out before anything route-specific. */
const homeKeys = [
  'library',
  'goals',
  'hate',
  'camera-roll',
  'joplin-posts',
  'use',
]

/** Small enough to warm once home has painted. */
const idleKeys = ['map', 'quests', 'vinyl', 'drink']

/**
 * Slowest payloads to rebuild, so a reload paints from the last visit. Neither
 * is in the boot list: `viewfinder` waits for hover or a visit, and `sport` is
 * requested by home's training panel itself, after the cheap keys are away.
 */
const persistedKeys = ['sport', 'viewfinder']

let started = false

function warm(key: string) {
  const loader = resourceLoaders[key]
  if (!loader) return Promise.resolve(undefined)
  return loadResource(key, loader, { keepAlive: true }).catch(() => undefined)
}

function onIdle(run: () => void) {
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(run, { timeout: IDLE_TIMEOUT_MS })
    return
  }
  setTimeout(run, IDLE_FALLBACK_MS)
}

function warmImage(url: string) {
  return new Promise<void>((resolve) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve()
    image.onerror = () => resolve()
    image.src = url
  })
}

/** Puts the grid's thumbnails in the browser cache so /viewfinder paints complete. */
function warmViewfinderImages() {
  const entry = peekResource('viewfinder')
  if (entry?.status !== 'success') return

  const urls = (entry.data as CameraPhoto[])
    .slice(0, IMAGE_WARM_LIMIT)
    .map((photo) => photo.imageUrl)

  void mapWithConcurrency(urls, IMAGE_WARM_CONCURRENCY, (url) => warmImage(url))
}

/**
 * Warms a route on hover / focus. Safety net for a click that lands before the
 * boot prefetch reaches that page.
 */
export function prefetchRoute(path: string) {
  const route = routes[path]
  if (!route) return

  void route.load().catch(() => undefined)
  const warmed = Promise.all(route.keys.map(warm))
  const { onWarm } = route
  if (onWarm) void warmed.then(() => onIdle(onWarm))
}

/** Spread onto an internal link to prefetch its route on hover or keyboard focus. */
export function routePrefetchProps(to: string) {
  return {
    onPointerEnter: () => prefetchRoute(to),
    onFocus: () => prefetchRoute(to),
  }
}

/**
 * First paint only fires what home renders. Other pages' data waits for idle.
 * Route chunks load on hover or visit — idle-downloading every page pulled
 * mermaid, MapKit, and sport into a cold load for no reason.
 */
export function preloadSite() {
  if (started) return
  started = true

  enableResourcePersistence(persistedKeys)

  for (const key of homeKeys) void warm(key)

  onIdle(() => {
    for (const key of idleKeys) void warm(key)
  })
}
