import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from 'react'
import { CornerLeftUp } from 'lucide-react'
import { CodeSlip } from '@/components/domain/CodeSlip'
import { MermaidSlip } from '@/components/domain/MermaidExplorer'
import type {
  FieldNoteBlock,
  FieldNoteImage,
  FieldNoteInline,
  FieldNoteListItem,
} from '@/content/fieldNotes'
import { slugify } from '@/lib/format'
import styles from '@/pages/FieldNotes.module.css'

type JumpApi = {
  go: (id: string) => void
}

const JumpContext = createContext<JumpApi>({
  go: (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  },
})

function isFootnoteAnchor(id: string) {
  return id.startsWith('fn-') && !id.startsWith('fnref-')
}

function isFootnoteHash(id: string) {
  return id.startsWith('fn-') || id.startsWith('fnref-')
}

function footnoteDomId(kind: 'fn' | 'fnref', id: string) {
  return `${kind}-${id.replace(/[^a-zA-Z0-9_-]+/g, '-')}`
}

function padNum(n: number) {
  return String(n).padStart(2, '0')
}

function pathWithoutHash() {
  return `${window.location.pathname}${window.location.search}`
}

function walkInlines(nodes: FieldNoteInline[], visit: (node: FieldNoteInline) => void) {
  for (const node of nodes) {
    visit(node)
    if (node.t === 'em' || node.t === 'strong' || node.t === 'del' || node.t === 'mark' || node.t === 'link') {
      walkInlines(node.c, visit)
    }
  }
}

function firstFootnoteRefs(blocks: FieldNoteBlock[]) {
  const seen = new Set<string>()
  const first = new WeakSet<FieldNoteInline>()
  const visit = (node: FieldNoteInline) => {
    if (node.t !== 'footnoteRef' || seen.has(node.id)) return
    seen.add(node.id)
    first.add(node)
  }
  const walkList = (items: FieldNoteListItem[]) => {
    for (const item of items) {
      walkInlines(item.content, visit)
      if (item.childList) walkList(item.childList.items)
    }
  }
  for (const block of blocks) {
    if (block.type === 'paragraph' && block.inlines) walkInlines(block.inlines, visit)
    else if (block.type === 'heading' || block.type === 'quote') walkInlines(block.inlines, visit)
    else if (block.type === 'list') walkList(block.items)
    else if (block.type === 'table') {
      for (const cell of block.headers) walkInlines(cell, visit)
      for (const row of block.rows) {
        for (const cell of row) walkInlines(cell, visit)
      }
    }
  }
  return first
}

function resolveTargetId(raw: string) {
  let id = raw.replace(/^user-content-/, '')
  try {
    id = decodeURIComponent(id)
  } catch {
    /* keep */
  }
  const slugged = slugify(id)
  if (typeof document !== 'undefined') {
    if (id && document.getElementById(id)) return id
    if (slugged && document.getElementById(slugged)) return slugged
    const known = [...document.querySelectorAll('h2[id], h3[id]')].map((el) => el.id)
    const fuzzy = known.find(
      (candidate) =>
        candidate === slugged ||
        (slugged.length > 2 && candidate.endsWith(`-${slugged}`)) ||
        (slugged.length > 2 && slugged.endsWith(`-${candidate}`)),
    )
    if (fuzzy) return fuzzy
  }
  return slugged || id
}

function hashFromHref(href: string) {
  if (!href.startsWith('#')) return ''
  return href.slice(1)
}

function FigureImage({
  image,
  onOpen,
}: {
  image: FieldNoteImage
  onOpen: () => void
}) {
  return (
    <figure className={styles.figure}>
      <button type="button" className={styles.imageButton} onClick={onOpen} aria-label={`View ${image.alt}`}>
        <img src={image.src} alt={image.alt} className={styles.image} loading="lazy" />
      </button>
      {image.caption ? <figcaption className={styles.caption}>{image.caption}</figcaption> : null}
    </figure>
  )
}

function Inlines({
  nodes,
  onOpen,
  fnFirst,
}: {
  nodes: FieldNoteInline[]
  onOpen?: (image: FieldNoteImage) => void
  fnFirst: WeakSet<FieldNoteInline>
}) {
  const { go } = useContext(JumpContext)

  return (
    <>
      {nodes.map((node, index) => {
        if (node.t === 'text') return <span key={index}>{node.v}</span>
        if (node.t === 'code') {
          return (
            <code key={index} className={styles.inlineCode}>
              {node.v}
            </code>
          )
        }
        if (node.t === 'em') {
          return (
            <em key={index} className={styles.em}>
              <Inlines nodes={node.c} onOpen={onOpen} fnFirst={fnFirst} />
            </em>
          )
        }
        if (node.t === 'strong') {
          return (
            <strong key={index} className={styles.strong}>
              <Inlines nodes={node.c} onOpen={onOpen} fnFirst={fnFirst} />
            </strong>
          )
        }
        if (node.t === 'del') {
          return (
            <del key={index} className={styles.del}>
              <Inlines nodes={node.c} onOpen={onOpen} fnFirst={fnFirst} />
            </del>
          )
        }
        if (node.t === 'mark') {
          return (
            <mark key={index} className={styles.mark}>
              <Inlines nodes={node.c} onOpen={onOpen} fnFirst={fnFirst} />
            </mark>
          )
        }
        if (node.t === 'footnoteRef') {
          const target = footnoteDomId('fn', node.id)
          const self = footnoteDomId('fnref', node.id)
          return (
            <button
              key={index}
              type="button"
              id={fnFirst.has(node) ? self : undefined}
              className={styles.fnRef}
              onClick={() => go(target)}
            >
              {padNum(node.n)}
            </button>
          )
        }
        if (node.t === 'link') {
          const hash = hashFromHref(node.href)
          const external = /^https?:\/\//i.test(node.href)
          return (
            <a
              key={index}
              href={node.href}
              className="prose-link"
              target={external ? '_blank' : undefined}
              rel={external ? 'noreferrer' : undefined}
              onClick={
                hash
                  ? (event: MouseEvent<HTMLAnchorElement>) => {
                      event.preventDefault()
                      go(hash)
                    }
                  : undefined
              }
            >
              <Inlines nodes={node.c} onOpen={onOpen} fnFirst={fnFirst} />
            </a>
          )
        }
        if (node.t === 'image') {
          const image = { src: node.src, alt: node.alt }
          return (
            <button
              key={index}
              type="button"
              className={styles.inlineImage}
              onClick={() => onOpen?.(image)}
              aria-label={`View ${node.alt}`}
            >
              <img src={node.src} alt={node.alt} />
            </button>
          )
        }
        return null
      })}
    </>
  )
}

function paragraphText(
  block: Extract<FieldNoteBlock, { type: 'paragraph' }>,
  onOpen: (image: FieldNoteImage) => void,
  fnFirst: WeakSet<FieldNoteInline>,
) {
  if (block.inlines?.length) return <Inlines nodes={block.inlines} onOpen={onOpen} fnFirst={fnFirst} />
  return block.text ?? ''
}

function ListBlock({
  ordered,
  items,
  start,
  onOpen,
  fnFirst,
}: {
  ordered: boolean
  items: FieldNoteListItem[]
  start?: number
  onOpen: (image: FieldNoteImage) => void
  fnFirst: WeakSet<FieldNoteInline>
}) {
  const Tag = ordered ? 'ol' : 'ul'
  const origin = start && start > 0 ? start : 1
  return (
    <Tag className={ordered ? `ui-list ${styles.ol}` : 'ui-list'}>
      {items.map((item, index) => {
        const isTask = item.checked !== undefined
        const kind = ordered && isTask ? 'ol-task' : ordered ? 'ol' : isTask ? 'task' : undefined
        return (
          <li
            key={index}
            className={kind ? `ui-list-item ${styles.noteItem}` : 'ui-list-item'}
            data-kind={kind}
          >
            {ordered ? <span className={styles.olNum}>{padNum(origin + index)}</span> : null}
            {isTask ? (
              <input
                className="ui-checkbox"
                type="checkbox"
                checked={Boolean(item.checked)}
                disabled
                tabIndex={-1}
                aria-hidden="true"
                onChange={() => {}}
              />
            ) : null}
            <div className={styles.liStack}>
              <span className={styles.liBody} data-checked={item.checked ? 'true' : undefined}>
                <Inlines nodes={item.content} onOpen={onOpen} fnFirst={fnFirst} />
              </span>
              {item.childList ? (
                <ListBlock
                  ordered={item.childList.ordered}
                  items={item.childList.items}
                  start={item.childList.start}
                  onOpen={onOpen}
                  fnFirst={fnFirst}
                />
              ) : null}
            </div>
          </li>
        )
      })}
    </Tag>
  )
}

export function FieldNoteBody({
  blocks,
  onOpen,
}: {
  blocks: FieldNoteBlock[]
  onOpen: (image: FieldNoteImage) => void
}) {
  const [activeFootnote, setActiveFootnote] = useState<string | null>(null)
  const fnFirst = useMemo(() => firstFootnoteRefs(blocks), [blocks])

  const go = useCallback((id: string) => {
    const target = document.getElementById(id) ? id : resolveTargetId(id)
    const el = document.getElementById(target)
    if (!el) return
    setActiveFootnote(isFootnoteAnchor(target) ? target : null)
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    if (isFootnoteHash(target)) return
    history.replaceState(null, '', `${pathWithoutHash()}#${target}`)
  }, [])

  useEffect(() => {
    const raw = window.location.hash.replace(/^#/, '')
    if (!raw) return
    if (isFootnoteHash(raw)) {
      history.replaceState(null, '', pathWithoutHash())
      return
    }
    const id = resolveTargetId(raw)
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [blocks])

  const nodes: ReactNode[] = []

  blocks.forEach((block, index) => {
    if (block.type === 'paragraph') {
      nodes.push(
        <p key={`p-${index}`} className={styles.prose}>
          {paragraphText(block, onOpen, fnFirst)}
        </p>,
      )
      return
    }

    if (block.type === 'heading') {
      const Tag = block.level <= 2 ? 'h2' : 'h3'
      nodes.push(
        <Tag
          key={`h-${index}`}
          id={block.id}
          className={`${block.level <= 2 ? 'ui-section-title' : 'ui-item-title'} ${styles.heading}`}
          data-level={block.level}
        >
          <Inlines nodes={block.inlines} onOpen={onOpen} fnFirst={fnFirst} />
        </Tag>,
      )
      return
    }

    if (block.type === 'list') {
      nodes.push(
        <ListBlock
          key={`l-${index}`}
          ordered={block.ordered}
          items={block.items}
          start={block.start}
          onOpen={onOpen}
          fnFirst={fnFirst}
        />,
      )
      return
    }

    if (block.type === 'quote') {
      nodes.push(
        <blockquote key={`q-${index}`} className={styles.quote}>
          <Inlines nodes={block.inlines} onOpen={onOpen} fnFirst={fnFirst} />
        </blockquote>,
      )
      return
    }

    if (block.type === 'code') {
      nodes.push(<CodeSlip key={`c-${index}`} lang={block.lang} text={block.text} />)
      return
    }

    if (block.type === 'mermaid') {
      nodes.push(<MermaidSlip key={`m-${index}`} source={block.text} />)
      return
    }

    if (block.type === 'table') {
      nodes.push(
        <div key={`t-${index}`} className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {block.headers.map((cell, cellIndex) => (
                  <th key={cellIndex}>
                    <Inlines nodes={cell} onOpen={onOpen} fnFirst={fnFirst} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>
                      <Inlines nodes={cell} onOpen={onOpen} fnFirst={fnFirst} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      )
      return
    }

    if (block.type === 'rule') {
      nodes.push(<hr key={`r-${index}`} className={styles.rule} />)
      return
    }

    if (block.type === 'image') {
      nodes.push(
        <FigureImage
          key={`img-${index}`}
          image={block.image}
          onOpen={() => onOpen(block.image)}
        />,
      )
      return
    }

    if (block.type === 'footnotes') {
      nodes.push(
        <section key={`fn-${index}`} className={styles.footnotes} aria-label="Footnotes">
          <ol className={styles.fnList}>
            {block.items.map((item) => {
              const self = footnoteDomId('fn', item.id)
              const back = footnoteDomId('fnref', item.id)
              return (
                <li
                  key={item.id}
                  id={self}
                  className={styles.fnItem}
                  data-active={activeFootnote === self ? 'true' : undefined}
                >
                  <span className={styles.fnMeta}>
                    <span className={styles.fnNum}>{padNum(item.n)}</span>
                    <button
                      type="button"
                      className={styles.fnBack}
                      aria-label="Return to text"
                      onClick={() => go(back)}
                    >
                      <CornerLeftUp size={14} strokeWidth={1.75} aria-hidden="true" />
                    </button>
                  </span>
                  <span className={styles.fnBody}>
                    <Inlines nodes={item.inlines} onOpen={onOpen} fnFirst={fnFirst} />
                  </span>
                </li>
              )
            })}
          </ol>
        </section>,
      )
      return
    }

    if (block.type === 'imageGrid') {
      nodes.push(
        <div key={`grid-${index}`} className={styles.imageGrid}>
          {block.images.map((image) => (
            <figure key={image.src} className={styles.gridFigure}>
              <button
                type="button"
                className={styles.gridButton}
                onClick={() => onOpen(image)}
                aria-label={`View ${image.alt}`}
              >
                <img src={image.src} alt={image.alt} className={styles.image} loading="lazy" />
              </button>
              {image.caption ? <figcaption className={styles.caption}>{image.caption}</figcaption> : null}
            </figure>
          ))}
        </div>,
      )
    }
  })

  return (
    <JumpContext.Provider value={{ go }}>
      <div className={styles.body}>{nodes}</div>
    </JumpContext.Provider>
  )
}
