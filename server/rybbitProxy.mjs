export const RYBBIT_ORIGIN = 'https://stats.alleksy.com'
export const RYBBIT_PREFIX = '/analytics'

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || ''
}

async function readBody(req) {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  return Buffer.concat(chunks)
}

/**
 * First-party proxy: `/analytics/*` → `https://stats.alleksy.com/api/*`
 * Avoids cross-origin CORS (sendBeacon always uses credentials: include).
 */
export async function proxyRybbit(req, res, pathname, search, securityHeaders) {
  if (pathname !== RYBBIT_PREFIX && !pathname.startsWith(`${RYBBIT_PREFIX}/`)) {
    return false
  }

  const method = req.method || 'GET'
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      ...securityHeaders,
      'Access-Control-Allow-Origin': req.headers.origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    })
    res.end()
    return true
  }

  const relative = pathname.slice(RYBBIT_PREFIX.length) || '/'
  const target = `${RYBBIT_ORIGIN}/api${relative.startsWith('/') ? relative : `/${relative}`}${search}`

  /** @type {Record<string, string>} */
  const headers = {
    Accept: req.headers.accept || 'application/json',
    'User-Agent': req.headers['user-agent'] || 'aimnw-rybbit-proxy',
  }
  const contentType = req.headers['content-type']
  if (contentType) headers['Content-Type'] = contentType

  const ip = clientIp(req)
  if (ip) {
    headers['X-Forwarded-For'] = ip
    headers['X-Real-IP'] = ip
  }
  if (req.headers.origin) headers.Origin = String(req.headers.origin)

  const body = method === 'GET' || method === 'HEAD' ? undefined : await readBody(req)

  const upstream = await fetch(target, { method, headers, body })
  const responseBody = Buffer.from(await upstream.arrayBuffer())

  res.writeHead(upstream.status, {
    ...securityHeaders,
    'Content-Type': upstream.headers.get('content-type') || 'application/json',
    'Cache-Control': upstream.headers.get('cache-control') || 'no-store',
  })
  res.end(responseBody)
  return true
}
