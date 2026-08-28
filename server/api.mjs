import { handleContactRequest } from './contact.mjs'
import { handleVinylRequest } from './discogs.mjs'
import { loadDotEnv, requireServerEnv } from './env.mjs'
import { handleGarminRequest } from './garmin.mjs'
import { handleHevyRequest } from './hevy.mjs'
import { handleJoplinRequest } from './joplin.mjs'
import { handleOuraRequest } from './oura.mjs'

function pathnameOf(req) {
  return (req.url || '/').split('?')[0]
}

function handleMapkitToken(method) {
  if (method !== 'GET') {
    return { status: 405, body: { error: 'Method not allowed' } }
  }

  try {
    return { status: 200, body: { token: requireServerEnv('MAPKIT_TOKEN') } }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Missing MAPKIT_TOKEN'
    return { status: 503, body: { error: message } }
  }
}

/**
 * Single dispatcher for Vite middleware and `pnpm start`.
 * Returns null when the request is not an /api route.
 */
export async function handleApiRequest(req) {
  const pathname = pathnameOf(req)
  if (!pathname.startsWith('/api/')) return null

  const method = req.method || 'GET'

  if (pathname === '/api/mapkit-token') return handleMapkitToken(method)
  if (pathname === '/api/contact') return handleContactRequest(req)
  if (pathname === '/api/vinyl') return handleVinylRequest(method)
  if (pathname.startsWith('/api/hevy')) return handleHevyRequest(method, pathname)
  if (pathname.startsWith('/api/oura')) return handleOuraRequest(method, pathname)
  if (pathname.startsWith('/api/garmin')) return handleGarminRequest(method, pathname)
  if (pathname.startsWith('/api/joplin')) return handleJoplinRequest(method, pathname)

  return { status: 404, body: { error: 'Not found' } }
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
}

export function writeApiResult(res, result) {
  const cacheControl =
    result.cacheControl ||
    (result.buffer && result.status === 200 ? 'public, max-age=86400' : 'no-store')

  if (result.buffer) {
    res.writeHead(result.status, {
      ...SECURITY_HEADERS,
      'Content-Type': result.contentType || 'application/octet-stream',
      'Cache-Control': cacheControl,
    })
    res.end(result.buffer)
    return
  }

  res.writeHead(result.status, {
    ...SECURITY_HEADERS,
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': cacheControl,
  })
  res.end(JSON.stringify(result.body ?? {}))
}

export { loadDotEnv }
