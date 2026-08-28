import {
  Bike,
  Dumbbell,
  Droplets,
  Flame,
  Footprints,
  Mountain,
  PersonStanding,
  ThermometerSnowflake,
  Volleyball,
  Waves,
  type LucideIcon,
} from 'lucide-react'
import type { SportActivityKind } from '@/types'

export const ACTIVITY_LABELS: Record<SportActivityKind, string> = {
  cycling: 'Cycling',
  running: 'Running',
  swimming: 'Swimming',
  sauna: 'Sauna',
  gym: 'Gym',
  cold_plunge: 'Cold plunge',
  hiking: 'Hiking',
  soccer: 'Football / Soccer',
  bouldering: 'Bouldering',
  contrast: 'Contrast',
}

/** Stable order for the section legend. Cold plunge alone is never listed — it merges into Contrast. */
export const ACTIVITY_LEGEND_ORDER: SportActivityKind[] = [
  'gym',
  'running',
  'cycling',
  'swimming',
  'hiking',
  'soccer',
  'bouldering',
  'contrast',
  'sauna',
]

export const ACTIVITY_ICONS: Record<SportActivityKind, LucideIcon> = {
  cycling: Bike,
  running: Footprints,
  swimming: Waves,
  sauna: Flame,
  gym: Dumbbell,
  cold_plunge: Droplets,
  hiking: Mountain,
  soccer: Volleyball,
  bouldering: PersonStanding,
  contrast: ThermometerSnowflake,
}
