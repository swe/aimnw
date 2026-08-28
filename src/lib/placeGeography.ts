import type { PlaceItem } from '@/types'
import { countryCountKey, normalizeCountry } from '@/lib/mapCountries'

export type ContinentName =
  | 'Africa'
  | 'Asia'
  | 'Europe'
  | 'North America'
  | 'Oceania'
  | 'South America'
  | 'Other'

export type CountryGroup = {
  country: string
  flag: string
  flagSrc?: string
  places: PlaceItem[]
}

export type ContinentGroup = {
  continent: ContinentName
  countries: CountryGroup[]
}

const CONTINENT_ORDER: ContinentName[] = [
  'Africa',
  'Asia',
  'Europe',
  'North America',
  'Oceania',
  'South America',
  'Other',
]

/** PNG flags for codes/names without emoji flags. */
const CUSTOM_FLAG_IMAGES: Record<string, string> = {
  abkhazia: '/abkhazia.png',
  qb: '/abkhazia.png',
}

/** ISO 3166-1 alpha-2 (or empty for unrecognized). */
const COUNTRY_ISO2: Record<string, string> = {
  abkhazia: '',
  armenia: 'am',
  austria: 'at',
  belgium: 'be',
  canada: 'ca',
  cyprus: 'cy',
  czechia: 'cz',
  'czech republic': 'cz',
  denmark: 'dk',
  'dominican republic': 'do',
  finland: 'fi',
  france: 'fr',
  georgia: 'ge',
  germany: 'de',
  greece: 'gr',
  'hong kong': 'hk',
  'hong kong sar china': 'hk',
  hungary: 'hu',
  ireland: 'ie',
  italy: 'it',
  jordan: 'jo',
  latvia: 'lv',
  liechtenstein: 'li',
  lithuania: 'lt',
  luxembourg: 'lu',
  maldives: 'mv',
  malta: 'mt',
  moldova: 'md',
  netherlands: 'nl',
  norway: 'no',
  poland: 'pl',
  russia: 'ru',
  serbia: 'rs',
  slovakia: 'sk',
  slovenia: 'si',
  'south ossetia': '',
  spain: 'es',
  sweden: 'se',
  switzerland: 'ch',
  syria: 'sy',
  turkey: 'tr',
  turkiye: 'tr',
  ukraine: 'ua',
  'united kingdom': 'gb',
  uk: 'gb',
  'united states': 'us',
  'united states of america': 'us',
  usa: 'us',
  vatican: 'va',
  'vatican city': 'va',
}

const COUNTRY_CONTINENT: Record<string, ContinentName> = {
  abkhazia: 'Asia',
  armenia: 'Asia',
  austria: 'Europe',
  belgium: 'Europe',
  canada: 'North America',
  cyprus: 'Asia',
  czechia: 'Europe',
  'czech republic': 'Europe',
  denmark: 'Europe',
  'dominican republic': 'North America',
  finland: 'Europe',
  france: 'Europe',
  georgia: 'Asia',
  germany: 'Europe',
  greece: 'Europe',
  'hong kong': 'Asia',
  'hong kong sar china': 'Asia',
  hungary: 'Europe',
  ireland: 'Europe',
  italy: 'Europe',
  jordan: 'Asia',
  latvia: 'Europe',
  liechtenstein: 'Europe',
  lithuania: 'Europe',
  luxembourg: 'Europe',
  maldives: 'Asia',
  malta: 'Europe',
  moldova: 'Europe',
  netherlands: 'Europe',
  norway: 'Europe',
  poland: 'Europe',
  russia: 'Europe',
  serbia: 'Europe',
  slovakia: 'Europe',
  slovenia: 'Europe',
  'south ossetia': 'Asia',
  spain: 'Europe',
  sweden: 'Europe',
  switzerland: 'Europe',
  syria: 'Asia',
  turkey: 'Asia',
  turkiye: 'Asia',
  ukraine: 'Europe',
  'united kingdom': 'Europe',
  uk: 'Europe',
  'united states': 'North America',
  'united states of america': 'North America',
  usa: 'North America',
  vatican: 'Europe',
  'vatican city': 'Europe',
}

function lookupKey(country: string) {
  return countryCountKey(country) || normalizeCountry(country)
}

export function countryFlagEmoji(country: string) {
  const iso = COUNTRY_ISO2[lookupKey(country)] ?? COUNTRY_ISO2[normalizeCountry(country)]
  return flagEmojiFromIso(iso)
}

function customFlagSrc(code: string | undefined, countryName: string) {
  const iso = code?.trim().toLowerCase() ?? ''
  if (iso && CUSTOM_FLAG_IMAGES[iso]) return CUSTOM_FLAG_IMAGES[iso]
  const byName = CUSTOM_FLAG_IMAGES[lookupKey(countryName)]
  return byName ?? CUSTOM_FLAG_IMAGES[normalizeCountry(countryName)]
}

export function countryFlagFor(code: string | undefined, countryName: string) {
  const flagSrc = customFlagSrc(code, countryName)
  if (flagSrc) return { flag: '', flagSrc }
  return { flag: flagEmojiFromIso(code) }
}

/** Build a flag from ISO 3166-1 alpha-2; user-assigned codes fall back to UN. */
export function flagEmojiFromIso(code: string | undefined | null) {
  const iso = code?.trim().toLowerCase() ?? ''
  if (!iso || iso.length !== 2) return '🇺🇳'
  if (CUSTOM_FLAG_IMAGES[iso]) return '🇺🇳'
  // No real emoji flags for these user-assigned codes
  if (iso === 'qo') return '🇺🇳'
  const upper = iso.toUpperCase()
  return String.fromCodePoint(
    ...[...upper].map((char) => 0x1f1e6 - 65 + char.charCodeAt(0)),
  )
}

export function continentForCountry(country: string): ContinentName {
  return (
    COUNTRY_CONTINENT[lookupKey(country)] ??
    COUNTRY_CONTINENT[normalizeCountry(country)] ??
    'Other'
  )
}

const ISO_CONTINENT: Record<string, ContinentName> = {
  am: 'Asia',
  at: 'Europe',
  be: 'Europe',
  ca: 'North America',
  ch: 'Europe',
  cy: 'Asia',
  cz: 'Europe',
  de: 'Europe',
  dk: 'Europe',
  do: 'North America',
  es: 'Europe',
  fi: 'Europe',
  fr: 'Europe',
  gb: 'Europe',
  ge: 'Asia',
  gr: 'Europe',
  hk: 'Asia',
  hu: 'Europe',
  ie: 'Europe',
  it: 'Europe',
  jo: 'Asia',
  li: 'Europe',
  lt: 'Europe',
  lu: 'Europe',
  lv: 'Europe',
  md: 'Europe',
  mt: 'Europe',
  mv: 'Asia',
  nl: 'Europe',
  no: 'Europe',
  pl: 'Europe',
  qb: 'Asia',
  qo: 'Asia',
  rs: 'Europe',
  ru: 'Europe',
  se: 'Europe',
  si: 'Europe',
  sk: 'Europe',
  sy: 'Asia',
  tr: 'Asia',
  ua: 'Europe',
  us: 'North America',
  va: 'Europe',
}

export function continentForCountryCode(code: string): ContinentName | null {
  const iso = code.trim().toLowerCase()
  return ISO_CONTINENT[iso] ?? null
}

/** Continents → countries (A–Z) → settlements (A–Z). */
export function groupPlacesByGeography(places: PlaceItem[]): ContinentGroup[] {
  const byContinent = new Map<ContinentName, Map<string, PlaceItem[]>>()

  for (const place of places) {
    const continent =
      continentForCountryCode(place.countryCode) ?? continentForCountry(place.country)
    const countryMap = byContinent.get(continent) ?? new Map<string, PlaceItem[]>()
    const list = countryMap.get(place.country) ?? []
    list.push(place)
    countryMap.set(place.country, list)
    byContinent.set(continent, countryMap)
  }

  return CONTINENT_ORDER.flatMap((continent) => {
    const countryMap = byContinent.get(continent)
    if (!countryMap?.size) return []

    const countries: CountryGroup[] = [...countryMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([country, countryPlaces]) => ({
        country,
        ...countryFlagFor(countryPlaces[0]?.countryCode, country),
        places: [...countryPlaces].sort((a, b) => a.name.localeCompare(b.name)),
      }))

    return [{ continent, countries }]
  })
}
