import {
  avg,
  deltaTone,
  directionOf,
  formatElev,
  formatKm,
  formatTrendVolumeKg,
  pctChange,
} from './metrics'
import {
  activitiesInRange,
  hevyInRange,
  isRun,
  isStrengthHealth,
  latestBiometric,
  matchGymHealth,
  medianBiometric,
  sleepInRange,
  summarizeHevy,
} from './sources'
import { addCalendarDays, addDays, buildWeekStarts, startOfIsoWeek, weekWindow } from './time'
import { formatDuration, formatPace } from '@/lib/sportFormat'
import type {
  HealthActivity,
  HealthBiometricDay,
  HealthSleep,
  HevySummary,
  HevyWorkout,
  SportTrendRow,
} from '@/types'

const TREND_WEEKS = 4
const TREND_STABLE_PCT = 5

function meanPaceSec(activities: HealthActivity[]) {
  const paces = activities
    .filter(isRun)
    .map((activity) => activity.pace_sec_per_unit)
    .filter((value): value is number => value != null && value > 0)
  return paces.length ? avg(paces) : 0
}

function meanBlendedHr(
  workouts: HevyWorkout[],
  cardioActivities: HealthActivity[],
  allActivities: HealthActivity[],
) {
  const gymHr = matchGymHealth(workouts, allActivities)
  const hrs = [
    ...cardioActivities
      .map((activity) => activity.avg_hr_bpm)
      .filter((value): value is number => value != null && value > 0),
    ...workouts
      .map((workout) => gymHr.get(workout.id)?.avg_hr_bpm)
      .filter((value): value is number => value != null && value > 0),
  ]
  return hrs.length ? Math.round(avg(hrs)) : 0
}

function meanSleepHours(sleep: HealthSleep[], startMs: number, endMs: number) {
  const rows = sleepInRange(sleep, startMs, endMs)
  if (!rows.length) return 0
  return rows.reduce((sum, row) => sum + row.total_sleep_min, 0) / rows.length / 60
}

/** Average of each week's max run distance (km) over a 4-week window. */
function avgLongestRunKm(activities: HealthActivity[], windowStart: Date) {
  const weeklyMaxes: number[] = []
  for (let i = 0; i < TREND_WEEKS; i++) {
    const start = addDays(windowStart, i * 7)
    const end = addDays(start, 7)
    const runs = activitiesInRange(activities, start.getTime(), end.getTime()).filter(isRun)
    const maxKm = runs.length
      ? Math.max(...runs.map((activity) => (activity.distance_m ?? 0) / 1000))
      : 0
    weeklyMaxes.push(maxKm)
  }
  return avg(weeklyMaxes)
}

export function buildTrends(
  hevy: HevySummary,
  activities: HealthActivity[],
  sleep: HealthSleep[],
  biometrics: HealthBiometricDay[],
): SportTrendRow[] {
  const now = new Date()
  const thisWeek = startOfIsoWeek(now)
  const last4Start = addDays(thisWeek, -21)
  const prev4Start = addDays(thisWeek, -49)
  const last4End = addDays(thisWeek, 7)
  const prev4End = last4Start
  const last4StartMs = last4Start.getTime()
  const prev4StartMs = prev4Start.getTime()
  const last4EndMs = last4End.getTime()
  const prev4EndMs = prev4End.getTime()

  const lastWorkouts = hevyInRange(hevy.workouts, last4StartMs, last4EndMs)
  const prevWorkouts = hevyInRange(hevy.workouts, prev4StartMs, prev4EndMs)
  const lastActs = activitiesInRange(activities, last4StartMs, last4EndMs).filter(
    (activity) => !isStrengthHealth(activity),
  )
  const prevActs = activitiesInRange(activities, prev4StartMs, prev4EndMs).filter(
    (activity) => !isStrengthHealth(activity),
  )

  const lastHevy = summarizeHevy(lastWorkouts)
  const prevHevy = summarizeHevy(prevWorkouts)

  const lastActDuration = lastActs.reduce((sum, activity) => sum + activity.duration_sec, 0)
  const prevActDuration = prevActs.reduce((sum, activity) => sum + activity.duration_sec, 0)
  const lastVolumeSec = (lastHevy.durationSec + lastActDuration) / TREND_WEEKS
  const prevVolumeSec = (prevHevy.durationSec + prevActDuration) / TREND_WEEKS
  const lastCardioSec = lastActDuration / TREND_WEEKS
  const prevCardioSec = prevActDuration / TREND_WEEKS

  const lastSessions = (lastHevy.workouts + lastActs.length) / TREND_WEEKS
  const prevSessions = (prevHevy.workouts + prevActs.length) / TREND_WEEKS
  const lastGymSessions = lastHevy.workouts / TREND_WEEKS
  const prevGymSessions = prevHevy.workouts / TREND_WEEKS

  const lastGymVolume = lastHevy.volumeKg / TREND_WEEKS
  const prevGymVolume = prevHevy.volumeKg / TREND_WEEKS
  const lastGymSets = lastHevy.sets / TREND_WEEKS
  const prevGymSets = prevHevy.sets / TREND_WEEKS

  const lastDistance =
    lastActs.reduce((sum, activity) => sum + (activity.distance_m ?? 0), 0) / 1000 / TREND_WEEKS
  const prevDistance =
    prevActs.reduce((sum, activity) => sum + (activity.distance_m ?? 0), 0) / 1000 / TREND_WEEKS
  const lastElev =
    lastActs.reduce((sum, activity) => sum + (activity.elevation_gain_m ?? 0), 0) / TREND_WEEKS
  const prevElev =
    prevActs.reduce((sum, activity) => sum + (activity.elevation_gain_m ?? 0), 0) / TREND_WEEKS
  const lastCalories =
    lastActs.reduce((sum, activity) => sum + (activity.calories_burnt ?? 0), 0) / TREND_WEEKS
  const prevCalories =
    prevActs.reduce((sum, activity) => sum + (activity.calories_burnt ?? 0), 0) / TREND_WEEKS

  const lastRunDistance =
    lastActs.filter(isRun).reduce((sum, activity) => sum + (activity.distance_m ?? 0), 0) /
    1000 /
    TREND_WEEKS
  const prevRunDistance =
    prevActs.filter(isRun).reduce((sum, activity) => sum + (activity.distance_m ?? 0), 0) /
    1000 /
    TREND_WEEKS

  const lastLongest = avgLongestRunKm(activities, last4Start)
  const prevLongest = avgLongestRunKm(activities, prev4Start)

  const lastPace = meanPaceSec(lastActs)
  const prevPace = meanPaceSec(prevActs)

  const lastSessionCount = lastHevy.workouts + lastActs.length
  const prevSessionCount = prevHevy.workouts + prevActs.length
  const lastAvgLen =
    lastSessionCount > 0 ? (lastHevy.durationSec + lastActDuration) / lastSessionCount : 0
  const prevAvgLen =
    prevSessionCount > 0 ? (prevHevy.durationSec + prevActDuration) / prevSessionCount : 0

  const lastHr = meanBlendedHr(lastWorkouts, lastActs, activities)
  const prevHr = meanBlendedHr(prevWorkouts, prevActs, activities)
  const lastSleep = meanSleepHours(sleep, last4StartMs, last4EndMs)
  const prevSleep = meanSleepHours(sleep, prev4StartMs, prev4EndMs)

  const thisWeekStart = buildWeekStarts(1, now)[0]
  const previousWeek = weekWindow(addCalendarDays(thisWeekStart, -7))
  const currentWeek = weekWindow(thisWeekStart)
  const lastHrv =
    latestBiometric(biometrics, (row) => row.hrvMs, { throughMs: currentWeek.endMs })?.value ?? 0
  const prevHrv =
    medianBiometric(
      biometrics,
      (row) => row.hrvMs,
      previousWeek.startMs,
      previousWeek.endMs,
    ) ?? 0

  type Draft = {
    id: string
    label: string
    topic: SportTrendRow['topic']
    current: number
    previous: number
    currentLabel: string
    previousLabel: string
    lowerIsBetter?: boolean
  }

  const drafts: Draft[] = [
    {
      id: 'weekly_volume',
      label: 'Weekly volume',
      topic: 'load',
      current: lastVolumeSec,
      previous: prevVolumeSec,
      currentLabel: formatDuration(lastVolumeSec),
      previousLabel: formatDuration(prevVolumeSec),
    },
    {
      id: 'sessions_week',
      label: 'Sessions / week',
      topic: 'load',
      current: lastSessions,
      previous: prevSessions,
      currentLabel: lastSessions.toFixed(1),
      previousLabel: prevSessions.toFixed(1),
    },
    {
      id: 'cardio_time_week',
      label: 'Cardio time / week',
      topic: 'load',
      current: lastCardioSec,
      previous: prevCardioSec,
      currentLabel: formatDuration(lastCardioSec),
      previousLabel: formatDuration(prevCardioSec),
    },
    {
      id: 'gym_sessions_week',
      label: 'Gym sessions / week',
      topic: 'load',
      current: lastGymSessions,
      previous: prevGymSessions,
      currentLabel: lastGymSessions.toFixed(1),
      previousLabel: prevGymSessions.toFixed(1),
    },
    {
      id: 'gym_volume_week',
      label: 'Gym volume / week',
      topic: 'load',
      current: lastGymVolume,
      previous: prevGymVolume,
      currentLabel: formatTrendVolumeKg(lastGymVolume),
      previousLabel: formatTrendVolumeKg(prevGymVolume),
    },
    {
      id: 'gym_sets_week',
      label: 'Gym sets / week',
      topic: 'load',
      current: lastGymSets,
      previous: prevGymSets,
      currentLabel: lastGymSets.toFixed(1),
      previousLabel: prevGymSets.toFixed(1),
    },
    {
      id: 'weekly_distance',
      label: 'Distance / week',
      topic: 'load',
      current: lastDistance,
      previous: prevDistance,
      currentLabel: formatKm(lastDistance),
      previousLabel: formatKm(prevDistance),
    },
    {
      id: 'weekly_elevation',
      label: 'Elevation / week',
      topic: 'load',
      current: lastElev,
      previous: prevElev,
      currentLabel: formatElev(lastElev),
      previousLabel: formatElev(prevElev),
    },
    {
      id: 'calories_week',
      label: 'Calories / week',
      topic: 'load',
      current: lastCalories,
      previous: prevCalories,
      currentLabel: Math.round(lastCalories).toLocaleString(),
      previousLabel: Math.round(prevCalories).toLocaleString(),
    },
    {
      id: 'run_distance_week',
      label: 'Run distance / week',
      topic: 'running',
      current: lastRunDistance,
      previous: prevRunDistance,
      currentLabel: formatKm(lastRunDistance),
      previousLabel: formatKm(prevRunDistance),
    },
    {
      id: 'longest_run_week',
      label: 'Longest run / week',
      topic: 'running',
      current: lastLongest,
      previous: prevLongest,
      currentLabel: formatKm(lastLongest),
      previousLabel: formatKm(prevLongest),
    },
    {
      id: 'running_pace',
      label: 'Running pace',
      topic: 'running',
      current: lastPace,
      previous: prevPace,
      currentLabel: formatPace(lastPace),
      previousLabel: formatPace(prevPace),
      lowerIsBetter: true,
    },
    {
      id: 'avg_sleep',
      label: 'Avg sleep',
      topic: 'recovery',
      current: lastSleep,
      previous: prevSleep,
      currentLabel: lastSleep ? `${lastSleep.toFixed(1)} h` : '—',
      previousLabel: prevSleep ? `${prevSleep.toFixed(1)} h` : '—',
    },
    {
      id: 'hrv',
      label: 'HRV',
      topic: 'recovery',
      current: lastHrv,
      previous: prevHrv,
      currentLabel: lastHrv ? `${Math.round(lastHrv)} ms` : '—',
      previousLabel: prevHrv ? `${Math.round(prevHrv)} ms` : '—',
    },
    {
      id: 'avg_session_length',
      label: 'Avg session length',
      topic: 'recovery',
      current: lastAvgLen,
      previous: prevAvgLen,
      currentLabel: formatDuration(lastAvgLen),
      previousLabel: formatDuration(prevAvgLen),
    },
    {
      id: 'avg_training_hr',
      label: 'Avg training HR',
      topic: 'recovery',
      current: lastHr,
      previous: prevHr,
      currentLabel: lastHr ? `${lastHr} bpm` : '—',
      previousLabel: prevHr ? `${prevHr} bpm` : '—',
      lowerIsBetter: true,
    },
  ]

  return drafts
    .filter((row) => row.current > 0 || row.previous > 0)
    .map((row) => {
      const change = pctChange(row.current, row.previous)
      const rawTone = deltaTone(change, row.lowerIsBetter)
      const tone = Math.abs(change) < TREND_STABLE_PCT ? ('flat' as const) : rawTone
      return {
        id: row.id,
        label: row.label,
        topic: row.topic,
        currentLabel: row.currentLabel,
        previousLabel: row.previousLabel,
        pctChange: change,
        direction: directionOf(change),
        tone,
      }
    })
}
