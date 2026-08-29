import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type Connect, type Plugin, type PreviewServer, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const apiModuleUrl = pathToFileURL(path.join(rootDir, 'server/api.mjs')).href

/** Public URLs only. Secrets must never be listed here — they stay on the server. */
const PUBLIC_ENV = [
  'API_DRINKS',
  'API_LIBRARY',
  'API_MAP',
  'API_GOALS',
  'API_HATES',
  'API_PHOTOS',
  'API_QUESTS',
] as const

type ApiResult = {
  status: number
  body?: unknown
  buffer?: Buffer
  contentType?: string
  cacheControl?: string
}

function localApiPlugin(): Plugin {
  const attach = (server: ViteDevServer | PreviewServer) => {
    const middleware: Connect.NextHandleFunction = async (req, res, next) => {
      const pathname = req.url?.split('?')[0]
      if (!pathname?.startsWith('/api/')) {
        next()
        return
      }

      try {
        const { handleApiRequest, writeApiResult } = (await import(apiModuleUrl)) as {
          handleApiRequest: (req: IncomingMessage) => Promise<ApiResult | null>
          writeApiResult: (res: ServerResponse, result: ApiResult) => void
        }
        const result = await handleApiRequest(req)
        if (!result) {
          next()
          return
        }
        writeApiResult(res, result)
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Request failed'
        res.statusCode = 502
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        res.end(JSON.stringify({ error: message }))
      }
    }

    server.middlewares.use(middleware)
  }

  return {
    name: 'local-api',
    configureServer: attach,
    configurePreviewServer: attach,
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, rootDir, '')
  const define = Object.fromEntries(
    PUBLIC_ENV.map((name) => [`import.meta.env.${name}`, JSON.stringify(env[name] ?? '')]),
  )

  return {
    plugins: [react(), localApiPlugin()],
    // Default VITE_ prefix only — secrets (MAPKIT_, HEVY_, OURA_, …) stay off the client.
    envPrefix: 'VITE_',
    define,
    resolve: {
      alias: {
        '@': path.resolve(rootDir, './src'),
      },
    },
    server: {
      proxy: {
        '/immich': {
          target: 'https://m.alleksy.com',
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/immich/, ''),
        },
        // i.alleksy.com has an expired cert — Vite must not verify TLS.
        '/media/i': {
          target: 'https://i.alleksy.com',
          changeOrigin: true,
          secure: false,
          rewrite: (requestPath) => requestPath.replace(/^\/media\/i/, ''),
        },
      },
    },
    preview: {
      proxy: {
        '/immich': {
          target: 'https://m.alleksy.com',
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/immich/, ''),
        },
        '/media/i': {
          target: 'https://i.alleksy.com',
          changeOrigin: true,
          secure: false,
          rewrite: (requestPath) => requestPath.replace(/^\/media\/i/, ''),
        },
      },
    },
  }
})
