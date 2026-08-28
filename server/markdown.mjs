const IMAGE_RE = /!\[([^\]]*)]\(([^)\s]+)(?:\s+"([^"]*)")?\)/

export function resolveImageSrc(href, resourceUrl) {
  const joplin = href.match(/^:\/([a-f0-9]+)$/i)
  if (joplin) return resourceUrl(joplin[1])
  return href
}

function skipCodeSpan(input, i) {
  if (input[i] !== '`') return i
  const end = input.indexOf('`', i + 1)
  return end === -1 ? i : end + 1
}

function findCloser(input, start, delim) {
  let i = start
  while (i < input.length) {
    const next = skipCodeSpan(input, i)
    if (next !== i) {
      i = next
      continue
    }
    if ((delim === '*' && input.startsWith('**', i)) || (delim === '_' && input.startsWith('__', i))) {
      i += 2
      continue
    }
    if (input.startsWith(delim, i)) {
      if ((delim === '**' && input[i + 2] === '*') || (delim === '__' && input[i + 2] === '_')) {
        i += 1
        continue
      }
      return i
    }
    i += 1
  }
  return -1
}

function parseBracketSpan(input, i) {
  if (input[i] !== '[') return null
  let depth = 1
  let j = i + 1
  while (j < input.length && depth > 0) {
    if (input[j] === '\\') {
      j += 2
      continue
    }
    if (input[j] === '[') depth += 1
    else if (input[j] === ']') depth -= 1
    if (depth > 0) j += 1
  }
  if (depth !== 0) return null
  return { text: input.slice(i + 1, j), end: j + 1 }
}

function parseLinkInner(input, i) {
  const span = parseBracketSpan(input, i)
  if (!span) return null
  if (input[span.end] !== '(') return null
  const close = input.indexOf(')', span.end + 1)
  if (close === -1) return null
  return { label: span.text, href: splitMdHref(input.slice(span.end + 1, close)), end: close + 1 }
}

function splitMdHref(raw) {
  const trimmed = raw.trim()
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) return trimmed.slice(1, -1).trim()
  const match = trimmed.match(/^(\S+?)(?:\s+(".*"|'.*'))?$/)
  return match ? match[1] : trimmed
}

function parseHtmlAnchor(input, i) {
  if (!/^<a[\s>]/i.test(input.slice(i, i + 8))) return null
  const gt = input.indexOf('>', i)
  if (gt === -1 || gt - i > 400) return null
  const attrs = input.slice(i + 2, gt)
  const hrefMatch = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)'|(\S+))/i)
  const href = hrefMatch?.[2] ?? hrefMatch?.[3] ?? hrefMatch?.[4]
  const close = input.toLowerCase().indexOf('</a>', gt + 1)
  if (close === -1) return null
  return { href: href ?? '', inner: input.slice(gt + 1, close), end: close + 4 }
}

function slugifyHeading(value) {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function uniqueHeadingId(base, used) {
  let id = base || 'section'
  if (!used.has(id)) {
    used.add(id)
    return id
  }
  let n = 1
  while (used.has(`${id}-${n}`)) n += 1
  const next = `${id}-${n}`
  used.add(next)
  return next
}

function peelHeadingId(raw) {
  const match = raw.match(/^(.*?)\s*\{#([A-Za-z][\w:.-]*)\}\s*$/)
  if (!match) return { text: raw.trim(), explicit: '' }
  return { text: match[1].trim(), explicit: match[2] }
}

function createFootnoteState() {
  return { defs: new Map(), seq: 0 }
}

function isWordChar(ch) {
  return Boolean(ch) && /[\p{L}\p{N}]/u.test(ch)
}

function wrapEmphasis(kind, inner) {
  if (kind === 'both') return { t: 'strong', c: [{ t: 'em', c: inner }] }
  return { t: kind, c: inner }
}

function takeEmphasis(input, i, delim, kind, resourceUrl, fn) {
  if (!input.startsWith(delim, i)) return null
  if (delim.includes('_') && isWordChar(input[i - 1])) return null
  const close = findCloser(input, i + delim.length, delim)
  if (close <= i) return null
  if (delim.includes('_') && isWordChar(input[close + delim.length])) return null
  return {
    node: wrapEmphasis(kind, parseInlines(input.slice(i + delim.length, close), resourceUrl, fn)),
    end: close + delim.length,
  }
}

export function parseInlines(input, resourceUrl, fn = createFootnoteState()) {
  /** @type {Array<Record<string, unknown>>} */
  const nodes = []
  const pushText = (value) => {
    if (!value) return
    const last = nodes[nodes.length - 1]
    if (last && last.t === 'text') last.v += value
    else nodes.push({ t: 'text', v: value })
  }

  let i = 0
  while (i < input.length) {
    if (input[i] === '`') {
      const end = input.indexOf('`', i + 1)
      if (end > i) {
        nodes.push({ t: 'code', v: input.slice(i + 1, end) })
        i = end + 1
        continue
      }
    }

    if (input.startsWith('![', i)) {
      const parsed = parseLinkInner(input, i + 1)
      if (parsed) {
        nodes.push({
          t: 'image',
          src: resolveImageSrc(parsed.href, resourceUrl),
          alt: parsed.label || 'Image',
        })
        i = parsed.end
        continue
      }
    }

    if (input.startsWith('[^', i)) {
      const span = parseBracketSpan(input, i)
      if (span?.text.startsWith('^')) {
        const id = span.text.slice(1).trim()
        if (id) {
          nodes.push({ t: 'footnoteRef', id, n: 0 })
          i = span.end
          continue
        }
      }
    }

    if (input.startsWith('^[', i)) {
      const span = parseBracketSpan(input, i + 1)
      if (span) {
        fn.seq += 1
        const id = `fn-inline-${fn.seq}`
        fn.defs.set(id, parseInlines(span.text, resourceUrl, fn))
        nodes.push({ t: 'footnoteRef', id, n: 0 })
        i = span.end
        continue
      }
    }

    if (input[i] === '[') {
      const parsed = parseLinkInner(input, i)
      if (parsed) {
        nodes.push({
          t: 'link',
          href: parsed.href,
          c: parseInlines(parsed.label, resourceUrl, fn),
        })
        i = parsed.end
        continue
      }
    }

    const htmlAnchor = parseHtmlAnchor(input, i)
    if (htmlAnchor) {
      if (htmlAnchor.href) {
        nodes.push({
          t: 'link',
          href: htmlAnchor.href,
          c: parseInlines(htmlAnchor.inner.replace(/<[^>]+>/g, ''), resourceUrl, fn),
        })
      }
      i = htmlAnchor.end
      continue
    }

    const tripleStar = takeEmphasis(input, i, '***', 'both', resourceUrl, fn)
    if (tripleStar) {
      nodes.push(tripleStar.node)
      i = tripleStar.end
      continue
    }

    const doubleStar = takeEmphasis(input, i, '**', 'strong', resourceUrl, fn)
    if (doubleStar) {
      nodes.push(doubleStar.node)
      i = doubleStar.end
      continue
    }

    const tripleUnder = takeEmphasis(input, i, '___', 'both', resourceUrl, fn)
    if (tripleUnder) {
      nodes.push(tripleUnder.node)
      i = tripleUnder.end
      continue
    }

    const doubleUnder = takeEmphasis(input, i, '__', 'strong', resourceUrl, fn)
    if (doubleUnder) {
      nodes.push(doubleUnder.node)
      i = doubleUnder.end
      continue
    }

    if (input.startsWith('~~', i)) {
      const close = findCloser(input, i + 2, '~~')
      if (close > i) {
        nodes.push({ t: 'del', c: parseInlines(input.slice(i + 2, close), resourceUrl, fn) })
        i = close + 2
        continue
      }
    }

    if (input.startsWith('==', i)) {
      const close = findCloser(input, i + 2, '==')
      if (close > i) {
        nodes.push({ t: 'mark', c: parseInlines(input.slice(i + 2, close), resourceUrl, fn) })
        i = close + 2
        continue
      }
    }

    const star = takeEmphasis(input, i, '*', 'em', resourceUrl, fn)
    if (star) {
      nodes.push(star.node)
      i = star.end
      continue
    }

    const under = takeEmphasis(input, i, '_', 'em', resourceUrl, fn)
    if (under) {
      nodes.push(under.node)
      i = under.end
      continue
    }

    pushText(input[i])
    i += 1
  }

  return nodes
}

function splitCells(line) {
  let trimmed = line.trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|')) trimmed = trimmed.slice(0, -1)
  return trimmed.split('|').map((cell) => cell.trim())
}

function isTableSep(line) {
  const cells = splitCells(line)
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function listMarker(line) {
  const match = line.match(/^(\s*)([-*+]|\d+[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/)
  if (!match) return null
  const marker = match[2]
  const ordered = /^\d+[.)]$/.test(marker)
  return {
    indent: match[1].replace(/\t/g, '    ').length,
    ordered,
    start: ordered ? Number.parseInt(marker, 10) : undefined,
    checked: match[3] === undefined ? undefined : match[3] !== ' ',
    text: match[4],
  }
}

function parseFootnoteDef(lines, start) {
  const match = lines[start].match(/^ {0,3}\[\^([^\s\]]+)\]:\s?(.*)$/)
  if (!match) return null
  const parts = [match[2]]
  let i = start + 1
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      const peek = lines[i + 1]
      if (peek && /^(\t| {2,})\S/.test(peek)) {
        parts.push('')
        i += 1
        continue
      }
      break
    }
    if (/^(\t| {2,})/.test(line) && !listMarker(line)) {
      parts.push(line.trim())
      i += 1
      continue
    }
    break
  }
  return {
    id: match[1],
    text: parts.join(' ').replace(/\s+/g, ' ').trim(),
    end: i,
  }
}

function isDuplicateTitleHeading(line, title) {
  const match = line.match(/^#\s+(.+)$/)
  if (!match || !title) return false
  return match[1].trim().replace(/^"|"$/g, '') === title
}

function extractLineImages(line, resourceUrl) {
  const images = []
  const re = new RegExp(IMAGE_RE.source, 'g')
  for (const match of line.matchAll(re)) {
    images.push({
      src: resolveImageSrc(match[2], resourceUrl),
      alt: match[1] || match[3] || 'Image',
      caption: match[3] || undefined,
    })
  }
  const leftover = line.replace(new RegExp(IMAGE_RE.source, 'g'), '').trim()
  return { images, leftover }
}

function parseList(lines, start, resourceUrl, fn) {
  const first = listMarker(lines[start])
  if (!first) return null

  const items = []
  let i = start
  const baseIndent = first.indent

  while (i < lines.length) {
    const marker = listMarker(lines[i])
    if (!marker) {
      if (lines[i].trim() === '') {
        const peek = lines[i + 1]
        if (peek && listMarker(peek)) {
          i += 1
          continue
        }
      }
      break
    }
    if (marker.indent < baseIndent) break
    if (marker.indent === baseIndent && marker.ordered !== first.ordered) break
    if (marker.indent > baseIndent) {
      const nested = parseList(lines, i, resourceUrl, fn)
      if (!nested || !items.length) break
      const last = items[items.length - 1]
      last.childList = {
        ordered: nested.item.ordered,
        items: nested.item.items,
        ...(nested.item.start && nested.item.start !== 1 ? { start: nested.item.start } : {}),
      }
      i = nested.end
      continue
    }
    const item = { content: parseInlines(marker.text, resourceUrl, fn) }
    if (marker.checked !== undefined) item.checked = marker.checked
    items.push(item)
    i += 1
  }

  return {
    end: i,
    item: {
      type: 'list',
      ordered: first.ordered,
      items,
      ...(first.ordered && first.start !== 1 ? { start: first.start } : {}),
    },
  }
}

function walkInlines(nodes, visit) {
  for (const node of nodes) {
    visit(node)
    if (Array.isArray(node.c)) walkInlines(node.c, visit)
  }
}

function collectFootnotes(blocks, fn) {
  const items = []
  const numbers = new Map()

  function take(id) {
    if (numbers.has(id)) return
    const n = items.length + 1
    numbers.set(id, n)
    const inlines = fn.defs.get(id) ?? []
    items.push({ id, n, inlines })
    visit(inlines)
  }

  function visit(nodes) {
    walkInlines(nodes, (node) => {
      if (node.t === 'footnoteRef') {
        take(node.id)
        node.n = numbers.get(node.id)
      }
    })
  }

  function visitItems(listItems) {
    for (const item of listItems) {
      visit(item.content)
      if (item.childList) visitItems(item.childList.items)
    }
  }

  for (const block of blocks) {
    if (block.inlines) visit(block.inlines)
    else if (block.type === 'list') visitItems(block.items)
    else if (block.type === 'table') {
      for (const cell of block.headers) visit(cell)
      for (const row of block.rows) {
        for (const cell of row) visit(cell)
      }
    }
  }

  return items
}

function flushImages(blocks, imageRun) {
  if (imageRun.length === 1) blocks.push({ type: 'image', image: imageRun[0] })
  else if (imageRun.length > 1) blocks.push({ type: 'imageGrid', images: [...imageRun] })
  imageRun.length = 0
}

export function markdownToBlocks(markdown, title = '', resourceUrl = (id) => id) {
  const source = String(markdown).replace(/\r\n/g, '\n')
  const lines = source.split('\n')
  const fn = createFootnoteState()
  const headingIds = new Set()
  /** @type {Array<Record<string, unknown>>} */
  const blocks = []
  /** @type {Array<{ src: string; alt: string; caption?: string }>} */
  const imageRun = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) {
      i += 1
      continue
    }

    if (line.trimStart().startsWith('```')) {
      flushImages(blocks, imageRun)
      const lang = line.trimStart().slice(3).trim()
      const body = []
      i += 1
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        body.push(lines[i])
        i += 1
      }
      if (i < lines.length) i += 1
      const text = body.join('\n')
      if (lang.toLowerCase() === 'mermaid') {
        blocks.push({ type: 'mermaid', text })
      } else {
        blocks.push({ type: 'code', lang: lang || undefined, text })
      }
      continue
    }

    if (isDuplicateTitleHeading(line, title)) {
      i += 1
      continue
    }

    const footnote = parseFootnoteDef(lines, i)
    if (footnote) {
      flushImages(blocks, imageRun)
      if (!fn.defs.has(footnote.id)) {
        fn.defs.set(footnote.id, parseInlines(footnote.text, resourceUrl, fn))
      }
      i = footnote.end
      continue
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/)
    if (heading) {
      flushImages(blocks, imageRun)
      const peeled = peelHeadingId(heading[2])
      blocks.push({
        type: 'heading',
        level: heading[1].length,
        id: uniqueHeadingId(peeled.explicit || slugifyHeading(peeled.text), headingIds),
        inlines: parseInlines(peeled.text, resourceUrl, fn),
      })
      i += 1
      continue
    }

    if (line.trim() === '---' || line.trim() === '***') {
      flushImages(blocks, imageRun)
      blocks.push({ type: 'rule' })
      i += 1
      continue
    }

    if (line.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      flushImages(blocks, imageRun)
      const headers = splitCells(line).map((cell) => parseInlines(cell, resourceUrl, fn))
      const rows = []
      i += 2
      while (i < lines.length && lines[i].includes('|') && lines[i].trim()) {
        rows.push(splitCells(lines[i]).map((cell) => parseInlines(cell, resourceUrl, fn)))
        i += 1
      }
      blocks.push({ type: 'table', headers, rows })
      continue
    }

    if (listMarker(line)) {
      flushImages(blocks, imageRun)
      const nested = parseList(lines, i, resourceUrl, fn)
      if (nested) {
        blocks.push(nested.item)
        i = nested.end
        continue
      }
    }

    if (line.trimStart().startsWith('>')) {
      flushImages(blocks, imageRun)
      const quoted = []
      while (i < lines.length && lines[i].trimStart().startsWith('>')) {
        quoted.push(lines[i].replace(/^\s*>\s?/, ''))
        i += 1
      }
      blocks.push({
        type: 'quote',
        inlines: parseInlines(quoted.join(' ').trim(), resourceUrl, fn),
      })
      continue
    }

    const { images, leftover } = extractLineImages(line, resourceUrl)
    if (images.length && !leftover) {
      imageRun.push(...images)
      i += 1
      continue
    }

    flushImages(blocks, imageRun)
    const para = [line]
    i += 1
    while (i < lines.length) {
      const next = lines[i]
      if (!next.trim()) break
      if (next.trimStart().startsWith('```')) break
      if (next.match(/^#{1,4}\s+/)) break
      if (listMarker(next)) break
      if (parseFootnoteDef(lines, i)) break
      if (next.trimStart().startsWith('>')) break
      if (next.includes('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) break
      para.push(next)
      i += 1
    }
    const text = para.join('\n').replace(/\n+/g, ' ').trim()
    if (text) {
      blocks.push({ type: 'paragraph', inlines: parseInlines(text, resourceUrl, fn) })
    }
  }

  flushImages(blocks, imageRun)
  const footnotes = collectFootnotes(blocks, fn)
  if (footnotes.length) blocks.push({ type: 'footnotes', items: footnotes })
  if (!blocks.length) {
    blocks.push({ type: 'paragraph', inlines: parseInlines(source.trim() || '…', resourceUrl, fn) })
  }
  return blocks
}
