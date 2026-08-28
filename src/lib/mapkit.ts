import { load, type MapKit } from '@apple/mapkit-loader'

const MAPKIT_LIBRARIES = ['map', 'annotations', 'overlays'] as const
const TOKEN_MISSING =
  'MAPKIT_TOKEN is missing. Create a MapKit JS domain token in Apple Developer → Services → Maps → Tokens, then add it to .env.'

let loadPromise: Promise<MapKit> | null = null

async function fetchToken() {
  const response = await fetch('/api/mapkit-token', {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  })
  if (!response.ok) throw new Error(TOKEN_MISSING)
  const body = (await response.json()) as { token?: string }
  const token = body.token?.trim()
  if (!token) throw new Error(TOKEN_MISSING)
  return token
}

/** Load MapKit JS once (map + city pins + route overlays). */
export async function loadMapkit(): Promise<MapKit> {
  loadPromise ??= fetchToken()
    .then((token) =>
      load({
        token,
        libraries: [...MAPKIT_LIBRARIES],
        version: '6',
      }),
    )
    .catch((error) => {
      loadPromise = null
      throw error
    })

  return loadPromise
}

export type { MapKit }
