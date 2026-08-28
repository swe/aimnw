import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Local .env wins for these so Vite middleware picks up edits without a restart. */
const DOTENV_WINS = /^(TELEGRAM_|DISCOGS_|HEVY_|JOPLIN_|OURA_|GARMIN_|MAPKIT_)/

export function loadDotEnv() {
  try {
    const raw = readFileSync(path.join(rootDir, '.env'), 'utf8')
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
      if (DOTENV_WINS.test(key) || !(key in process.env)) {
        process.env[key] = value
      }
    }
  } catch {
    /* host-injected env is enough */
  }
}

export function requireServerEnv(name) {
  loadDotEnv()
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing ${name}`)
  }
  return value
}

export function optionalServerEnv(name) {
  loadDotEnv()
  return process.env[name]?.trim() || ''
}

export { rootDir }
