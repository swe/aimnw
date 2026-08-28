import { useEffect, useState } from 'react'
import type { HLJSApi, LanguageFn } from 'highlight.js'
import styles from '@/pages/FieldNotes.module.css'

const LANG_ALIASES: Record<string, string> = {
  js: 'javascript',
  javascript: 'javascript',
  node: 'javascript',
  py: 'python',
  python: 'python',
  go: 'go',
  golang: 'go',
  yaml: 'yaml',
  yml: 'yaml',
  c: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cxx: 'cpp',
  cc: 'cpp',
  csharp: 'csharp',
  cs: 'csharp',
  'c#': 'csharp',
}

const LANG_LABELS: Record<string, string> = {
  javascript: 'JavaScript',
  python: 'Python',
  go: 'Go',
  yaml: 'YAML',
  c: 'C',
  cpp: 'C++',
  csharp: 'C#',
}

const LANG_LOADERS: Record<string, () => Promise<{ default: LanguageFn }>> = {
  javascript: () => import('highlight.js/lib/languages/javascript'),
  python: () => import('highlight.js/lib/languages/python'),
  go: () => import('highlight.js/lib/languages/go'),
  yaml: () => import('highlight.js/lib/languages/yaml'),
  c: () => import('highlight.js/lib/languages/c'),
  cpp: () => import('highlight.js/lib/languages/cpp'),
  csharp: () => import('highlight.js/lib/languages/csharp'),
}

let core: Promise<HLJSApi> | null = null
const registered = new Set<string>()

async function highlighterFor(lang: string) {
  core ??= import('highlight.js/lib/core').then((mod) => mod.default)
  const hljs = await core
  if (!registered.has(lang)) {
    const grammar = await LANG_LOADERS[lang]()
    hljs.registerLanguage(lang, grammar.default)
    registered.add(lang)
  }
  return hljs
}

function resolveLang(raw?: string) {
  if (!raw) return null
  return LANG_ALIASES[raw.trim().toLowerCase()] ?? null
}

export function CodeSlip({ lang, text }: { lang?: string; text: string }) {
  const resolved = resolveLang(lang)
  const [html, setHtml] = useState<string | null>(null)

  useEffect(() => {
    if (!resolved) {
      setHtml(null)
      return
    }

    let cancelled = false
    highlighterFor(resolved)
      .then((hljs) => {
        if (cancelled) return
        setHtml(hljs.highlight(text, { language: resolved, ignoreIllegals: true }).value)
      })
      .catch(() => {
        if (!cancelled) setHtml(null)
      })

    return () => {
      cancelled = true
    }
  }, [resolved, text])

  const label = (resolved && LANG_LABELS[resolved]) || lang || 'note'

  return (
    <figure className={styles.slip}>
      <figcaption className="ui-kicker">{label}</figcaption>
      <pre className={styles.pre}>
        {html ? (
          <code className={styles.code} dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code className={styles.code}>{text}</code>
        )}
      </pre>
    </figure>
  )
}
