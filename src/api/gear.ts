import { joplinGet } from './joplin'
import { peekResource, seedResource } from '@/lib/resourceCache'
import type { GearItem } from '@/types'

type UseResponse = {
  items: GearItem[]
}

export function gearItemKey(slug: string) {
  return `use-item:${slug}`
}

/** The catalog payload carries every body, so each item page is seeded from this one call. */
export async function getGear(signal?: AbortSignal): Promise<GearItem[]> {
  const payload = await joplinGet<UseResponse>('/api/joplin/use', signal)
  for (const item of payload.items) {
    if (item.body) seedResource(gearItemKey(item.slug), item)
  }
  return payload.items
}

export function getGearItem(slug: string, signal?: AbortSignal): Promise<GearItem> {
  const seeded = peekResource(gearItemKey(slug))
  if (seeded?.status === 'success') return Promise.resolve(seeded.data as GearItem)
  return joplinGet<GearItem>(`/api/joplin/use/${encodeURIComponent(slug)}`, signal)
}
