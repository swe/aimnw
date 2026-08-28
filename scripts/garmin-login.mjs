#!/usr/bin/env node
/**
 * One-time Garmin Connect login. Writes DI OAuth tokens to .garmin-session.json.
 *
 * Garmin has no personal API. This uses Connect's mobile SSO, then falls back
 * to pasting a short-lived service ticket from the browser if Cloudflare blocks
 * automated login.
 *
 * Usage: pnpm garmin:login
 *
 * Optional .env:
 *   GARMIN_EMAIL=
 *   GARMIN_PASSWORD=
 *   GARMIN_SESSION_FILE=   (default .garmin-session.json)
 */
import readline from 'node:readline'
import { stdin as input, stdout as output } from 'node:process'
import {
  ANDROID_SERVICE_URL,
  exchangeServiceTicket,
  loadDotEnv,
  loginWithPassword,
  readSessionFile,
  sessionFilePath,
  verifySession,
  writeSessionFile,
} from '../server/garminSession.mjs'

loadDotEnv()

function question(promptText) {
  const rl = readline.createInterface({ input, output })
  return new Promise((resolve) => {
    rl.question(promptText, (answer) => {
      rl.close()
      resolve(String(answer || '').trim())
    })
  })
}

function hiddenQuestion(promptText) {
  return new Promise((resolve) => {
    output.write(promptText)
    const stdin = input
    const wasRaw = stdin.isRaw
    if (stdin.isTTY) stdin.setRawMode(true)
    stdin.resume()
    stdin.setEncoding('utf8')
    let value = ''
    const onData = (char) => {
      if (char === '\n' || char === '\r' || char === '\u0004') {
        cleanup()
        output.write('\n')
        resolve(value)
        return
      }
      if (char === '\u0003') {
        cleanup()
        output.write('\n')
        process.exit(1)
      }
      if (char === '\u007f' || char === '\b') {
        value = value.slice(0, -1)
        return
      }
      value += char
    }
    function cleanup() {
    stdin.removeListener('data', onData)
    if (stdin.isTTY) stdin.setRawMode(Boolean(wasRaw))
    }
    stdin.on('data', onData)
  })
}

const TICKET_SIGNIN =
  'https://sso.garmin.com/mobile/sso/en_US/sign-in?clientId=GCM_ANDROID_DARK&service=https://mobile.integration.garmin.com/gcm/android'

function printTicketHelp() {
  console.log(`
Automated login was blocked (Cloudflare / rate limit). Paste a service ticket instead:

  1. Open this URL and log in:
     ${TICKET_SIGNIN}
  2. Before submitting, open DevTools → Network and filter: mobile/api/login
  3. After login, open the POST login response and copy serviceTicketId
     (starts with ST-). Tickets expire in seconds — paste immediately.
`)
}

async function saveAndVerify(session) {
  writeSessionFile(session)
  const who = await verifySession()
  console.log(`\nSaved Garmin session to ${sessionFilePath()}`)
  console.log(`Verified as ${who}. Restart the dev server, then reload /sport.\n`)
}

const existing = readSessionFile()
if (existing) {
  const again = await question('A Garmin session already exists. Overwrite? [y/N] ')
  if (!/^y(es)?$/i.test(again)) {
    console.log('Kept the existing session.')
    process.exit(0)
  }
}

const email = process.env.GARMIN_EMAIL?.trim() || (await question('Garmin email: '))
const password =
  process.env.GARMIN_PASSWORD?.trim() || (await hiddenQuestion('Garmin password: '))

if (!email || !password) {
  console.error('Email and password are required (or paste a service ticket after a failed login).')
}

let session = null
if (email && password) {
  try {
    console.log('\nTrying Garmin mobile login…')
    session = await loginWithPassword(email, password, async (method) => {
      return question(`MFA code (${method}): `)
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    if (reason === 'invalid_credentials') {
      console.error('\nGarmin rejected the email/password.')
      process.exit(1)
    }
    if (reason === 'mfa_failed') {
      console.error('\nMFA verification failed.')
      process.exit(1)
    }
    console.log(`\nPassword login failed (${reason}).`)
  }
}

if (!session) {
  printTicketHelp()
  const ticket = await question('Service ticket (ST-…): ')
  if (!ticket) {
    console.error('No ticket provided.')
    process.exit(1)
  }
  const service =
    (await question(`Service URL [${ANDROID_SERVICE_URL}]: `)) || ANDROID_SERVICE_URL
  session = await exchangeServiceTicket(ticket, service)
}

try {
  await saveAndVerify(session)
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
}
