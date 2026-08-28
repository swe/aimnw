import { apiGet, requireEnv } from './client'
import type { LibraryItem } from '@/types'

/**
 * API_LIBRARY is the finished-books list URL, e.g.
 * https://api.alleksy.com/books/finished
 */
function listUrl() {
  return requireEnv(import.meta.env.API_LIBRARY, 'API_LIBRARY').replace(/\/$/, '')
}

/** Parent collection root for book detail, e.g. https://api.alleksy.com/books */
function collectionRoot() {
  return listUrl().replace(/\/finished$/i, '')
}

/** Finished books from the configured API_LIBRARY URL. */
export function getLibrary(signal?: AbortSignal) {
  return apiGet<LibraryItem[]>(listUrl(), '', { signal })
}

export function getLibraryItem(id: string, signal?: AbortSignal) {
  return apiGet<LibraryItem>(collectionRoot(), `/${encodeURIComponent(id)}`, {
    signal,
  })
}
