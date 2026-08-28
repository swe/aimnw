import { useEffect, useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { IconButton } from './IconButton'
import styles from './Modal.module.css'

type ModalProps = {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  busy?: boolean
  className?: string
  /** Optional mark beside the title (e.g. favorite). */
  titleAside?: ReactNode
  /** Extra controls before the close button. */
  headerEnd?: ReactNode
  /** Hug content — no inner scroll. */
  fit?: boolean
  /** Wider panel for media / diagrams. */
  wide?: boolean
  /** Drop body padding (pan/zoom stages). */
  flush?: boolean
  /** Dark veil — image / media viewing. */
  tone?: 'default' | 'media'
}

export function Modal({
  open,
  title,
  onClose,
  children,
  busy,
  className,
  titleAside,
  headerEnd,
  fit = false,
  wide = false,
  flush = false,
  tone = 'default',
}: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLDivElement>(null)

  useBodyScrollLock(open, tone === 'media' ? { className: 'modal-media-lock' } : undefined)

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', onKeyDown)
    ;(document.activeElement as HTMLElement | null)?.blur?.()
    dialogRef.current?.focus({ preventScroll: true })

    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className={[styles.root, tone === 'media' ? styles.mediaRoot : ''].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={styles.backdrop}
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        className={[
          styles.dialog,
          fit ? styles.fit : '',
          wide ? styles.wide : '',
          tone === 'media' ? styles.media : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={busy || undefined}
        tabIndex={-1}
      >
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <h2
              className={tone === 'media' ? 'sr-only' : 'ui-item-title'}
              id={titleId}
            >
              {title}
            </h2>
            {tone === 'media' ? null : titleAside}
          </div>
          <div className={styles.headerEnd}>
            {headerEnd}
            <IconButton
              tone={tone === 'media' ? 'onDark' : 'default'}
              aria-label="Close"
              onClick={onClose}
            >
              <X size={16} strokeWidth={1.75} aria-hidden="true" />
            </IconButton>
          </div>
        </div>
        <div className={[styles.body, flush ? styles.flush : ''].filter(Boolean).join(' ')}>
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

export function ModalControls({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={[styles.controls, className].filter(Boolean).join(' ')}>
      {children}
    </div>
  )
}

export function ModalReadout({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <span className={[styles.readout, className].filter(Boolean).join(' ')}>
      {children}
    </span>
  )
}
