import { apiGet, requireEnv } from './client'
import type { GoalsResponse } from '@/types'

function base() {
  return requireEnv(import.meta.env.API_GOALS, 'API_GOALS')
}

export function getGoals(signal?: AbortSignal) {
  return apiGet<GoalsResponse>(base(), '', { signal })
}
