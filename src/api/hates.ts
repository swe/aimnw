import { apiGet, requireEnv } from './client'
import type { HateCategory, HateEntry, HatesResponse } from '@/types'

function base() {
  return requireEnv(import.meta.env.API_HATES, 'API_HATES')
}

export function getHates(signal?: AbortSignal) {
  return apiGet<HatesResponse>(base(), '', { signal })
}

/** Flat preview rows: item text + parent category as the verdict label. */
export function flattenHateItems(
  categories: readonly HateCategory[],
): Array<{ id: string; title: string; label: string }> {
  const rows: Array<{ id: string; title: string; label: string }> = []

  for (const category of categories) {
    if (!category.actual) continue
    for (const item of category.items) {
      if (!item.actual) continue
      rows.push({
        id: item.id,
        title: item.text,
        label: category.title,
      })
    }
  }

  return rows
}

/** Random sample of hate items for home spotlight. */
export function pickRandomHatePreview(
  categories: readonly HateCategory[],
  count = 10,
): Array<{ id: string; title: string; label: string }> {
  const pool = flattenHateItems(categories)
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, count)
}

export function activeHateCategories(categories: readonly HateCategory[]): HateCategory[] {
  return categories
    .filter((category) => category.actual)
    .map((category) => ({
      ...category,
      items: category.items.filter((item: HateEntry) => item.actual),
    }))
    .filter((category) => category.items.length > 0)
}
