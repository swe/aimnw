#!/usr/bin/env node
/**
 * One-time Oura OAuth setup — requests heart_health scope for Fitness Age + VO₂.
 *
 * Prerequisites:
 *   1. Create an app at https://cloud.ouraring.com/oauth/applications
 *   2. Add redirect URI: http://localhost:8787/callback
 *   3. Set OURA_CLIENT_ID and OURA_CLIENT_SECRET in .env
 *
 * Usage: pnpm oura:oauth
 */
import { createServer } from 'node:http'
import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const envPath = path.join(rootDir, '.env')
const OURA_API = 'https://api.ouraring.com'
const REDIRECT_URI = 'http://localhost:8787/callback'
const PORT = 8787

/** Scopes needed for sport hub Oura integration (heart_health → cardio age + VO₂). */
const SCOPES = [
  'personal',
  'daily',
  'heartrate',
  'workout',
  'session',
  'spo2',
  'stress',
  'heart_health',
].join(' ')

function loadEnvFile() {
  const values = {}
  try {
    const raw = readFileSync(envPath, 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      values[key] = value
    }
  } catch {
    console.error(`Could not read ${envPath}`)
    process.exit(1)
  }
  return values
}

function upsertEnv(keys) {
  let raw = ''
  try {
    raw = readFileSync(envPath, 'utf8')
  } catch {
    raw = ''
  }

  const lines = raw.length ? raw.split('\n') : []
  for (const [key, value] of Object.entries(keys)) {
    const next = `${key}=${value}`
    const index = lines.findIndex((line) => line.startsWith(`${key}=`))
    if (index >= 0) lines[index] = next
    else lines.push(next)
  }

  writeFileSync(envPath, `${lines.filter((line, i, arr) => line !== '' || i < arr.length - 1).join('\n')}\n`)
}

async function exchangeCode(code, clientId, clientSecret) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    client_secret: clientSecret,
  })

  const response = await fetch(`${OURA_API}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: body.toString(),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(payload?.error_description || payload?.error || `Token exchange failed: ${response.status}`)
  }
  return payload
}

function authorizeUrl(clientId) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state: String(Date.now()),
  })
  return `https://cloud.ouraring.com/oauth/authorize?${params}`
}

const envFile = loadEnvFile()
const clientId = envFile.OURA_CLIENT_ID || process.env.OURA_CLIENT_ID
const clientSecret = envFile.OURA_CLIENT_SECRET || process.env.OURA_CLIENT_SECRET

if (!clientId || !clientSecret) {
  console.error(`
Missing OURA_CLIENT_ID or OURA_CLIENT_SECRET in .env.

1. Create an app at https://cloud.ouraring.com/oauth/applications
2. Add redirect URI: ${REDIRECT_URI}
3. Add to .env:
   OURA_CLIENT_ID=your_client_id
   OURA_CLIENT_SECRET=your_client_secret
`)
  process.exit(1)
}

const url = authorizeUrl(clientId)
console.log('\nOpen this URL in your browser and authorize the app:\n')
console.log(url)
console.log('\nWaiting for callback on', REDIRECT_URI, '…\n')

const server = createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://localhost:${PORT}`)
  if (requestUrl.pathname !== '/callback') {
    res.writeHead(404)
    res.end('Not found')
    return
  }

  const error = requestUrl.searchParams.get('error')
  if (error) {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end(`Authorization denied: ${error}`)
    server.close()
    process.exit(1)
  }

  const code = requestUrl.searchParams.get('code')
  if (!code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' })
    res.end('Missing authorization code')
    return
  }

  try {
    const tokens = await exchangeCode(code, clientId, clientSecret)
    upsertEnv({
      OURA_ACCESS_TOKEN: tokens.access_token,
      OURA_REFRESH_TOKEN: tokens.refresh_token,
    })

    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
    res.end('<h1>Oura connected</h1><p>You can close this tab and return to the terminal.</p>')

    console.log('Success — updated .env with:')
    console.log('  OURA_ACCESS_TOKEN')
    console.log('  OURA_REFRESH_TOKEN')
    console.log('\nScopes granted:', tokens.scope || SCOPES)
    console.log('Restart the dev server, then reload /sport — Fitness Age should populate.\n')

    server.close()
    process.exit(0)
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain' })
    res.end(err instanceof Error ? err.message : 'Token exchange failed')
    console.error(err)
    server.close()
    process.exit(1)
  }
})

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`)
})
