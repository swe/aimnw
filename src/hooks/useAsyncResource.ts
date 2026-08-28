import { useEffect, useRef, useState } from 'react'
import {
  loadResource,
  peekResource,
  subscribeResource,
  type ResourceEntry,
} from '@/lib/resourceCache'

type AsyncState<T> =
  | { status: 'loading'; data: null; error: null }
  | { status: 'success'; data: T; error: null }
  | { status: 'error'; data: null; error: string; notConfigured: boolean }

function toState<T>(entry: ResourceEntry | undefined): AsyncState<T> {
  if (!entry) return { status: 'loading', data: null, error: null }
  if (entry.status === 'success') {
    return { status: 'success', data: entry.data as T, error: null }
  }
  return {
    status: 'error',
    data: null,
    error: entry.error,
    notConfigured: entry.notConfigured,
  }
}

function statesEqual<T>(a: AsyncState<T>, b: AsyncState<T>) {
  if (a.status !== b.status) return false
  if (a.status === 'loading') return true
  if (a.status === 'success') return a.data === b.data
  return a.error === b.error && a.notConfigured === b.notConfigured
}

export function useAsyncResource<T>(
  key: string,
  loader: (signal: AbortSignal) => Promise<T>,
  options: { refreshOnFocus?: boolean } = {},
) {
  const loaderRef = useRef(loader)
  loaderRef.current = loader
  const { refreshOnFocus = false } = options
  const [state, setState] = useState<AsyncState<T>>(() => toState(peekResource(key)))

  useEffect(() => {
    const sync = () => {
      const next = toState<T>(peekResource(key))
      setState((prev) => (statesEqual(prev, next) ? prev : next))
    }

    sync()
    const unsubscribe = subscribeResource(key, sync)

    loadResource(key, (signal) => loaderRef.current(signal)).catch(() => {
      /* cache keeps the last good payload */
    })

    return unsubscribe
  }, [key])

  useEffect(() => {
    if (!refreshOnFocus) return

    const bump = () => {
      if (document.visibilityState === 'hidden') return
      loadResource(key, (signal) => loaderRef.current(signal)).catch(() => {})
    }

    window.addEventListener('focus', bump)
    document.addEventListener('visibilitychange', bump)
    return () => {
      window.removeEventListener('focus', bump)
      document.removeEventListener('visibilitychange', bump)
    }
  }, [refreshOnFocus, key])

  return state
}
