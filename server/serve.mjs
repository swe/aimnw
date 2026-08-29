import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { handleApiRequest, loadDotEnv, writeApiResult } from './api.mjs'
import { proxyInsecureMedia } from './insecureMedia.mjs'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(rootDir, 'dist')
const port = Number(process.env.PORT || 4173)

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
}

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
}

async function sendFile(res, filePath) {
  const data = await readFile(filePath)
  const ext = path.extname(filePath).toLowerCase()
  res.writeHead(200, {
    ...SECURITY_HEADERS,
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  res.end(data)
}

async function proxyImmich(req, res, pathname, search) {
  const targetPath = `${pathname.replace(/^\/immich/, '') || '/'}${search}`
  const target = `https://m.alleksy.com${targetPath}`
  const upstream = await fetch(target, {
    method: req.method || 'GET',
    headers: {
      Accept: req.headers.accept || 'application/json',
    },
  })

  const buffer = Buffer.from(await upstream.arrayBuffer())
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
  res.writeHead(upstream.status, {
    ...SECURITY_HEADERS,
    'Content-Type': contentType,
    'Cache-Control': upstream.headers.get('cache-control') || 'no-store',
  })
  res.end(buffer)
}

async function handleRequest(req, res) {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`)
  const pathname = decodeURIComponent(url.pathname)

  const apiResult = await handleApiRequest(req)
  if (apiResult) {
    writeApiResult(res, apiResult)
    return
  }

  if (pathname === '/immich' || pathname.startsWith('/immich/')) {
    await proxyImmich(req, res, pathname, url.search)
    return
  }

  if (await proxyInsecureMedia(req, res, pathname, url.search, SECURITY_HEADERS)) {
    return
  }

  const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '')
  const candidate = path.join(distDir, safePath === '/' ? 'index.html' : safePath)

  try {
    const info = await stat(candidate)
    if (info.isFile()) {
      await sendFile(res, candidate)
      return
    }
  } catch {
    /* fall through to SPA index */
  }

  try {
    await sendFile(res, path.join(distDir, 'index.html'))
  } catch {
    res.writeHead(500, {
      ...SECURITY_HEADERS,
      'Content-Type': 'text/plain; charset=utf-8',
    })
    res.end('Build missing. Run pnpm build before pnpm start.')
  }
}

loadDotEnv()

createServer((req, res) => {
  handleRequest(req, res).catch((error) => {
    console.error(error)
    res.writeHead(500, {
      ...SECURITY_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
    })
    res.end(JSON.stringify({ error: 'Internal server error' }))
  })
}).listen(port, () => {
  console.log(`aimnw listening on http://localhost:${port}`)
})
