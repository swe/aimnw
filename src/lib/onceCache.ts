/** In-flight + resolved cache so a key is loaded once. */
export function createOnceCache<T>() {
  const cache = new Map<string, T>()
  const inflight = new Map<string, Promise<T | null>>()

  return {
    peek(key: string): T | null {
      return cache.get(key) ?? null
    },
    get(key: string, loader: () => Promise<T | null>): Promise<T | null> {
      const cached = cache.get(key)
      if (cached) return Promise.resolve(cached)

      const pending = inflight.get(key)
      if (pending) return pending

      const request = loader()
        .then((value) => {
          if (value) cache.set(key, value)
          return value
        })
        .finally(() => {
          inflight.delete(key)
        })

      inflight.set(key, request)
      return request
    },
  }
}
