import { ApiError, apiGet, requireEnv } from './client'
import { peekResource } from '@/lib/resourceCache'
import type { DrinkItem } from '@/types'
import { slugify } from '@/lib/format'

function base() {
  return requireEnv(import.meta.env.API_DRINKS, 'API_DRINKS')
}

export function getDrinks(signal?: AbortSignal) {
  return apiGet<DrinkItem[]>(base(), '', { signal })
}

export async function getDrink(slug: string, signal?: AbortSignal) {
  const cached = peekResource('drink')
  const drinks =
    cached?.status === 'success' ? (cached.data as DrinkItem[]) : await getDrinks(signal)
  const match = drinks.find((drink) => slugify(drink.name) === slug)
  if (!match) {
    throw new ApiError(`Drink not found: ${slug}`, 404)
  }
  return match
}
