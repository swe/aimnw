import type { GeographiesProps } from '@vnedyalk0v/react19-simple-maps'
import countriesTopology from '@/data/countries-110m.json'

type CountryGeometry = {
  type: string
  arcs: unknown
  id?: string | number
  properties: { name: string; [key: string]: unknown }
}

type CountriesTopology = {
  type: string
  bbox?: number[]
  transform?: unknown
  arcs: unknown
  objects: {
    countries: {
      type: string
      geometries: CountryGeometry[]
    }
    [key: string]: unknown
  }
}

/**
 * Natural Earth 110m packs French Guiana into France as polygon 0.
 * Split it out so overseas departments don’t light up with metropolitan France.
 */
function splitFrenchGuiana(topology: CountriesTopology): CountriesTopology {
  const geometries = topology.objects.countries.geometries.map((geometry) => {
    if (geometry.properties.name !== 'France' || geometry.type !== 'MultiPolygon') {
      return geometry
    }

    const arcs = geometry.arcs as unknown[][]
    if (!Array.isArray(arcs) || arcs.length < 2) return geometry

    return [
      {
        type: 'Polygon',
        arcs: arcs[0],
        id: 'guf',
        properties: { name: 'French Guiana' },
      },
      {
        type: 'MultiPolygon',
        arcs: arcs.slice(1),
        id: geometry.id,
        properties: { name: 'France' },
      },
    ]
  })

  return {
    ...topology,
    objects: {
      ...topology.objects,
      countries: {
        ...topology.objects.countries,
        geometries: geometries.flat(),
      },
    },
  }
}

export const WORLD_GEOGRAPHY = splitFrenchGuiana(
  countriesTopology as unknown as CountriesTopology,
) as GeographiesProps['geography']
export function normalizeCountry(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s'.-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Synonyms only — never fold dependent territories into a parent. */
const COUNT_ALIASES: Record<string, string> = {
  'united states of america': 'united states',
  usa: 'united states',
  'u.s.a.': 'united states',
  'u.s.': 'united states',
  us: 'united states',
  uk: 'united kingdom',
  'great britain': 'united kingdom',
  britain: 'united kingdom',
  'french guyana': 'french guiana',
  guyane: 'french guiana',
  'czech republic': 'czechia',
  turkiye: 'turkey',
  'vatican city': 'vatican',
  'holy see': 'vatican',
}

/** Map API / common labels onto Natural Earth feature names. */
const GEO_NAMES: Record<string, string> = {
  'united states': 'united states of america',
  usa: 'united states of america',
  'u.s.a.': 'united states of america',
  'u.s.': 'united states of america',
  us: 'united states of america',
  'united states of america': 'united states of america',
  uk: 'united kingdom',
  'great britain': 'united kingdom',
  britain: 'united kingdom',
  england: 'united kingdom',
  'united kingdom': 'united kingdom',
  'czech republic': 'czechia',
  czechia: 'czechia',
  'dominican republic': 'dominican rep.',
  'dominican rep.': 'dominican rep.',
  'north macedonia': 'macedonia',
  macedonia: 'macedonia',
  'south korea': 'south korea',
  korea: 'south korea',
  'north korea': 'north korea',
  'democratic republic of the congo': 'dem. rep. congo',
  drc: 'dem. rep. congo',
  'dr congo': 'dem. rep. congo',
  'dem. rep. congo': 'dem. rep. congo',
  'republic of the congo': 'congo',
  congo: 'congo',
  'french guyana': 'french guiana',
  guyane: 'french guiana',
  'french guiana': 'french guiana',
  "cote d'ivoire": "cote d'ivoire",
  'ivory coast': "cote d'ivoire",
  swaziland: 'eswatini',
  'russian federation': 'russia',
  russia: 'russia',
  turkiye: 'turkey',
  turkey: 'turkey',
  'vatican city': 'vatican',
  'holy see': 'vatican',
  vatican: 'vatican',
  'hong kong': 'hong kong',
  'hong kong sar': 'hong kong',
}

export function countryCountKey(value: string) {
  const normalized = normalizeCountry(value)
  return COUNT_ALIASES[normalized] ?? normalized
}

export function geoCountryKey(value: string) {
  const normalized = normalizeCountry(value)
  return GEO_NAMES[normalized] ?? normalized
}

export function isVisitedCountry(geoName: string, visitedGeoKeys: Set<string>) {
  return visitedGeoKeys.has(geoCountryKey(geoName))
}

/** UN member states — denominator for the “visit every country” side quest. */
export const UN_COUNTRY_TOTAL = 193

export function countVisitedCountries(countries: Iterable<string>) {
  const keys = new Set<string>()
  for (const country of countries) {
    const key = countryCountKey(country)
    if (key) keys.add(key)
  }
  return keys.size
}
