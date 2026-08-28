import { requireServerEnv } from './env.mjs'
import { withTtlCache } from './ttlCache.mjs'

const CHANGE_DELETE = 3
const NOTE_TYPE = 1
const DELTA_LIMIT = 100
const NOTE_FETCH_CONCURRENCY = 8
const CONTENT_TTL_MS = 60_000

function baseUrl() {
  return requireServerEnv('JOPLIN_BASE_URL').replace(/\/$/, '')
}

function folderId() {
  return requireServerEnv('JOPLIN_FOLDER_ID')
}

function useFolderId() {
  return requireServerEnv('JOPLIN_USE_FOLDER_ID')
}

/** @type {{ id: string; expiresAt: number } | null} */
let sessionCache = null
/** @type {Promise<string> | null} */
let sessionRequest = null

async function createSession() {
  const response = await fetch(`${baseUrl()}/api/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email: requireServerEnv('JOPLIN_EMAIL'),
      password: requireServerEnv('JOPLIN_PASSWORD'),
    }),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok || !payload?.id) {
    throw new Error(
      typeof payload.error === 'string' ? payload.error : 'Joplin login failed',
    )
  }

  sessionCache = { id: payload.id, expiresAt: Date.now() + 6 * 60 * 60 * 1000 }
  return sessionCache.id
}

/** Parallel note fetches share one login instead of racing to create sessions. */
function getSessionId(force = false) {
  if (!force && sessionCache && sessionCache.expiresAt > Date.now()) {
    return Promise.resolve(sessionCache.id)
  }
  if (sessionRequest) return sessionRequest

  sessionRequest = createSession().finally(() => {
    sessionRequest = null
  })
  return sessionRequest
}

async function joplinFetch(pathname, options = {}) {
  const { raw = false, retry = true } = options
  const sessionId = await getSessionId()
  const url = `${baseUrl()}${pathname}`
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: raw ? '*/*' : 'application/json',
      'X-API-AUTH': sessionId,
    },
  })

  if (response.status === 403 && retry) {
    sessionCache = null
    await getSessionId(true)
    return joplinFetch(pathname, { ...options, retry: false })
  }

  return response
}

function itemContentPath(itemName) {
  return `/api/items/root:/${itemName}:/content`
}

function parseFieldBlock(block) {
  /** @type {Record<string, string>} */
  const fields = {}
  for (const line of block.split('\n')) {
    const index = line.indexOf(':')
    if (index <= 0) continue
    fields[line.slice(0, index)] = line.slice(index + 1).trim()
  }
  return fields
}

function parseJoplinItem(raw) {
  const text = String(raw).replace(/\r\n/g, '\n').replace(/^\uFEFF/, '')
  const trimmed = text.trim()
  if (trimmed.startsWith('{')) {
    const payload = JSON.parse(trimmed)
    throw new Error(
      typeof payload.error === 'string' ? payload.error : 'Joplin item error',
    )
  }

  /** @type {Record<string, string>} */
  let fields = {}
  let main = text.trimEnd()

  const trailing = main.match(
    /\n(id: [a-f0-9]{32}\n(?:[a-z0-9_]+:[^\n]*\n)*[a-z0-9_]+:[^\n]*)\s*$/i,
  )
  if (trailing) {
    fields = parseFieldBlock(trailing[1])
    main = main.slice(0, trailing.index).trimEnd()
  }

  if (main.trimStart().startsWith('---')) {
    return { fields, body: main.trimStart() }
  }

  const split = main.indexOf('\n\n')
  const head = split === -1 ? main : main.slice(0, split)
  let body = split === -1 ? '' : main.slice(split + 2)
  const headLines = head.split('\n').filter((line) => line.length > 0)
  const headIsFields =
    headLines.length > 0 &&
    headLines.every((line) => /^[a-z0-9_]+:(?:\s|$)/i.test(line))

  if (headIsFields) {
    fields = { ...parseFieldBlock(head), ...fields }
  } else if (headLines.length === 1) {
    fields.title = fields.title || headLines[0].trim()
  } else if (head.trimStart().startsWith('---')) {
    body = main.trimStart()
  }

  if (!body && fields.body) body = fields.body
  return { fields, body }
}

function unquote(value) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

function parseYamlFrontmatter(yaml) {
  /** @type {Record<string, string>} */
  const meta = {}
  for (const line of yaml.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/)
    if (!match) continue
    meta[match[1].toLowerCase()] = unquote(match[2])
  }
  return meta
}

function peelMeta(body) {
  const text = body.replace(/^\uFEFF/, '').replace(/^\s+/, '')
  if (text.startsWith('---')) {
    const afterOpen = text.slice(3).replace(/^\r?\n/, '')
    const close = afterOpen.search(/\r?\n---[ \t]*(?:\r?\n|$)/)
    if (close >= 0) {
      const yaml = afterOpen.slice(0, close)
      const rest = afterOpen.slice(close).replace(/^\r?\n---[ \t]*/, '')
      return {
        meta: parseYamlFrontmatter(yaml),
        body: rest.replace(/^\r?\n/, '').trim(),
      }
    }
  }

  const lines = text.split(/\r?\n/)
  /** @type {Record<string, string>} */
  const meta = {}
  let index = 0
  while (index < lines.length) {
    const match = lines[index].match(
      /^(slug|excerpt|description|title|date|link|image|category)\s*:\s*(.+)\s*$/i,
    )
    if (!match) break
    meta[match[1].toLowerCase()] = unquote(match[2])
    index += 1
  }
  if (index < lines.length && lines[index].trim() === '') index += 1
  return { meta, body: lines.slice(index).join('\n').trim() }
}

function slugify(value) {
  const slug = value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || 'note'
}

function dateFromFields(fields) {
  const ms = Number(fields.user_created_time || fields.created_time || '')
  if (Number.isFinite(ms) && ms > 0) {
    return new Date(ms).toISOString().slice(0, 10)
  }
  return new Date().toISOString().slice(0, 10)
}

function excerptFrom(body, fallback) {
  const plain = body
    .replace(/!\[[^\]]*]\([^)]+\)/g, '')
    .replace(/[#>*_`~\-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!plain) return fallback
  return plain.length > 180 ? `${plain.slice(0, 177).trimEnd()}…` : plain
}

import { markdownToBlocks } from './markdown.mjs'

function resourceUrl(id) {
  return `/api/joplin/resources/${id}`
}

async function listLiveItemNames() {
  /** @type {Map<string, number>} */
  const latest = new Map()
  let cursor = ''

  for (;;) {
    const query = new URLSearchParams({ limit: String(DELTA_LIMIT) })
    if (cursor) query.set('cursor', cursor)
    const response = await joplinFetch(`/api/items/root/delta?${query}`)
    const payload = await response.json()
    if (!response.ok) {
      throw new Error(
        typeof payload.error === 'string' ? payload.error : 'Joplin delta failed',
      )
    }

    for (const change of payload.items ?? []) {
      const name = change.item_name
      if (!name || name.startsWith('.resource/')) continue
      if (!name.endsWith('.md')) continue
      if (change.type === CHANGE_DELETE) {
        latest.delete(name)
      } else {
        latest.set(name, change.type)
      }
    }

    if (!payload.has_more) break
    cursor = payload.cursor
    if (!cursor) break
  }

  return [...latest.keys()]
}

async function loadNote(itemName) {
  const response = await joplinFetch(itemContentPath(itemName), { raw: true })
  const raw = await response.text()
  if (!response.ok) {
    throw new Error(`Unable to load ${itemName}`)
  }
  return parseJoplinItem(raw)
}

function uniqueSlug(base, fields, usedSlugs) {
  let slug = slugify(base)
  if (usedSlugs.has(slug)) {
    slug = `${slug}-${String(fields.id || '').slice(0, 6)}`
  }
  usedSlugs.add(slug)
  return slug
}

function toPost(fields, body, usedSlugs) {
  if (Number(fields.type_) !== NOTE_TYPE) return null
  if (fields.parent_id !== folderId()) return null
  if (fields.encryption_applied === '1') return null

  const peeled = peelMeta(body)
  const title = unquote(peeled.meta.title || fields.title || 'Untitled')
  const slug = uniqueSlug(peeled.meta.slug || title, fields, usedSlugs)

  const date = /^\d{4}-\d{2}-\d{2}/.test(peeled.meta.date || '')
    ? peeled.meta.date.slice(0, 10)
    : dateFromFields(fields)

  const excerpt =
    peeled.meta.description ||
    peeled.meta.excerpt ||
    excerptFrom(peeled.body, title)

  return {
    id: fields.id,
    slug,
    title,
    date,
    excerpt,
    body: markdownToBlocks(peeled.body, title, resourceUrl),
  }
}

function toUseItem(fields, body, usedSlugs) {
  if (Number(fields.type_) !== NOTE_TYPE) return null
  if (fields.parent_id !== useFolderId()) return null
  if (fields.encryption_applied === '1') return null

  const peeled = peelMeta(body)
  const title = unquote(peeled.meta.title || fields.title || 'Untitled')
  const slug = uniqueSlug(peeled.meta.slug || title, fields, usedSlugs)
  const category = unquote(peeled.meta.category || 'Gear')

  return {
    id: fields.id,
    slug,
    title,
    summary:
      peeled.meta.description ||
      peeled.meta.excerpt ||
      excerptFrom(peeled.body, title),
    category,
    link: peeled.meta.link || '',
    image: peeled.meta.image || '',
    body: markdownToBlocks(peeled.body, title, resourceUrl),
  }
}

/** Runs `task` over `items` with a bounded worker pool, keeping input order. */
async function mapWithConcurrency(items, limit, task) {
  const results = new Array(items.length)
  let next = 0

  async function worker() {
    for (;;) {
      const index = next
      next += 1
      if (index >= items.length) return
      results[index] = await task(items[index])
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  )
  return results
}

/**
 * One notebook scan feeds both posts and use items. Slug assignment depends on
 * item order, so results stay in the order `listLiveItemNames` returned.
 */
const loadRawNotes = withTtlCache(async () => {
  const names = await listLiveItemNames()
  const notes = await mapWithConcurrency(names, NOTE_FETCH_CONCURRENCY, async (name) => {
    try {
      return await loadNote(name)
    } catch {
      return null
    }
  })
  return notes.filter(Boolean)
}, CONTENT_TTL_MS)

async function loadMappedNotes(mapItem, sort) {
  const notes = await loadRawNotes()
  const usedSlugs = new Set()
  const items = []

  for (const { fields, body } of notes) {
    try {
      const item = mapItem(fields, body, usedSlugs)
      if (item) items.push(item)
    } catch {
      /* skip unreadable items */
    }
  }

  items.sort(sort)
  return items
}

const loadPosts = withTtlCache(
  () =>
    loadMappedNotes(toPost, (a, b) =>
      b.date.localeCompare(a.date) || a.title.localeCompare(b.title),
    ),
  CONTENT_TTL_MS,
)

const loadUseItems = withTtlCache(
  () => loadMappedNotes(toUseItem, (a, b) => a.title.localeCompare(b.title)),
  CONTENT_TTL_MS,
)

function jsonResult(status, body) {
  return { status, body }
}

function bytesResult(status, buffer, contentType) {
  return { status, buffer, contentType }
}

/**
 * @param {string} [method]
 * @param {string} [pathname]
 */
export async function handleJoplinRequest(method = 'GET', pathname = '/api/joplin/posts') {
  if (method !== 'GET') {
    return jsonResult(405, { error: 'Method not allowed' })
  }

  try {
    if (pathname === '/api/joplin/posts') {
      const posts = await loadPosts()
      return jsonResult(200, {
        posts: posts.map(({ id: _id, ...rest }) => rest),
      })
    }

    const postMatch = pathname.match(/^\/api\/joplin\/posts\/([^/]+)$/)
    if (postMatch) {
      const slug = decodeURIComponent(postMatch[1])
      const posts = await loadPosts()
      const post = posts.find((entry) => entry.slug === slug)
      if (!post) return jsonResult(404, { error: 'Not found' })
      return jsonResult(200, post)
    }

    if (pathname === '/api/joplin/use') {
      const items = await loadUseItems()
      return jsonResult(200, {
        items: items.map(({ id: _id, ...rest }) => rest),
      })
    }

    const useMatch = pathname.match(/^\/api\/joplin\/use\/([^/]+)$/)
    if (useMatch) {
      const slug = decodeURIComponent(useMatch[1])
      const items = await loadUseItems()
      const item = items.find((entry) => entry.slug === slug)
      if (!item) return jsonResult(404, { error: 'Not found' })
      return jsonResult(200, item)
    }

    const resourceMatch = pathname.match(
      /^\/api\/joplin\/resources\/([a-f0-9]+)$/i,
    )
    if (resourceMatch) {
      const id = resourceMatch[1]
      const response = await joplinFetch(itemContentPath(`.resource/${id}`), {
        raw: true,
      })
      if (!response.ok) {
        return jsonResult(response.status, { error: 'Resource not found' })
      }
      const buffer = Buffer.from(await response.arrayBuffer())
      const contentType =
        response.headers.get('content-type') || 'application/octet-stream'
      return bytesResult(200, buffer, contentType)
    }

    return jsonResult(404, { error: 'Not found' })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unable to load Joplin notes'
    return jsonResult(message.startsWith('Missing ') ? 503 : 502, { error: message })
  }
}
