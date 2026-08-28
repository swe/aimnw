export function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseCoordinate(value: string): { lat: number; lng: number } | null {
  const [latRaw, lngRaw] = value.split(',').map((part) => part.trim())
  const lat = Number(latRaw)
  const lng = Number(lngRaw)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/** Convert trusted API HTML notes into plain text with line breaks preserved. */
export function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export type BookNoteBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'quote'; text: string }

/**
 * Books API notes are HTML: `<br />` / `<br /><br />` for breaks, and
 * `<blockquote>` around extracts. Turn that into renderable blocks.
 */
export function parseBookNotes(html: string): BookNoteBlock[] {
  const source = html.trim()
  if (!source) return []

  const chunks = source.split(/(<blockquote\b[^>]*>[\s\S]*?<\/blockquote>)/gi)
  const blocks: BookNoteBlock[] = []

  for (const chunk of chunks) {
    if (!chunk.trim()) continue

    const quoted = chunk.match(/^<blockquote\b[^>]*>([\s\S]*?)<\/blockquote>$/i)
    if (quoted) {
      const text = unwrapOuterQuotes(cleanNoteHtml(quoted[1]))
      if (text) blocks.push({ type: 'quote', text })
      continue
    }

    for (const paragraph of splitNoteParagraphs(chunk)) {
      const extract = asQuotedParagraph(paragraph)
      blocks.push(extract ? { type: 'quote', text: extract } : { type: 'paragraph', text: paragraph })
    }
  }

  return blocks
}

function splitNoteParagraphs(html: string): string[] {
  return cleanNoteHtml(html.replace(/<\/p>/gi, '\n').replace(/<p\b[^>]*>/gi, '\n'))
    .split(/\n+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

function cleanNoteHtml(html: string): string {
  return decodeHtmlEntities(html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, ''))
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim()
}

/** Drop wrapping quotation marks so the blockquote can carry the punctuation. */
function unwrapOuterQuotes(text: string): string {
  return asQuotedParagraph(text) ?? text
}

function asQuotedParagraph(text: string): string | null {
  const match = text.match(/^[“"‘']([\s\S]+)[”"’']$/)
  if (!match) return null
  const inner = match[1].trim()
  if (inner.length < 12) return null
  return inner
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
}
