import { buildBodyCompositionSeries } from './body'
import { SPORT_GOALS, SPORT_HEIGHT_CM } from './goals'
import { buildHeatmap } from './heatmap'
import { buildKpis } from './kpis'
import { yearHubSessions } from './sessions'
import { buildWeekStarts, buildYearWeekStarts, zonedYear } from './time'
import { buildTrends } from './trends'
import { buildWeekly } from './weekly'
import { buildLongRuns, buildZoneWeeks, buildZoneYearSummary } from './zones'
import { getGarminWorkouts, type GarminWorkoutsSummary } from '@/api/garmin'
import { getHevySummary } from '@/api/hevy'
import { getOuraWorkouts, mergeOuraIntoTraining, type OuraWorkoutsSummary } from '@/api/oura'
import { activitiesToHealth, trainingToHealth } from '@/api/training'
import type {
  HevyBodyMeasurement,
  SportHubData,
  SportSourceStatus,
  TrainingPayload,
} from '@/types'

export { pickRecentSportSessions } from './weekly'

type OptionalSource<T> = {
  data: T | null
  status: SportSourceStatus
}

/**
 * Hevy alone is enough to render the hub, so an Oura/Garmin outage degrades
 * instead of failing — but the reason travels with the data so the page can show it.
 */
async function fetchOptional<T>(
  loader: (signal?: AbortSignal) => Promise<T>,
  fallbackMessage: string,
  signal?: AbortSignal,
): Promise<OptionalSource<T>> {
  try {
    return { data: await loader(signal), status: { ok: true } }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    return {
      data: null,
      status: {
        ok: false,
        message: error instanceof Error ? error.message : fallbackMessage,
      },
    }
  }
}

function fetchOura(signal?: AbortSignal): Promise<OptionalSource<OuraWorkoutsSummary>> {
  return fetchOptional(getOuraWorkouts, 'Oura data could not be loaded.', signal)
}

function fetchGarmin(signal?: AbortSignal): Promise<OptionalSource<GarminWorkoutsSummary>> {
  return fetchOptional(getGarminWorkouts, 'Garmin data could not be loaded.', signal)
}

/** Oura has no user profile, so the parts it cannot serve come from `goals`. */
function keepLongestSoccerOnDates(
  activities: TrainingPayload['activities'],
  dates: ReadonlySet<string>,
): TrainingPayload['activities'] {
  const drop = new Set<string>()
  for (const date of dates) {
    const soccer = activities.filter((row) => row.kind === 'soccer' && row.date === date)
    if (soccer.length <= 1) continue
    let keep = soccer[0]
    for (const row of soccer) {
      if (row.durationSec > keep.durationSec) keep = row
    }
    for (const row of soccer) {
      if (row.id !== keep.id) drop.add(row.id)
    }
  }
  return drop.size ? activities.filter((row) => !drop.has(row.id)) : activities
}

/** Garmin sometimes splits Aug 19 into a short + long soccer row; Oura adds the short again. */
const SOCCER_KEEP_LONGEST_DATES = new Set(['2026-08-19'])

function trainingFromSources(
  oura: OuraWorkoutsSummary | null,
  garmin: GarminWorkoutsSummary | null,
): TrainingPayload {
  const garminActivities = garmin?.activities ?? []
  const activities = keepLongestSoccerOnDates(
    mergeOuraIntoTraining({ activities: garminActivities }, oura?.activities ?? []),
    SOCCER_KEEP_LONGEST_DATES,
  )
  return {
    user: {
      id: 'sport',
      name: null,
      dateOfBirth: null,
      sex: null,
      heightCm: SPORT_HEIGHT_CM,
      targets: {
        weight: SPORT_GOALS.weightKg,
        hrv: SPORT_GOALS.hrvMs,
        vo2: SPORT_GOALS.vo2Max,
        bodyFat: SPORT_GOALS.bodyFatPercent,
        ffmi: SPORT_GOALS.ffmi,
      },
      avatarAssetId: null,
      createdAt: null,
    },
    activities,
    sleep: oura?.sleep ?? [],
  }
}

export async function getSportHub(signal?: AbortSignal): Promise<SportHubData> {
  const [hevyRaw, ouraResult, garminResult] = await Promise.all([
    getHevySummary(signal),
    fetchOura(signal),
    fetchGarmin(signal),
  ])
  const hevy = { ...hevyRaw, year: zonedYear(new Date()) }
  const oura = ouraResult.data
  const garmin = garminResult.data
  const training = trainingFromSources(oura, garmin)
  const biometrics = oura?.biometrics ?? []
  const chronologicalAge = oura?.chronologicalAge ?? null
  const mergedTrends = activitiesToHealth(
    training.activities,
    oura?.sleep ?? [],
    oura?.biometrics ?? [],
  )
  const health = trainingToHealth(training, biometrics)
  const hubSessions = yearHubSessions(hevy, training)
  const activitySessions = hubSessions.filter((session) => session.kind !== 'gym')
  const yearWeeksToDate = buildYearWeekStarts(hevy.year, { through: 'now' })
  const yearWeeksFull = buildYearWeekStarts(hevy.year, { through: 'year-end' })
  const currentWeek = yearWeeksToDate[yearWeeksToDate.length - 1] ?? buildWeekStarts(1)[0]
  const heightM = SPORT_HEIGHT_CM / 100
  const goals = { ...SPORT_GOALS }

  const bodySeries = buildBodyCompositionSeries(
    hevy.bodyMeasurements as HevyBodyMeasurement[],
    goals,
  )

  return {
    year: hevy.year,
    ouraStatus: ouraResult.status,
    garminStatus: garminResult.status,
    kpis: buildKpis(
      hevy,
      health.sleep,
      health.biometrics,
      currentWeek,
      goals,
      heightM,
      chronologicalAge,
      bodySeries,
    ),
    heatmap: buildHeatmap(hevy, health.activities, activitySessions),
    trends: buildTrends(
      hevy,
      mergedTrends.activities,
      mergedTrends.sleep,
      mergedTrends.biometrics,
    ),
    zoneWeeks: buildZoneWeeks(hubSessions, yearWeeksFull),
    zoneYearSummary: buildZoneYearSummary(hubSessions, hevy.year),
    longRuns: buildLongRuns(hubSessions, yearWeeksFull),
    weekly: buildWeekly(hubSessions, yearWeeksToDate),
    goals,
    bodySeries,
  }
}
