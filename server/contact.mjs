import { requireServerEnv } from './env.mjs'

const MAX_BODY_BYTES = 8_192
const MAX_MESSAGE_LENGTH = 2_000
const MAX_EMAIL_LENGTH = 254
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 5

/** @type {Map<string, number[]>} */
const recentByIp = new Map()

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket?.remoteAddress || 'unknown'
}

function allowRequest(ip) {
  const now = Date.now()
  const prior = (recentByIp.get(ip) || []).filter((ts) => now - ts < RATE_WINDOW_MS)
  if (prior.length >= RATE_MAX) {
    recentByIp.set(ip, prior)
    return false
  }
  prior.push(now)
  recentByIp.set(ip, prior)
  return true
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {number} [limit]
 */
export function readJsonBody(req, limit = MAX_BODY_BYTES) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    let settled = false

    const fail = (error) => {
      if (settled) return
      settled = true
      reject(error)
    }

    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        fail(Object.assign(new Error('Payload too large'), { status: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })

    req.on('end', () => {
      if (settled) return
      settled = true
      try {
        const raw = Buffer.concat(chunks).toString('utf8').trim()
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        reject(Object.assign(new Error('Invalid JSON'), { status: 400 }))
      }
    })

    req.on('error', fail)
  })
}

function sanitizeLine(value) {
  return String(value).replace(/[\r\n\u2028\u2029]+/g, ' ').trim()
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildTelegramText(email, message) {
  const safeEmail = escapeHtml(email)
  const safeMessage = escapeHtml(message)

  return [
    '✉️ <b>Someone left you a message</b>',
    '',
    '<b>Reply to</b>',
    `<a href="mailto:${safeEmail}">${safeEmail}</a>`,
    '',
    '<b>They wrote</b>',
    `<blockquote>${safeMessage}</blockquote>`,
  ].join('\n')
}

/**
 * @param {import('node:http').IncomingMessage} req
 */
export async function handleContactRequest(req) {
  const method = (req.method || 'GET').toUpperCase()
  if (method !== 'POST') {
    return { status: 405, body: { error: 'Method not allowed' } }
  }

  if (!allowRequest(clientIp(req))) {
    return { status: 429, body: { error: 'Too many messages. Try again in a minute.' } }
  }

  let payload
  try {
    payload = await readJsonBody(req)
  } catch (error) {
    return {
      status: error?.status || 400,
      body: { error: error instanceof Error ? error.message : 'Invalid request' },
    }
  }

  // Honeypot — bots fill hidden fields; humans never see it.
  if (typeof payload.company === 'string' && payload.company.trim()) {
    return { status: 200, body: { ok: true } }
  }

  const email = sanitizeLine(payload.email || '')
  const message = String(payload.message || '')
    .replace(/\r\n/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n')
    .trim()

  if (!email || email.length > MAX_EMAIL_LENGTH || !emailPattern.test(email)) {
    return { status: 400, body: { error: 'A valid email is required.' } }
  }

  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return {
      status: 400,
      body: { error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters.` },
    }
  }

  let token
  let chatId
  try {
    token = requireServerEnv('TELEGRAM_BOT_TOKEN')
    chatId = requireServerEnv('TELEGRAM_CHAT_ID')
  } catch (error) {
    return {
      status: 503,
      body: { error: error instanceof Error ? error.message : 'Missing Telegram config' },
    }
  }

  const telegramUrl = `https://api.telegram.org/bot${token}/sendMessage`
  const upstream = await fetch(telegramUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: buildTelegramText(email, message),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  })

  if (!upstream.ok) {
    let detail = `Telegram error: ${upstream.status}`
    try {
      const body = await upstream.json()
      if (body?.description) detail = body.description
    } catch {
      /* keep status-based detail */
    }
    return { status: 502, body: { error: detail } }
  }

  return { status: 200, body: { ok: true } }
}
