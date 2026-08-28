const DEFAULT_TTL_MS = 60_000

/**
 * Shares one in-flight request and reuses its result until the TTL expires.
 * `ttlMs` may be a function so callers can resolve env-driven TTLs lazily, after
 * `.env` has been loaded.
 */
export function withTtlCache(loader, ttlMs = DEFAULT_TTL_MS) {
  /** @type {{ promise: Promise<any>; expiresAt: number } | null} */
  let entry = null

  return function load() {
    if (entry && entry.expiresAt > Date.now()) return entry.promise

    const promise = loader().catch((error) => {
      entry = null
      throw error
    })
    const ttl = typeof ttlMs === 'function' ? ttlMs() : ttlMs
    entry = { promise, expiresAt: Date.now() + ttl }
    return promise
  }
}

/** Reads a positive millisecond TTL from env, falling back to `fallbackMs`. */
export function ttlFromEnv(name, fallbackMs) {
  const raw = Number(process.env[name])
  return Number.isFinite(raw) && raw > 0 ? raw : fallbackMs
}
