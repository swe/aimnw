export type SportGoals = {
  weightKg: number
  vo2Max: number
  ffmi: number
  hrvMs: number
  bodyFatPercent: number
}

/** My own targets. No API serves these — they are edited here on purpose. */
export const SPORT_GOALS: SportGoals = {
  weightKg: 77,
  vo2Max: 52,
  ffmi: 23.8,
  hrvMs: 60,
  bodyFatPercent: 7.3,
}

/** Used for FFMI; no API serves it either. */
export const SPORT_HEIGHT_CM = 182
