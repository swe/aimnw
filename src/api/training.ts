import type {
  HealthActivity,
  HealthPayload,
  HealthSleep,
  SportActivityKind,
  SportHrZoneSeconds,
  SportSessionDetail,
  SportWeekSession,
  TrainingActivity,
  TrainingActivityKind,
  TrainingPayload,
  TrainingSleep,
} from '@/types'

/** Stable numeric id so Health matching Sets still work. */
function numericId(value: string) {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash) || 1
}

function zonesOf(activity: TrainingActivity): SportHrZoneSeconds {
  const zones = activity.metrics?.hrZones
  return [
    zones?.z1Sec ?? 0,
    zones?.z2Sec ?? 0,
    zones?.z3Sec ?? 0,
    zones?.z4Sec ?? 0,
    zones?.z5Sec ?? 0,
  ]
}

function dominantZone(zones: SportHrZoneSeconds): 1 | 2 | 3 | 4 | 5 | null {
  const total = zones.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return null
  let bestIndex = 0
  let best = zones[0]
  for (let i = 1; i < zones.length; i += 1) {
    if (zones[i] > best) {
      best = zones[i]
      bestIndex = i
    }
  }
  return (bestIndex + 1) as 1 | 2 | 3 | 4 | 5
}

function activityTypeOf(kind: TrainingActivityKind) {
  if (kind === 'strength_training') return 'Traditional Strength Training'
  if (kind === 'running') return 'Running'
  if (kind === 'cycling') return 'Cycling'
  if (kind === 'swimming') return 'Swimming'
  if (kind === 'hiking') return 'Hiking'
  if (kind === 'soccer') return 'Football / Soccer'
  if (kind === 'bouldering') return 'Bouldering'
  if (kind === 'sauna') return 'Sauna'
  return 'Cold Plunge'
}

function toHealthActivity(activity: TrainingActivity): HealthActivity {
  const zones = zonesOf(activity)
  const distanceM = activity.detail?.distanceM ?? null
  return {
    id: numericId(activity.id),
    date: activity.date,
    activity_type: activityTypeOf(activity.kind),
    started_at: activity.startedAt,
    ended_at: activity.endedAt,
    duration_sec: activity.durationSec,
    distance_m: distanceM,
    pace_sec_per_unit: activity.detail?.paceSecPerKm ?? activity.detail?.paceSecPer100m ?? null,
    pace_unit: activity.detail?.paceSecPerKm != null ? 'km' : activity.detail?.paceSecPer100m != null ? '100m' : null,
    speed_km_h: activity.detail?.speedKmH ?? null,
    elevation_gain_m: activity.detail?.elevationGainM ?? null,
    calories_burnt: activity.metrics?.caloriesBurnt ?? null,
    avg_hr_bpm: activity.metrics?.avgHrBpm ?? null,
    max_hr_bpm: activity.metrics?.maxHrBpm ?? null,
    hr_zone_1_sec: zones[0],
    hr_zone_2_sec: zones[1],
    hr_zone_3_sec: zones[2],
    hr_zone_4_sec: zones[3],
    hr_zone_5_sec: zones[4],
    external_id: activity.externalId,
    source: activity.source,
    notes: activity.notes,
    is_public: activity.isPublic,
    created_at: activity.createdAt,
    user_id: 0,
    image_asset_id: null,
  }
}

function toHealthSleep(row: TrainingSleep): HealthSleep {
  return {
    id: numericId(row.id),
    user_id: 0,
    created_at: row.createdAt,
    date: row.date,
    bedtime: row.bedtime,
    wake_time: row.wakeTime,
    total_sleep_min: row.duration.totalMin,
    deep_sleep_min: row.duration.deepMin,
    rem_sleep_min: row.duration.remMin,
    core_sleep_min: row.duration.coreMin,
    awake_min: row.duration.awakeMin,
    sleep_quality_score: row.qualityScore,
    source: row.source,
    notes: row.notes,
    is_public: row.isPublic,
  }
}

export function trainingToHealth(
  payload: TrainingPayload,
  biometrics: HealthPayload['biometrics'] = [],
): HealthPayload {
  return {
    activities: payload.activities.map(toHealthActivity),
    sleep: payload.sleep.map(toHealthSleep),
    biometrics,
  }
}

/** Map Oura (or any TrainingActivity[]) rows into Health shape. */
export function activitiesToHealth(
  activities: TrainingActivity[],
  sleep: TrainingSleep[] = [],
  biometrics: HealthPayload['biometrics'] = [],
): HealthPayload {
  return {
    activities: activities.map(toHealthActivity),
    sleep: sleep.map(toHealthSleep),
    biometrics,
  }
}

function sessionKind(kind: Exclude<TrainingActivityKind, 'strength_training'>): SportActivityKind {
  return kind
}

function garminMapId(activity: TrainingActivity) {
  if (activity.source !== 'garmin' || !activity.detail?.hasGps || !activity.externalId) return null
  return activity.externalId
}

function sessionDetail(activity: TrainingActivity, zones: SportHrZoneSeconds): SportSessionDetail | null {
  const avgHr = activity.metrics?.avgHrBpm ?? null
  const maxHr = activity.metrics?.maxHrBpm ?? null
  const calories = activity.metrics?.caloriesBurnt ?? null
  const detail = activity.detail ?? {}
  const zoneTotal = zones.reduce((sum, value) => sum + value, 0)
  const zoneList = zoneTotal > 0 ? zones : null
  const distanceKm =
    detail.distanceM != null ? Math.round((detail.distanceM / 1000) * 10) / 10 : 0
  const garminActivityId = garminMapId(activity)

  if (activity.kind === 'running') {
    return {
      kind: 'running',
      distanceKm,
      paceSecPerKm: detail.paceSecPerKm ?? null,
      elevationM: detail.elevationGainM ?? null,
      avgHr,
      maxHr,
      zones: zoneList,
      calories,
      map: null,
      garminActivityId,
    }
  }
  if (activity.kind === 'cycling') {
    return {
      kind: 'cycling',
      distanceKm,
      speedKmH: detail.speedKmH ?? null,
      elevationM: detail.elevationGainM ?? null,
      avgHr,
      maxHr,
      zones: zoneList,
      calories,
      map: null,
      garminActivityId,
    }
  }
  if (activity.kind === 'swimming') {
    return {
      kind: 'swimming',
      distanceKm,
      paceSecPer100m: detail.paceSecPer100m ?? null,
      avgHr,
      maxHr,
      zones: zoneList,
      calories,
      outdoor: detail.outdoor ?? false,
      map: null,
      garminActivityId,
    }
  }
  if (activity.kind === 'hiking') {
    return {
      kind: 'hiking',
      distanceKm,
      elevationM: detail.elevationGainM ?? 0,
      avgHr,
      maxHr,
      zones: zoneList,
      calories,
      avgSpeedKmH: detail.speedKmH ?? null,
      map: null,
      garminActivityId,
    }
  }
  if (activity.kind === 'soccer') {
    return {
      kind: 'soccer',
      avgHr,
      maxHr,
      zones: zoneList,
      calories,
      map: null,
      garminActivityId,
    }
  }
  if (activity.kind === 'bouldering') {
    return {
      kind: 'bouldering',
      avgHr,
      maxHr,
      calories,
      maxGrade: null,
      sends: null,
      notes: activity.notes,
      zones: zoneList,
    }
  }
  if (activity.kind === 'sauna') {
    return {
      kind: 'sauna',
      avgHr,
      maxHr,
      notes: activity.notes,
    }
  }
  if (activity.kind === 'cold_plunge') {
    return {
      kind: 'cold_plunge',
      notes: activity.notes,
    }
  }
  return null
}

/** Non-gym sessions. Strength volume stays on Hevy; Health strength rows only supply HR. */
export function trainingToSessions(
  payload: TrainingPayload,
  year: number,
): SportWeekSession[] {
  const prefix = String(year)
  const sessions: SportWeekSession[] = []
  for (const activity of payload.activities) {
    if (activity.kind === 'strength_training') continue
    if (!activity.date.startsWith(prefix) && !activity.startedAt.startsWith(prefix)) continue
    const zones = zonesOf(activity)
    const detail = sessionDetail(activity, zones)
    if (!detail) continue
    sessions.push({
      id: `training-${activity.id}`,
      kind: sessionKind(activity.kind),
      title: activity.title,
      date: activity.date,
      startedAt: activity.startedAt,
      durationMin: Math.max(1, Math.round(activity.durationSec / 60)),
      hrZone: dominantZone(zones),
      detail,
    })
  }
  return sessions
}