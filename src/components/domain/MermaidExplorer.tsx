import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Maximize2, Minus, Plus, Scan } from 'lucide-react'
import { mermaidDiagramName, MermaidBlock, renderMermaidSvg } from '@/components/domain/MermaidBlock'
import { IconButton, Modal, ModalControls, ModalReadout } from '@/components/ui'
import styles from './MermaidExplorer.module.css'
import noteStyles from '@/pages/FieldNotes.module.css'

const MIN_SCALE = 0.2
const MAX_SCALE = 6

type Transform = { x: number; y: number; scale: number }

type MermaidExplorerProps = {
  open: boolean
  source: string
  title: string
  onClose: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function zoomAround(current: Transform, nextScale: number, cx: number, cy: number): Transform {
  const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE)
  const k = scale / current.scale
  return {
    scale,
    x: cx - (cx - current.x) * k,
    y: cy - (cy - current.y) * k,
  }
}

export function MermaidExplorer({ open, source, title, onClose }: MermaidExplorerProps) {
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, '')
  const viewportRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const transformRef = useRef<Transform>({ x: 0, y: 0, scale: 1 })
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 })
  const [grabbing, setGrabbing] = useState(false)
  const [failed, setFailed] = useState(false)

  const commit = useCallback((next: Transform) => {
    transformRef.current = next
    setTransform(next)
  }, [])

  const fit = useCallback(() => {
    const viewport = viewportRef.current
    const svg = canvasRef.current?.querySelector('svg')
    if (!viewport || !svg) return

    let width = svg.getBBox().width
    let height = svg.getBBox().height
    if (!width || !height) {
      width = svg.getBoundingClientRect().width || 1
      height = svg.getBoundingClientRect().height || 1
    }

    const pad = 72
    const scale = clamp(
      Math.min((viewport.clientWidth - pad * 2) / width, (viewport.clientHeight - pad * 2) / height),
      MIN_SCALE,
      1.4,
    )
    commit({
      scale,
      x: (viewport.clientWidth - width * scale) / 2,
      y: (viewport.clientHeight - height * scale) / 2,
    })
  }, [commit])

  useEffect(() => {
    if (!open) return

    setFailed(false)
    commit({ x: 0, y: 0, scale: 1 })

    let cancelled = false
    renderMermaidSvg(`field-mermaid-explore-${rawId}`, source)
      .then((svg) => {
        if (cancelled || !canvasRef.current) return
        canvasRef.current.innerHTML = svg
        requestAnimationFrame(fit)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === '+' || event.key === '=') {
        event.preventDefault()
        const viewport = viewportRef.current
        if (!viewport) return
        commit(
          zoomAround(
            transformRef.current,
            transformRef.current.scale * 1.15,
            viewport.clientWidth / 2,
            viewport.clientHeight / 2,
          ),
        )
      }
      if (event.key === '-' || event.key === '_') {
        event.preventDefault()
        const viewport = viewportRef.current
        if (!viewport) return
        commit(
          zoomAround(
            transformRef.current,
            transformRef.current.scale / 1.15,
            viewport.clientWidth / 2,
            viewport.clientHeight / 2,
          ),
        )
      }
      if (event.key === '0') {
        event.preventDefault()
        fit()
      }
    }

    window.addEventListener('keydown', onKeyDown)

    return () => {
      cancelled = true
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, source, rawId, commit, fit])

  useEffect(() => {
    if (!open) return
    const viewport = viewportRef.current
    if (!viewport) return

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = viewport.getBoundingClientRect()
      const factor = event.deltaY < 0 ? 1.08 : 1 / 1.08
      commit(
        zoomAround(
          transformRef.current,
          transformRef.current.scale * factor,
          event.clientX - rect.left,
          event.clientY - rect.top,
        ),
      )
    }

    viewport.addEventListener('wheel', onWheel, { passive: false })
    return () => viewport.removeEventListener('wheel', onWheel)
  }, [open, commit])

  const zoomBy = (factor: number) => {
    const viewport = viewportRef.current
    if (!viewport) return
    commit(
      zoomAround(
        transformRef.current,
        transformRef.current.scale * factor,
        viewport.clientWidth / 2,
        viewport.clientHeight / 2,
      ),
    )
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      wide
      flush
      headerEnd={
        <ModalControls>
          <IconButton aria-label="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
            <Minus size={16} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
          <ModalReadout>{Math.round(transform.scale * 100)}%</ModalReadout>
          <IconButton aria-label="Zoom in" onClick={() => zoomBy(1.2)}>
            <Plus size={16} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
          <IconButton aria-label="Fit diagram" onClick={fit}>
            <Scan size={16} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
        </ModalControls>
      }
    >
      <div
        ref={viewportRef}
        className={`${styles.viewport} ${grabbing ? styles.viewportGrabbing : ''}`}
        tabIndex={-1}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          dragRef.current = {
            px: event.clientX,
            py: event.clientY,
            x: transformRef.current.x,
            y: transformRef.current.y,
          }
          setGrabbing(true)
          event.currentTarget.setPointerCapture(event.pointerId)
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current
          if (!drag) return
          commit({
            ...transformRef.current,
            x: drag.x + (event.clientX - drag.px),
            y: drag.y + (event.clientY - drag.py),
          })
        }}
        onPointerUp={() => {
          dragRef.current = null
          setGrabbing(false)
        }}
        onPointerCancel={() => {
          dragRef.current = null
          setGrabbing(false)
        }}
      >
        {failed ? (
          <pre className={noteStyles.pre}>
            <code>{source}</code>
          </pre>
        ) : (
          <div
            ref={canvasRef}
            className={styles.canvas}
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            }}
          />
        )}
      </div>
    </Modal>
  )
}

export function MermaidSlip({ source }: { source: string }) {
  const [open, setOpen] = useState(false)
  const name = mermaidDiagramName(source)

  return (
    <>
      <figure className={noteStyles.slip}>
        <div className={noteStyles.slipHead}>
          <figcaption className="ui-kicker">{name}</figcaption>
          <IconButton
            aria-label={`Explore ${name}`}
            onClick={() => setOpen(true)}
          >
            <Maximize2 size={14} strokeWidth={1.75} aria-hidden="true" />
          </IconButton>
        </div>
        <div
          className={noteStyles.mermaidPreview}
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setOpen(true)
            }
          }}
          aria-label={`Explore ${name}`}
        >
          <MermaidBlock source={source} className={noteStyles.mermaid} />
        </div>
      </figure>
      <MermaidExplorer open={open} source={source} title={name} onClose={() => setOpen(false)} />
    </>
  )
}
