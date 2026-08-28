import { proxyGet } from './client'
import type { HevySummary } from '@/types'

export function getHevySummary(signal?: AbortSignal): Promise<HevySummary> {
  return proxyGet<HevySummary>('/api/hevy/summary', { signal })
}
