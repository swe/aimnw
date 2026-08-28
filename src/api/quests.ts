import { apiGet, requireEnv } from './client'
import type { QuestsResponse } from '@/types'

function base() {
  return requireEnv(import.meta.env.API_QUESTS, 'API_QUESTS')
}

export function getQuests(signal?: AbortSignal) {
  return apiGet<QuestsResponse>(base(), '', { signal })
}

export function isCountriesQuest(title: string) {
  return /every country/i.test(title)
}
