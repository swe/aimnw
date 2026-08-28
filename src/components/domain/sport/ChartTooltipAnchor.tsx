import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import styles from './chartTooltip.module.css'

export type ChartTooltipEdge = 'start' | 'mid' | 'end'

type Props = {
  children: ReactNode
  tooltip: ReactNode
  edge: ChartTooltipEdge
  className?: string
  'aria-label'?: string
}

function tooltipStyle(rect: DOMRect, edge: ChartTooltipEdge): CSSProperties {
  const gap = 6
  const top = rect.top - gap

  if (edge === 'start') {
    return {
      position: 'fixed',
      left: rect.left,
      top,
      transform: 'translateY(-100%)',
    }
  }

  if (edge === 'end') {
    return {
      position: 'fixed',
      left: rect.right,
      top,
      transform: 'translate(-100%, -100%)',
    }
  }

  return {
    position: 'fixed',
    left: rect.left + rect.width / 2,
    top,
    transform: 'translate(-50%, -100%)',
  }
}

export function ChartTooltipAnchor({
  children,
  tooltip,
  edge,
  className,
  'aria-label': ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const tooltipId = useId()
  const [visible, setVisible] = useState(false)
  const [style, setStyle] = useState<CSSProperties | null>(null)

  const sync = useCallback(() => {
    const el = ref.current
    if (!el) return
    setStyle(tooltipStyle(el.getBoundingClientRect(), edge))
  }, [edge])

  const show = useCallback(() => {
    sync()
    setVisible(true)
  }, [sync])

  const hide = useCallback(() => {
    setVisible(false)
    setStyle(null)
  }, [])

  useEffect(() => {
    if (!visible) return
    const onScroll = () => hide()
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onScroll)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onScroll)
    }
  }, [visible, hide])

  return (
    <>
      <div
        ref={ref}
        className={[styles.anchor, className].filter(Boolean).join(' ')}
        aria-label={ariaLabel}
        aria-describedby={visible ? tooltipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        {children}
      </div>
      {visible && style
        ? createPortal(
            <div id={tooltipId} className={styles.popover} data-edge={edge} data-fixed role="tooltip" style={style}>
              {tooltip}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}
