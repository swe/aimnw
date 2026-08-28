import { proxyGet } from './client'
import type { VinylRecord } from '@/types'

export function getVinyl(signal?: AbortSignal): Promise<VinylRecord[]> {
  return proxyGet<VinylRecord[]>('/api/vinyl', { signal })
}
