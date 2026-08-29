import type { FieldNoteBlock } from '@/content/fieldNotes'

export type DrinkType = 'coffee' | 'wine' | 'cocktail' | 'non_alcoholic' | 'spirit' | string

export type DrinkIngredient = {
  name: string
  amount: number | null
  unit: string | null
  optional?: boolean
}

export type DrinkPourStage = {
  waterMl: number
  purpose: string
}

export type DrinkTempRange = {
  min: number
  max: number
}

export type CoffeeDetails = {
  origin?: { country?: string | null; region?: string | null } | null
  process?: string | null
  roastLevel?: string | null
  brewMethod?: string | null
  coffeeDoseGrams?: number | null
  waterVolumeMl?: number | null
  waterTemperatureC?: number | null
  grindSizeMicrons?: number | null
  pourStages?: DrinkPourStage[] | null
  preparation?: string | null
}

export type CocktailDetails = {
  style?: string | null
  ingredients?: DrinkIngredient[] | null
  garnish?: string[] | null
  ice?: boolean | string | null
  glassware?: string | null
  preparation?: string | null
}

export type WineDetails = {
  style?: string | null
  country?: string | null
  region?: string | null
  subregion?: string | null
  appellation?: string | null
  classification?: string | null
  producer?: string | null
  cuvee?: string | null
  vintage?: number | null
  grapeVarieties?: string[] | null
  preferredVintages?: number[] | null
  servingTemperatureC?: DrinkTempRange | null
  ice?: boolean | null
  iceCubes?: number | null
  preparation?: string | null
  decanting?: string | null
}

export type SpiritDetails = {
  category?: string | null
  brand?: string | null
  country?: string | null
  region?: string | null
  ageYears?: number | null
  servingStyle?: string | null
  ice?: boolean | null
  iceCubes?: number | null
  preparation?: string | null
}

export type NonAlcoholicDetails = {
  category?: string | null
  brand?: string | null
  flavor?: string | null
  servingTemperature?: string | null
  ice?: boolean | null
  garnish?: string[] | null
  preparation?: string | null
}

export type DrinkDetails =
  | CoffeeDetails
  | CocktailDetails
  | WineDetails
  | SpiritDetails
  | NonAlcoholicDetails

export type DrinkItem = {
  name: string
  drinkType: DrinkType
  personalImpression: string | null
  isFavorite: boolean
  imageUrl: string | null
  details: DrinkDetails
}

export type LibraryItem = {
  id: string
  title: string
  author: string
  category: string
  year: number
  rating: number
  cover_url: string | null
  finished_at: string | null
  status: string
  is_finished: boolean
  created_at: string
  updated_at: string
  description: string | null
}

/** Discogs-shaped vinyl entry. Cover comes from Discogs later. */
export type VinylRecord = {
  id: string
  title: string
  artist: string
  coverUrl: string | null
  /** Discogs (or other) release URL. */
  url: string
}

export type GoalItem = {
  id: string
  title: string
  description: string
  image_url: string
  finished: boolean
  created_at: string
  updated_at: string
}

export type GoalsResponse = {
  year: number
  goals: GoalItem[]
}

export type QuestItem = {
  id: string
  title: string
  description: string | null
  image: string | null
  createdAt: string
  achievedAt: string | null
}

export type QuestsResponse = {
  sideQuests: QuestItem[]
}

export type MapCountry = {
  id: string
  countryCode: string
  notes: string
  createdAt: string
  updatedAt: string
  visitedAt: string
}

export type MapCity = {
  id: string
  name: string
  latitude: number
  longitude: number
  countryId: string
  notes: string
  createdAt: string
  updatedAt: string
  visitedAt: string
}

export type MapGuide = {
  id: string
  title: string
  type: string
  body: string
  cityId: string
  countryId: string
  createdAt: string
  updatedAt: string
  foodSpots?: unknown[]
}

export type MapPayload = {
  cities: MapCity[]
  countries: MapCountry[]
  guides: MapGuide[]
  updatedAt: string
  version: number
}

/** Normalized place for map / whoami / home preview. */
export type PlaceItem = {
  id: string
  name: string
  latitude: number
  longitude: number
  country: string
  countryCode: string
  /** Present when this city has at least one guide. */
  guideId: string | null
}

export type GearItem = {
  slug: string
  title: string
  summary?: string
  category?: string
  link?: string
  image?: string
  body?: FieldNoteBlock[]
}

export type HateEntry = {
  id: string
  text: string
  actual: boolean
  createdAt: string
}

export type HateCategory = {
  id: string
  title: string
  actual: boolean
  createdAt: string
  items: HateEntry[]
}

export type HatesResponse = {
  version: number
  categories: HateCategory[]
}

export type TrainingActivityKind =
  | 'cycling'
  | 'running'
  | 'swimming'
  | 'sauna'
  | 'cold_plunge'
  | 'hiking'
  | 'soccer'
  | 'bouldering'
  | 'strength_training'

export type TrainingHrZones = {
  z1Sec: number
  z2Sec: number
  z3Sec: number
  z4Sec: number
  z5Sec: number
}

export type TrainingActivityMetrics = {
  caloriesBurnt?: number
  avgHrBpm?: number
  maxHrBpm?: number
  hrZones?: TrainingHrZones
}

export type TrainingActivityDetail = {
  distanceM?: number
  paceSecPerKm?: number
  paceSecPer100m?: number
  speedKmH?: number
  elevationGainM?: number
  hasGps?: boolean
  outdoor?: boolean
}

export type TrainingActivity = {
  id: string
  kind: TrainingActivityKind
  title: string
  date: string
  startedAt: string
  endedAt: string
  durationSec: number
  metrics: TrainingActivityMetrics
  detail: TrainingActivityDetail
  source: string
  externalId: string | null
  notes: string | null
  isPublic: boolean
  createdAt: string
  imageAssetId: string | null
}

export type TrainingSleep = {
  id: string
  date: string
  bedtime: string
  wakeTime: string
  duration: {
    totalMin: number
    deepMin: number
    remMin: number
    coreMin: number
    awakeMin: number
  }
  qualityScore: number | null
  source: string
  notes: string | null
  isPublic: boolean
  createdAt: string
}

export type TrainingUser = {
  id: string
  name: string | null
  dateOfBirth: string | null
  sex: string | null
  heightCm: number | null
  targets: {
    weight: number | null
    hrv: number | null
    vo2: number | null
    bodyFat: number | null
    ffmi: number | null
  }
  avatarAssetId: string | null
  createdAt: string | null
}

export type TrainingPayload = {
  user: TrainingUser
  activities: TrainingActivity[]
  sleep: TrainingSleep[]
}

/** Apple Health–shaped activity row (matches Activity table). */
export type HealthActivity = {
  id: number
  date: string
  activity_type: string
  started_at: string
  ended_at: string
  duration_sec: number
  distance_m: number | null
  pace_sec_per_unit: number | null
  pace_unit: string | null
  speed_km_h: number | null
  elevation_gain_m: number | null
  calories_burnt: number | null
  avg_hr_bpm: number | null
  max_hr_bpm: number | null
  hr_zone_1_sec: number
  hr_zone_2_sec: number
  hr_zone_3_sec: number
  hr_zone_4_sec: number
  hr_zone_5_sec: number
  external_id: string | null
  source: string
  notes: string | null
  is_public: boolean
  created_at: string
  user_id: number
  image_asset_id: number | null
}

/** Apple Health–shaped sleep row (matches Sleep table). */
export type HealthSleep = {
  id: number
  user_id: number
  created_at: string
  date: string
  bedtime: string
  wake_time: string
  total_sleep_min: number
  deep_sleep_min: number
  rem_sleep_min: number
  core_sleep_min: number
  awake_min: number
  sleep_quality_score: number | null
  source: string
  notes: string | null
  is_public: boolean
}

/** Daily recovery / fitness metrics (HRV, VO₂, fitness age) when the training feed or Oura includes them. */
export type HealthBiometricDay = {
  date: string
  hrvMs: number | null
  vo2Max: number | null
  fitnessAge: number | null
}

export type HealthPayload = {
  activities: HealthActivity[]
  sleep: HealthSleep[]
  biometrics: HealthBiometricDay[]
}

export type HevyPeriodStats = {
  workouts: number
  durationSec: number
  volumeKg: number
  sets: number
}

export type HevyWorkoutExercise = {
  title: string
  templateId: string | null
  sets: number
  volumeKg: number
}

export type HevyWorkout = {
  id: string
  title: string
  startTime: string
  endTime: string
  durationSec: number
  sets: number
  volumeKg: number
  exercises: HevyWorkoutExercise[]
}

export type HevyBodyMeasurement = {
  date: string
  weightKg: number | null
  leanMassKg: number | null
  fatPercent: number | null
  waist: number | null
  hips: number | null
  chestCm: number | null
}

export type HevyWeeklyBucket = HevyPeriodStats & {
  weekStart: string
  topExercises: { title: string; volumeKg: number }[]
}

export type HevySummary = {
  fetchedAt: string
  year: number
  signals: {
    week: HevyPeriodStats
    year: HevyPeriodStats
  }
  trends: {
    last4Weeks: HevyPeriodStats
    previous4Weeks: HevyPeriodStats
  }
  heatmap: { date: string; count: number }[]
  weekly: HevyWeeklyBucket[]
  workouts: HevyWorkout[]
  bodyMeasurements: HevyBodyMeasurement[]
}

export type SportHrWeek = {
  weekStart: string
  zones: [number, number, number, number, number]
  exerciseVolumeKg: number
  activityCount: number
  avgHrBpm: number | null
}

export type SportWeekDetail = {
  weekStart: string
  workouts: HevyWorkout[]
  activities: HealthActivity[]
  sleep: HealthSleep[]
  hevy: HevyPeriodStats
  hrZones: [number, number, number, number, number]
  avgHrBpm: number | null
  calories: number
  sleepAvgMin: number | null
  sleepQualityAvg: number | null
}

export type SportPageData = {
  hevy: HevySummary
  health: HealthPayload
  hrWeeks: SportHrWeek[]
  weekOptions: string[]
}

export type SportKpiAccent =
  | 'cardio'
  | 'hrv'
  | 'sleep'
  | 'vo2'
  | 'weight'
  | 'bodyFat'
  | 'ffmi'
  | 'load'
  | 'gym'
  | 'trophy'

export type SportKpiTile = {
  id: string
  label: string
  value: string
  /** Short unit beside the value (ms, h, kg, %, yrs). Omit for VO₂ and load strings. */
  unit?: string
  /** Optional target shown below the current value. */
  goal?: string
  /** Label before goal (default: Target). Cardio Age uses "Age". */
  goalLabel?: string
  /** Prefix before goal value, e.g. ≥ for HRV. */
  goalPrefix?: string
  delta: string
  /** Unit shown in the trend pill (ms, h, kg, %). */
  deltaUnit?: string
  /** Raw numeric direction for the trend arrow. */
  direction: 'up' | 'down' | 'flat'
  /** Favorable/unfavorable coloring for the week-over-week trend. */
  tone: 'up' | 'down' | 'flat'
  /** Optional coloring for the current value vs goal/benchmark. */
  valueStatus?: 'good' | 'bad' | 'neutral'
  /** When the current value was measured (sparse metrics like VO₂). */
  asOf?: string
  showDelta?: boolean
  hint?: string
  accent: SportKpiAccent
  /** Recent values for the bottom sparkline. */
  sparkline?: number[]
  /** Numeric goal or series average rendered as a dashed line on the sparkline. */
  goalLine?: number
  /** Cardio age comparison badge. */
  badge?: string
  /** Secondary line under the value (e.g. "This week"). */
  caption?: string
  /** Replaces metric layout when there is nothing to show yet. */
  emptyMessage?: string
}

export type SportHeatDay = {
  date: string
  level: number
  count: number
  summary: string
  durationMin: number
  distanceKm: number | null
  calories: number | null
  sessions: SportWeekSession[]
}

export type SportTrendTopic = 'load' | 'running' | 'recovery'

export type SportTrendRow = {
  id: string
  label: string
  topic: SportTrendTopic
  currentLabel: string
  previousLabel: string
  pctChange: number
  /** Raw numeric direction for the trend arrow. */
  direction: 'up' | 'down' | 'flat'
  /** Favorable/unfavorable coloring (inverted for lower-is-better metrics). */
  tone: 'up' | 'down' | 'flat'
}

export type SportZoneWeek = {
  weekStart: string
  zones: [number, number, number, number, number]
  percents: [number, number, number, number, number]
  totalSec: number
}

export type SportZoneYearSummary = {
  year: number
  previousYear: number
  percents: [number, number, number, number, number]
  /** Percentage-point change vs previous year (current − previous). */
  deltas: [number, number, number, number, number]
  hasPreviousYear: boolean
}

export type SportLongRunWeek = {
  weekStart: string
  km: number
}

export type SportActivityKind =
  | 'cycling'
  | 'running'
  | 'swimming'
  | 'sauna'
  | 'gym'
  | 'cold_plunge'
  | 'hiking'
  | 'soccer'
  | 'bouldering'
  | 'contrast'

export type SportHrZoneSeconds = [number, number, number, number, number]

export type SportRouteCoordinate = {
  lat: number
  lon: number
}

export type SportRouteMap = {
  /** SVG path `d` in a 320×140 viewBox (fallback when MapKit is unavailable). */
  path: string
  /** Optional place label under the map. */
  label: string | null
  /** Where the geometry came from — Garmin / GPX once wired. */
  source: 'garmin' | 'gpx'
  garminActivityId?: string | null
  /** WGS84 track for Apple MapKit polyline (or GPX import). */
  coordinates: SportRouteCoordinate[] | null
}

export type SportGymDetail = {
  kind: 'gym'
  volumeKg: number
  sets: number
  exerciseCount: number
  prs: number
  avgHr: number | null
  maxHr: number | null
  zones: SportHrZoneSeconds | null
  calories: number | null
}

export type SportRunningDetail = {
  kind: 'running'
  distanceKm: number
  paceSecPerKm: number | null
  elevationM: number | null
  avgHr: number | null
  maxHr: number | null
  zones: SportHrZoneSeconds | null
  calories: number | null
  map: SportRouteMap | null
  /** Lazy-loaded GPX under `public/gpx` when map geometry is attached manually. */
  gpxPath?: string | null
  mapLabel?: string | null
  garminActivityId?: string | null
}

export type SportCyclingDetail = {
  kind: 'cycling'
  distanceKm: number
  speedKmH: number | null
  elevationM: number | null
  avgHr: number | null
  maxHr: number | null
  zones: SportHrZoneSeconds | null
  calories: number | null
  map: SportRouteMap | null
  garminActivityId?: string | null
}

export type SportSwimmingDetail = {
  kind: 'swimming'
  distanceKm: number
  paceSecPer100m: number | null
  avgHr: number | null
  maxHr: number | null
  zones: SportHrZoneSeconds | null
  calories: number | null
  outdoor: boolean
  map: SportRouteMap | null
  garminActivityId?: string | null
}

export type SportHikingDetail = {
  kind: 'hiking'
  distanceKm: number
  elevationM: number
  avgHr: number | null
  maxHr: number | null
  zones: SportHrZoneSeconds | null
  calories: number | null
  /** Average speed in km/h when computable from the track. */
  avgSpeedKmH: number | null
  map: SportRouteMap | null
  garminActivityId?: string | null
}

export type SportSoccerPitchSpot = {
  /** 0–100 across the pitch (own goal left → attack right). */
  x: number
  /** 0–100 down the pitch (left wing near 0 when attacking right). */
  y: number
  /** Blob radius as % of pitch width. */
  r: number
  /** 0–1 relative occupancy. */
  intensity: number
  label?: string
}

export type SportSoccerPitchHeat = {
  pitchSrc: string
  caption?: string | null
  spots: SportSoccerPitchSpot[]
}

export type SportSoccerDetail = {
  kind: 'soccer'
  avgHr: number | null
  maxHr: number | null
  zones: SportHrZoneSeconds | null
  calories: number | null
  map: SportRouteMap | null
  garminActivityId?: string | null
  pitchHeat?: SportSoccerPitchHeat | null
}

export type SportBoulderingDetail = {
  kind: 'bouldering'
  avgHr: number | null
  maxHr: number | null
  calories: number | null
  maxGrade: string | null
  sends: number | null
  notes: string | null
  zones: SportHrZoneSeconds | null
}

export type SportSaunaDetail = {
  kind: 'sauna'
  avgHr: number | null
  maxHr: number | null
  notes: string | null
}

export type SportColdPlungeDetail = {
  kind: 'cold_plunge'
  notes: string | null
}

/** Same-day sauna + cold plunge shown as one session. */
export type SportContrastDetail = {
  kind: 'contrast'
  saunaMin: number
  plungeMin: number
  avgHr: number | null
  maxHr: number | null
  notes: string | null
}

export type SportSessionDetail =
  | SportGymDetail
  | SportRunningDetail
  | SportCyclingDetail
  | SportSwimmingDetail
  | SportHikingDetail
  | SportSoccerDetail
  | SportBoulderingDetail
  | SportSaunaDetail
  | SportColdPlungeDetail
  | SportContrastDetail

export type SportWeekSession = {
  id: string
  kind: SportActivityKind
  title: string
  date: string
  /** ISO start time when known (Hevy / training feed). */
  startedAt: string | null
  durationMin: number
  hrZone: 1 | 2 | 3 | 4 | 5 | null
  detail: SportSessionDetail
}

export type SportWeeklyMix = {
  kind: SportActivityKind
  label: string
  sessions: number
  percent: number
}

export type SportWeeklyProgress = {
  weekStart: string
  rangeLabel: string
  weekNumber: number
  sessions: number
  /** Hours vs previous week (pct change). Independent of bar fill. */
  durationDeltaPct: number
  durationMin: number
  /** Bar fill: this week's hours as % of the busiest week in the list (max = 100). */
  barFillPct: number
  distanceKm: number | null
  elevationM: number | null
  avgHr: number | null
  calories: number | null
  mix: SportWeeklyMix[]
  items: SportWeekSession[]
}

export type SportBodySeries = {
  id: string
  label: string
  value: string
  latest: number | null
  delta: number
  direction: 'up' | 'down' | 'flat'
  tone: 'good' | 'bad' | 'flat'
  kpiTone: 'up' | 'down' | 'flat'
  values: number[]
  goalLine?: number
  empty: boolean
}

/**
 * Oura and Garmin are optional: the hub still builds from Hevy alone, but
 * recovery/sleep or maps/HR zones go missing, so the page has to say so.
 */
export type SportSourceStatus =
  | { ok: true }
  | { ok: false; message: string }

/**
 * Only what the page renders. The hub is cached in sessionStorage, so anything
 * carried here is parsed again on every reload before the first paint.
 */
export type SportHubData = {
  year: number
  ouraStatus: SportSourceStatus
  garminStatus: SportSourceStatus
  kpis: SportKpiTile[]
  heatmap: SportHeatDay[]
  trends: SportTrendRow[]
  zoneWeeks: SportZoneWeek[]
  zoneYearSummary: SportZoneYearSummary
  longRuns: SportLongRunWeek[]
  weekly: SportWeeklyProgress[]
  bodySeries: SportBodySeries[]
  goals: {
    weightKg: number
    vo2Max: number
    ffmi: number
    hrvMs: number
    bodyFatPercent: number
  }
}
