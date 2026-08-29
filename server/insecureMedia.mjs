import https from 'node:https'
import { URL } from 'node:url'

/** TLS to i.alleksy.com is currently expired; Node still needs to reach the origin. */
const insecureAgent = new https.Agent({ rejectUnauthorized: false })

export const INSECURE_MEDIA_ORIGIN = 'https://i.alleksy.com'
export const INSECURE_MEDIA_PREFIX = '/media/i'

function fetchInsecure(target, requestHeaders) {
  return new Promise((resolve, reject) => {
    const url = new URL(target)
    const req = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: 'GET',
        agent: insecureAgent,
        headers: requestHeaders,
      },
      (upstream) => {
        const chunks = []
        upstream.on('data', (chunk) => chunks.push(chunk))
        upstream.on('end', () => {
          resolve({
            status: upstream.statusCode || 502,
            headers: upstream.headers,
            buffer: Buffer.concat(chunks),
          })
        })
        upstream.on('error', reject)
      },
    )
    req.on('error', reject)
    req.end()
  })
}

/**
 * Proxy GET `/media/i/...` → `https://i.alleksy.com/...` with TLS verification off.
 * Returns false when the request is not for this proxy.
 */
export async function proxyInsecureMedia(req, res, pathname, search, securityHeaders) {
  if (pathname !== INSECURE_MEDIA_PREFIX && !pathname.startsWith(`${INSECURE_MEDIA_PREFIX}/`)) {
    return false
  }

  const relative = pathname.slice(INSECURE_MEDIA_PREFIX.length) || '/'
  const safePath = relative.replace(/^(\.\.\/)+/, '/').replace(/\/\.\.(?=\/|$)/g, '')
  const target = `${INSECURE_MEDIA_ORIGIN}${safePath.startsWith('/') ? safePath : `/${safePath}`}${search}`

  const upstream = await fetchInsecure(target, {
    Accept: req.headers.accept || '*/*',
    'User-Agent': req.headers['user-agent'] || 'aimnw-media-proxy',
  })

  const contentType = upstream.headers['content-type'] || 'application/octet-stream'
  const cacheControl = upstream.headers['cache-control'] || 'public, max-age=86400'

  res.writeHead(upstream.status, {
    ...securityHeaders,
    'Content-Type': contentType,
    'Cache-Control': cacheControl,
  })
  res.end(upstream.buffer)
  return true
}
