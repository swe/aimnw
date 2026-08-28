import { apiGet, requireEnv } from './client'
import type { MapPayload, PlaceItem } from '@/types'

function base() {
  return requireEnv(import.meta.env.API_MAP, 'API_MAP')
}

/** User-assigned / nicer labels than Intl.DisplayNames. */
const CUSTOM_COUNTRY_NAMES: Record<string, string> = {
  QB: 'Abkhazia',
  QO: 'South Ossetia',
  HK: 'Hong Kong',
}

const regionNames =
  typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null

function countryNameFromCode(code: string) {
  const upper = code.trim().toUpperCase()
  if (!upper) return 'Unknown'
  if (CUSTOM_COUNTRY_NAMES[upper]) return CUSTOM_COUNTRY_NAMES[upper]
  const named = regionNames?.of(upper)
  if (named && named !== upper) return named
  return upper
}

function normalizePlaces(payload: MapPayload): PlaceItem[] {
  const countriesById = new Map(
    payload.countries.map((country) => [country.id, country]),
  )
  const guideByCityId = new Map(
    payload.guides.map((guide) => [guide.cityId, guide.id]),
  )

  return payload.cities.map((city) => {
    const country = countriesById.get(city.countryId)
    const countryCode = country?.countryCode?.toUpperCase() ?? ''
    return {
      id: city.id,
      name: city.name,
      latitude: city.latitude,
      longitude: city.longitude,
      country: countryNameFromCode(countryCode),
      countryCode,
      guideId: guideByCityId.get(city.id) ?? null,
    }
  })
}

export async function getPlaces(signal?: AbortSignal) {
  const payload = await apiGet<MapPayload>(base(), '', { signal })
  return normalizePlaces(payload)
}
