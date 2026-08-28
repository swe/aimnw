/**
 * Garmin Connect session — DI OAuth2 tokens on disk, refresh, connectapi GET.
 * Login lives in scripts/garmin-login.mjs so SSO churn does not touch mapping.
 */
import { loadDotEnv, rootDir } from './env.mjs'
import { readFileSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs'
import path from 'node:path'

export { loadDotEnv }

export const CONNECTAPI = 'https://connectapi.garmin.com'
export const DI_TOKEN_URL = 'https://diauth.garmin.com/di-oauth2-service/oauth/token'
export const DI_GRANT_TYPE =
  'https://connectapi.garmin.com/di-oauth2-service/oauth/grant/service_ticket'
export const DI_CLIENT_IDS = [
  'GARMIN_CONNECT_MOBILE_ANDROID_DI_2025Q2',
  'GARMIN_CONNECT_MOBILE_ANDROID_DI_2024Q4',
  'GARMIN_CONNECT_MOBILE_ANDROID_DI',
  'GARMIN_CONNECT_MOBILE_IOS_DI',
]
export const ANDROID_SERVICE_URL = 'https://mobile.integration.garmin.com/gcm/android'
export const IOS_SERVICE_URL = 'https://mobile.integration.garmin.com/gcm/ios'
export const LOGIN_HELP =
  'Run `pnpm garmin:login` to write .garmin-session.json (email/password in .env, plus MFA if Garmin asks).'

const SSO = 'https://sso.garmin.com'
const IOS_SSO_CLIENT_ID = 'GCM_IOS_DARK'
const IOS_LOGIN_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'

const NATIVE_API_USER_AGENT = 'GCM-Android-5.23'
const NATIVE_X_GARMIN_USER_AGENT =
  'com.garmin.android.apps.connectmobile/5.23; ; Google/sdk_gphone64_arm64/google; Android/33; Dalvik/2.1.0'
const REFRESH_SKEW_MS = 2 * 60_000

export function sessionFilePath() {
  loadDotEnv()
  const override = process.env.GARMIN_SESSION_FILE?.trim()
  if (override) return path.isAbsolute(override) ? override : path.join(rootDir, override)
  return path.join(rootDir, '.garmin-session.json')
}

export function nativeHeaders(extra = {}) {
  return {
    'User-Agent': NATIVE_API_USER_AGENT,
    'X-Garmin-User-Agent': NATIVE_X_GARMIN_USER_AGENT,
    'X-Garmin-Paired-App-Version': '10861',
    'X-Garmin-Client-Platform': 'Android',
    'X-App-Ver': '10861',
    'X-Lang': 'en',
    'X-GCExperience': 'GC5',
    'Accept-Language': 'en-US,en;q=0.9',
    ...extra,
  }
}

function basicAuth(clientId) {
  return `Basic ${Buffer.from(`${clientId}:`).toString('base64')}`
}

export function jwtPayload(token) {
  try {
    const parts = String(token).split('.')
    if (parts.length < 2) return null
    const b64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4)
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'))
  } catch {
    return null
  }
}

function expiresAtFromToken(token, fallbackSec = 23 * 3600) {
  const payload = jwtPayload(token)
  const exp = Number(payload?.exp)
  if (Number.isFinite(exp) && exp > 0) return exp * 1000
  return Date.now() + fallbackSec * 1000
}

export function clientIdFromToken(token, fallback) {
  const payload = jwtPayload(token)
  const value = payload?.client_id
  return typeof value === 'string' && value ? value : fallback
}

/**
 * @typedef {{ diToken: string, diRefreshToken: string, diClientId: string, expiresAt: number }} GarminSession
 */

/** @returns {GarminSession | null} */
export function readSessionFile() {
  try {
    const raw = readFileSync(sessionFilePath(), 'utf8')
    const data = JSON.parse(raw)
    if (!data?.diToken || !data?.diRefreshToken || !data?.diClientId) return null
    return {
      diToken: String(data.diToken),
      diRefreshToken: String(data.diRefreshToken),
      diClientId: String(data.diClientId),
      expiresAt: Number(data.expiresAt) || expiresAtFromToken(data.diToken),
    }
  } catch {
    return null
  }
}

export function writeSessionFile(session) {
  const filePath = sessionFilePath()
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(session, null, 2)}\n`, { mode: 0o600 })
  try {
    chmodSync(filePath, 0o600)
  } catch {
    /* chmod may fail on some hosts */
  }
}

export function sessionConfigured() {
  return Boolean(readSessionFile())
}

export function garminCredentials() {
  loadDotEnv()
  return {
    email: process.env.GARMIN_EMAIL?.trim() || '',
    password: process.env.GARMIN_PASSWORD?.trim() || '',
  }
}

class CookieJar {
  constructor() {
    this.cookies = new Map()
  }

  apply(response) {
    const lines = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []
    for (const line of lines) {
      const pair = String(line).split(';')[0]
      const eq = pair.indexOf('=')
      if (eq > 0) this.cookies.set(pair.slice(0, eq), pair.slice(eq + 1))
    }
  }

  header() {
    return [...this.cookies.entries()].map(([key, value]) => `${key}=${value}`).join('; ')
  }
}

async function mobilePost(jar, pathname, searchParams, body) {
  const url = new URL(`${SSO}${pathname}`)
  for (const [key, value] of Object.entries(searchParams)) {
    url.searchParams.set(key, value)
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'User-Agent': IOS_LOGIN_UA,
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
      Origin: SSO,
      Cookie: jar.header(),
    },
    body: JSON.stringify(body),
  })
  jar.apply(response)
  const text = await response.text()
  let json = null
  try {
    json = JSON.parse(text)
  } catch {
    json = null
  }
  return { status: response.status, json, text }
}

/**
 * Mobile SSO login. `promptMfa` must return the one-time code when Garmin asks.
 * @param {(method: string) => Promise<string>} [promptMfa]
 */
export async function loginWithPassword(email, password, promptMfa) {
  const jar = new CookieJar()
  const params = {
    clientId: IOS_SSO_CLIENT_ID,
    locale: 'en-US',
    service: IOS_SERVICE_URL,
  }
  const first = await mobilePost(jar, '/mobile/api/login', params, {
    username: email,
    password,
    rememberMe: true,
    captchaToken: '',
  })

  if (first.status === 429) throw new Error('rate_limited')
  if (first.status === 403 || !first.json) throw new Error('cloudflare')

  const type = first.json?.responseStatus?.type
  if (type === 'INVALID_USERNAME_PASSWORD') throw new Error('invalid_credentials')
  if (type === 'CAPTCHA_REQUIRED') throw new Error('captcha')

  if (type === 'MFA_REQUIRED') {
    if (!promptMfa) throw new Error('mfa_required')
    const code = await promptMfa(first.json?.customerMfaInfo?.mfaLastMethodUsed || 'email')
    const mfa = await mobilePost(jar, '/mobile/api/mfa/verifyCode', params, {
      mfaMethod: first.json?.customerMfaInfo?.mfaLastMethodUsed || 'email',
      mfaVerificationCode: code,
      rememberMyBrowser: true,
      reconsentList: [],
      mfaSetup: false,
    })
    if (mfa.json?.responseStatus?.type !== 'SUCCESSFUL' || !mfa.json?.serviceTicketId) {
      throw new Error('mfa_failed')
    }
    return exchangeServiceTicket(mfa.json.serviceTicketId, IOS_SERVICE_URL)
  }

  if (type === 'SUCCESSFUL' && first.json?.serviceTicketId) {
    return exchangeServiceTicket(first.json.serviceTicketId, IOS_SERVICE_URL)
  }

  throw new Error(`unexpected_login:${type || first.status}`)
}

function loginFailureMessage(reason) {
  if (reason === 'mfa_required' || reason === 'mfa_failed') {
    return 'Garmin MFA is required. Run `pnpm garmin:login` in a terminal and enter the code.'
  }
  if (reason === 'invalid_credentials') {
    return 'Garmin rejected GARMIN_EMAIL / GARMIN_PASSWORD. Update .env and run `pnpm garmin:login`.'
  }
  if (reason === 'rate_limited' || reason === 'cloudflare' || reason === 'captcha') {
    return 'Garmin blocked automated login. Run `pnpm garmin:login` and paste a browser service ticket.'
  }
  return LOGIN_HELP
}

/** @type {string | null} */
let envLoginError = null
/** @type {Promise<GarminSession> | null} */
let envLoginInflight = null

/**
 * Use a stored session, or try a one-shot login from GARMIN_EMAIL / GARMIN_PASSWORD.
 * MFA cannot be completed here — that needs `pnpm garmin:login`.
 */
export async function ensureSession() {
  const existing = readSessionFile()
  if (existing) return existing
  if (envLoginError) throw new Error(envLoginError)

  const { email, password } = garminCredentials()
  if (!email || !password) {
    envLoginError = LOGIN_HELP
    throw new Error(envLoginError)
  }

  if (!envLoginInflight) {
    envLoginInflight = loginWithPassword(email, password)
      .then((session) => {
        writeSessionFile(session)
        return session
      })
      .catch((error) => {
        const reason = error instanceof Error ? error.message : String(error)
        envLoginError = loginFailureMessage(reason)
        throw new Error(envLoginError)
      })
      .finally(() => {
        envLoginInflight = null
      })
  }
  return envLoginInflight
}

export async function exchangeServiceTicket(ticket, serviceUrl = ANDROID_SERVICE_URL) {
  const trimmed = String(ticket || '').trim()
  if (!trimmed.startsWith('ST-')) {
    throw new Error('Garmin service ticket must start with ST-')
  }

  let lastError = 'DI token exchange failed for all client IDs'
  for (const clientId of DI_CLIENT_IDS) {
    const response = await fetch(DI_TOKEN_URL, {
      method: 'POST',
      headers: nativeHeaders({
        Authorization: basicAuth(clientId),
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cache-Control': 'no-cache',
      }),
      body: new URLSearchParams({
        client_id: clientId,
        service_ticket: trimmed,
        grant_type: DI_GRANT_TYPE,
        service_url: serviceUrl,
      }).toString(),
    })

    if (response.status === 429) {
      throw new Error('Garmin token exchange rate limited (429). Wait and retry.')
    }
    if (!response.ok) {
      const text = await response.text().catch(() => '')
      lastError = `DI exchange ${clientId}: ${response.status} ${text.slice(0, 180)}`
      continue
    }

    const data = await response.json()
    const diToken = data?.access_token
    const diRefreshToken = data?.refresh_token
    if (!diToken || !diRefreshToken) {
      lastError = `DI exchange ${clientId}: missing tokens`
      continue
    }

    return {
      diToken: String(diToken),
      diRefreshToken: String(diRefreshToken),
      diClientId: clientIdFromToken(diToken, clientId),
      expiresAt: expiresAtFromToken(diToken, Number(data.expires_in) || 23 * 3600),
    }
  }

  throw new Error(lastError)
}

async function refreshSession(session) {
  const response = await fetch(DI_TOKEN_URL, {
    method: 'POST',
    headers: nativeHeaders({
      Authorization: basicAuth(session.diClientId),
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache',
    }),
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: session.diClientId,
      refresh_token: session.diRefreshToken,
    }).toString(),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Garmin token refresh failed: ${response.status} ${text.slice(0, 180)}`)
  }

  const data = await response.json()
  const diToken = data?.access_token
  if (!diToken) throw new Error('Garmin token refresh returned no access_token')

  const next = {
    diToken: String(diToken),
    diRefreshToken: String(data.refresh_token || session.diRefreshToken),
    diClientId: clientIdFromToken(diToken, session.diClientId),
    expiresAt: expiresAtFromToken(diToken, Number(data.expires_in) || 23 * 3600),
  }
  writeSessionFile(next)
  return next
}

/** @type {Promise<GarminSession> | null} */
let refreshInflight = null

export async function getValidSession() {
  let session = await ensureSession()
  if (!session) {
    throw new Error(LOGIN_HELP)
  }
  if (session.expiresAt - REFRESH_SKEW_MS > Date.now()) return session

  if (!refreshInflight) {
    refreshInflight = refreshSession(session).finally(() => {
      refreshInflight = null
    })
  }
  return refreshInflight
}

export async function connectGet(pathname, searchParams = {}, signal) {
  const session = await getValidSession()
  const url = new URL(`${CONNECTAPI}${pathname}`)
  for (const [key, value] of Object.entries(searchParams)) {
    if (value != null && value !== '') url.searchParams.set(key, String(value))
  }

  const headers = nativeHeaders({
    Authorization: `Bearer ${session.diToken}`,
    Accept: 'application/json',
  })

  let response = await fetch(url, { method: 'GET', headers, signal })
  if (response.status === 401) {
    const refreshed = await refreshSession(session)
    headers.Authorization = `Bearer ${refreshed.diToken}`
    response = await fetch(url, { method: 'GET', headers, signal })
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Garmin request failed: ${response.status} ${text.slice(0, 180)}`)
  }

  if (response.status === 204) return null
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('json')) return response.json()
  return response.text()
}

export async function connectGetBinary(pathname, signal) {
  const session = await getValidSession()
  const url = `${CONNECTAPI}${pathname}`
  const headers = nativeHeaders({
    Authorization: `Bearer ${session.diToken}`,
    Accept: '*/*',
  })

  let response = await fetch(url, { method: 'GET', headers, signal })
  if (response.status === 401) {
    const refreshed = await refreshSession(session)
    headers.Authorization = `Bearer ${refreshed.diToken}`
    response = await fetch(url, { method: 'GET', headers, signal })
  }

  if (!response.ok) {
    throw new Error(`Garmin request failed: ${response.status}`)
  }
  return response.text()
}

export async function verifySession() {
  const profile = await connectGet('/userprofile-service/socialProfile')
  return profile?.displayName || profile?.userName || 'ok'
}
