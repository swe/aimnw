import { proxyGet } from './client'

/** Notes and gear both read Joplin notebooks through the same server proxy. */
export function joplinGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return proxyGet<T>(path, { signal, cache: 'no-store' })
}
