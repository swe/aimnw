import { requireServerEnv } from './env.mjs'

function artistLabel(artists) {
  if (!artists?.length) return 'Unknown artist'
  return artists
    .map((artist, index) => {
      const name = (artist.anv || artist.name || '').trim() || 'Unknown'
      const join = artist.join?.trim()
      if (index === artists.length - 1) return name
      return `${name}${join ? ` ${join} ` : ', '}`
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
}

function toHttps(url) {
  if (!url) return null
  return url.replace(/^http:\/\//i, 'https://')
}

function mapRelease(release) {
  const info = release.basic_information
  const id = String(release.instance_id ?? release.id)
  const releaseId = info?.id ?? release.id
  const title = info?.title?.trim() || 'Untitled'
  const artist = artistLabel(info?.artists)

  return {
    id,
    title,
    artist,
    coverUrl: toHttps(info?.cover_image) ?? toHttps(info?.thumb),
    url: `https://www.discogs.com/release/${releaseId}`,
  }
}

async function fetchCollectionPage(username, token, page, signal) {
  const url = new URL(
    `https://api.discogs.com/users/${encodeURIComponent(username)}/collection/folders/0/releases`,
  )
  url.searchParams.set('page', String(page))
  url.searchParams.set('per_page', '100')
  url.searchParams.set('sort', 'added')
  url.searchParams.set('sort_order', 'desc')

  const response = await fetch(url, {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
      Authorization: `Discogs token=${token}`,
      'User-Agent': 'aimnw/1.0 +https://alleksy.com',
    },
  })

  if (!response.ok) {
    throw new Error(`Discogs request failed: ${response.status}`)
  }

  return response.json()
}

/** Server-only Discogs collection fetch. Keeps the token off the client. */
export async function fetchVinylCollection(signal) {
  const username = requireServerEnv('DISCOGS_USERNAME')
  const token = requireServerEnv('DISCOGS_TOKEN')

  const first = await fetchCollectionPage(username, token, 1, signal)
  const pages = Math.max(1, first.pagination?.pages ?? 1)
  const releases = [...(first.releases ?? [])]

  for (let page = 2; page <= pages; page += 1) {
    const next = await fetchCollectionPage(username, token, page, signal)
    releases.push(...(next.releases ?? []))
  }

  return releases.map(mapRelease)
}

/** Shared JSON response helper for Vite middleware and production server. */
export async function handleVinylRequest(method) {
  if (method !== 'GET') {
    return {
      status: 405,
      body: { error: 'Method not allowed' },
    }
  }

  try {
    const records = await fetchVinylCollection()
    return { status: 200, body: records }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load vinyl collection'
    return {
      status: message.startsWith('Missing ') ? 503 : 502,
      body: { error: message },
    }
  }
}
