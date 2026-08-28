import { useEffect, useId, useRef, useState } from 'react'

const DIAGRAM_NAMES: Array<[RegExp, string]> = [
  [/^\s*flowchart\b/i, 'Flowchart'],
  [/^\s*graph\b/i, 'Flowchart'],
  [/^\s*sequenceDiagram\b/i, 'Sequence'],
  [/^\s*classDiagram\b/i, 'Class'],
  [/^\s*stateDiagram(?:-v2)?\b/i, 'State'],
  [/^\s*erDiagram\b/i, 'ER'],
  [/^\s*gantt\b/i, 'Gantt'],
  [/^\s*pie\b/i, 'Pie'],
  [/^\s*gitGraph\b/i, 'Git'],
  [/^\s*mindmap\b/i, 'Mindmap'],
  [/^\s*timeline\b/i, 'Timeline'],
  [/^\s*journey\b/i, 'Journey'],
  [/^\s*quadrantChart\b/i, 'Quadrant'],
  [/^\s*requirementDiagram\b/i, 'Requirement'],
  [/^\s*C4/i, 'C4'],
  [/^\s*sankey(?:-beta)?\b/i, 'Sankey'],
  [/^\s*xychart(?:-beta)?\b/i, 'Chart'],
  [/^\s*kanban\b/i, 'Kanban'],
  [/^\s*block(?:-beta)?\b/i, 'Block'],
]

function peelFrontmatter(source: string) {
  const text = source.replace(/^\uFEFF/, '').trimStart()
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/)
  if (!match) return { title: '', body: text }
  const title = match[1].match(/^\s*title\s*:\s*(.+)\s*$/m)?.[1]?.replace(/^["']|["']$/g, '').trim() ?? ''
  return { title, body: text.slice(match[0].length) }
}

export function mermaidDiagramName(source: string) {
  const peeled = peelFrontmatter(source)
  if (peeled.title) return peeled.title

  const acc = peeled.body.match(/^\s*accTitle\s*:\s*(.+)\s*$/m)
  if (acc?.[1]) return acc[1].trim()

  const lines = peeled.body.split('\n').map((line) => line.trim()).filter((line) => line && !line.startsWith('%%'))
  const start = lines[0] ?? ''
  for (const [pattern, name] of DIAGRAM_NAMES) {
    if (pattern.test(start)) return name
  }
  return 'Diagram'
}

const MERMAID_THEME = {
  fontFamily: 'Inter, Segoe UI, sans-serif',
  primaryColor: '#e3eef8',
  primaryTextColor: '#1b1e23',
  primaryBorderColor: '#d5dae0',
  lineColor: '#3e4550',
  secondaryColor: '#fafafa',
  tertiaryColor: '#f7f7f6',
  background: '#fcfcfc',
  nodeBorder: '#d5dae0',
  clusterBkg: '#fafafa',
  edgeLabelBackground: '#fcfcfc',
} as const

let mermaidReady: Promise<typeof import('mermaid')> | null = null

/**
 * This one import is the whole cost: mermaid splits every diagram grammar into
 * its own chunk and imports it on demand, so a flowchart never fetches the
 * cytoscape or katex bundles. `@mermaid-js/tiny` would be a downgrade here —
 * it is CDN-only, drops lazy loading, and cannot render mindmaps.
 */
function loadMermaid() {
  mermaidReady ??= import('mermaid')
  return mermaidReady
}

export async function renderMermaidSvg(id: string, source: string) {
  const mod = await loadMermaid()
  const mermaid = mod.default
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: 'base',
    flowchart: { useMaxWidth: false, htmlLabels: true },
    sequence: { useMaxWidth: false },
    er: { useMaxWidth: false },
    gantt: { useMaxWidth: false },
    themeVariables: { ...MERMAID_THEME },
  })
  const { svg } = await mermaid.render(id, source)
  return svg
}

type MermaidBlockProps = {
  source: string
  className?: string
}

export function MermaidBlock({ source, className }: MermaidBlockProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)

    renderMermaidSvg(`field-mermaid-${rawId}`, source)
      .then((svg) => {
        if (!cancelled && hostRef.current) hostRef.current.innerHTML = svg
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [source, rawId])

  if (failed) {
    return (
      <pre className={className}>
        <code>{source}</code>
      </pre>
    )
  }

  return <div ref={hostRef} className={className} />
}
