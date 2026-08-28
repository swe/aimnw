import { ApiError, isApiNotConfigured } from '@/api/client'

type SuccessEntry = { status: 'success'; data: unknown }
type ErrorEntry = { status: 'error'; error: string; notConfigured: boolean }
export type ResourceEntry = SuccessEntry | ErrorEntry

type InflightEntry = {
  promise: Promise<unknown>
  controller: AbortController
  /** Prefetches have no subscriber to lose, so they always run to completion. */
  keepAlive: boolean
}

const cache = new Map<string, ResourceEntry>()
const inflight = new Map<string, InflightEntry>()
const listeners = new Map<string, Set<() => void>>()

const PERSIST_PREFIX = 'aimnw:resource:'
/** Bump when a payload shape changes so old tabs discard their copy. */
const PERSIST_VERSION = 10
const PERSIST_MAX_AGE_MS = 30 * 60_000
/**
 * Restoring happens before the first paint, so an oversized entry costs a
 * synchronous parse on every reload — the opposite of what persistence is for.
 * Past this, skip the write and let the page fetch normally.
 */
const PERSIST_MAX_CHARS = 600_000

type PersistedEntry = { version: number; savedAt: number; data: unknown }

const persistedKeys = new Set<string>()

function sessionStore(): Storage | null {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function persist(key: string, data: unknown) {
  if (!persistedKeys.has(key)) return
  const store = sessionStore()
  if (!store) return

  try {
    const entry: PersistedEntry = { version: PERSIST_VERSION, savedAt: Date.now(), data }
    const raw = JSON.stringify(entry)
    if (raw.length > PERSIST_MAX_CHARS) return
    store.setItem(PERSIST_PREFIX + key, raw)
  } catch {
    /* private mode or quota — the in-memory cache still serves this session */
  }
}

/**
 * Seeds the given keys from sessionStorage so a reload paints from the previous
 * visit while the network copy revalidates. Call before the first render.
 */
export function enableResourcePersistence(keys: readonly string[]) {
  const store = sessionStore()
  if (!store) return

  for (const key of keys) {
    persistedKeys.add(key)
    const storageKey = PERSIST_PREFIX + key
    const raw = store.getItem(storageKey)
    if (!raw) continue

    try {
      const entry = JSON.parse(raw) as PersistedEntry
      const fresh =
        entry.version === PERSIST_VERSION && Date.now() - entry.savedAt <= PERSIST_MAX_AGE_MS
      if (!fresh) {
        store.removeItem(storageKey)
        continue
      }
      cache.set(key, { status: 'success', data: entry.data })
      notify(key)
    } catch {
      store.removeItem(storageKey)
    }
  }
}

export function peekResource(key: string): ResourceEntry | undefined {
  return cache.get(key)
}

export function subscribeResource(key: string, onChange: () => void) {
  let group = listeners.get(key)
  if (!group) {
    group = new Set()
    listeners.set(key, group)
  }
  group.add(onChange)
  return () => {
    group?.delete(onChange)
    if (group && group.size === 0) {
      listeners.delete(key)
      abortUnwatched(key)
    }
  }
}

/** Nobody is left to render this key, so stop paying for the request. */
function abortUnwatched(key: string) {
  const entry = inflight.get(key)
  if (!entry || entry.keepAlive) return
  inflight.delete(key)
  entry.controller.abort()
}

function notify(key: string) {
  listeners.get(key)?.forEach((fn) => fn())
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Unable to load this page right now.'
}

function payloadEqual(a: unknown, b: unknown) {
  if (a === b) return true
  try {
    return JSON.stringify(a) === JSON.stringify(b)
  } catch {
    return false
  }
}

/** Fills a key from a bulk payload so dependent pages render without their own request. */
export function seedResource(key: string, data: unknown) {
  cache.set(key, { status: 'success', data })
  notify(key)
}

/** Only retires the entry this request owns, so a restart is never clobbered. */
function clearInflight(key: string, controller: AbortController) {
  if (inflight.get(key)?.controller === controller) inflight.delete(key)
}

export function loadResource<T>(
  key: string,
  loader: (signal: AbortSignal) => Promise<T>,
  options: { revalidate?: boolean; keepAlive?: boolean } = {},
): Promise<T> {
  const pending = inflight.get(key)
  if (pending) {
    if (options.keepAlive) pending.keepAlive = true
    return pending.promise as Promise<T>
  }

  const cached = cache.get(key)
  if (cached?.status === 'success' && options.revalidate === false) {
    return Promise.resolve(cached.data as T)
  }

  const controller = new AbortController()
  const promise = loader(controller.signal)
    .then((data) => {
      clearInflight(key, controller)
      const previous = cache.get(key)
      if (previous?.status === 'success' && payloadEqual(previous.data, data)) {
        return previous.data as T
      }
      cache.set(key, { status: 'success', data })
      persist(key, data)
      notify(key)
      return data
    })
    .catch((err: unknown) => {
      clearInflight(key, controller)
      // An abort means the page moved on, not that the source is broken.
      if (!controller.signal.aborted) {
        const previous = cache.get(key)
        if (previous?.status !== 'success') {
          cache.set(key, {
            status: 'error',
            error: errorMessage(err),
            notConfigured: isApiNotConfigured(err),
          })
          notify(key)
        }
      }
      throw err
    })

  inflight.set(key, { promise, controller, keepAlive: options.keepAlive ?? false })
  return promise as Promise<T>
}
