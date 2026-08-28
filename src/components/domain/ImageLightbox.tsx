import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'
import { ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { IconButton, Modal, ModalControls, ModalReadout } from '@/components/ui'
import type { FieldNoteImage } from '@/content/fieldNotes'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import styles from './ImageLightbox.module.css'

const SLIDE_MS = 4000
const SWIPE_THRESHOLD_PX = 48
const SWIPE_VELOCITY_PX_MS = 0.45
const RUBBER_BAND = 0.32

type ImageLightboxProps = {
  images: readonly FieldNoteImage[]
  index: number | null
  onClose: () => void
  onChange: (index: number) => void
  /** Desktop-only overlays (e.g. Viewfinder metadata) — hidden below 1024px via CSS. */
  overlay?: ReactNode
}

function rubberBandOffset(dx: number, atStart: boolean, atEnd: boolean) {
  if (atStart && dx > 0) return dx * RUBBER_BAND
  if (atEnd && dx < 0) return dx * RUBBER_BAND
  return dx
}

export function ImageLightbox({ images, index, onClose, onChange, overlay }: ImageLightboxProps) {
  const open = index !== null && images.length > 0
  const current = open ? images[index] : null
  const hasMany = images.length > 1
  const isMobile = useMediaQuery('(max-width: 860px)')
  const swipeEnabled = hasMany && !isMobile
  const atStart = index === 0
  const atEnd = index === images.length - 1

  const [playing, setPlaying] = useState(false)
  const [dragX, setDragX] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [stageWidth, setStageWidth] = useState(0)

  const stageRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    lastX: number
    lastT: number
    swiping: boolean
  } | null>(null)

  const goTo = useCallback(
    (next: number) => {
      if (!hasMany || index === null) return
      setDragX(0)
      onChange(((next % images.length) + images.length) % images.length)
    },
    [hasMany, index, images.length, onChange],
  )

  useEffect(() => {
    if (!open) {
      setPlaying(false)
      setDragX(0)
      setDragging(false)
      dragRef.current = null
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open) return

    const node = stageRef.current
    if (!node) return

    const measure = () => setStageWidth(node.clientWidth)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [open])

  useEffect(() => {
    if (!open || !hasMany || index === null) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        goTo(index - 1)
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault()
        goTo(index + 1)
      }
      if (event.key === ' ') {
        event.preventDefault()
        setPlaying((on) => !on)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, hasMany, index, goTo])

  useEffect(() => {
    if (!open || !playing || !hasMany || index === null) return
    const timer = window.setTimeout(() => goTo(index + 1), SLIDE_MS)
    return () => window.clearTimeout(timer)
  }, [open, playing, hasMany, index, goTo])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !swipeEnabled || index === null) return
    const now = performance.now()
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastT: now,
      swiping: false,
    }
    setPlaying(false)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || index === null) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY

    if (!drag.swiping) {
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy) * 1.15) {
        drag.swiping = true
        setDragging(true)
        event.currentTarget.setPointerCapture(event.pointerId)
      } else {
        return
      }
    }

    event.preventDefault()
    drag.lastX = event.clientX
    drag.lastT = performance.now()
    setDragX(rubberBandOffset(dx, atStart, atEnd))
  }

  const endPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId || index === null) return
    dragRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const dx = event.clientX - drag.startX
    const dt = Math.max(performance.now() - drag.lastT, 1)
    const velocity = (event.clientX - drag.lastX) / dt
    const flick = Math.abs(velocity) >= SWIPE_VELOCITY_PX_MS

    const distancePass =
      drag.swiping && (Math.abs(dx) >= SWIPE_THRESHOLD_PX || flick)

    setDragging(false)
    setDragX(0)

    if (!distancePass || !drag.swiping) return

    const direction = flick ? velocity : dx
    if (direction < 0 && !atEnd) goTo(index + 1)
    else if (direction > 0 && !atStart) goTo(index - 1)
  }

  const trackOffset =
    index !== null && stageWidth > 0 ? -index * stageWidth + dragX : dragX

  return (
    <Modal
      open={open}
      title={current?.alt || 'Photo'}
      onClose={onClose}
      wide
      flush
      tone="media"
    >
      {current && index !== null ? (
        <figure className={styles.figure}>
          <div
            ref={stageRef}
            className={[
              styles.stage,
              stageWidth > 0 ? styles.stageReady : '',
              swipeEnabled ? styles.stageSwipeable : '',
              dragging ? styles.stageDragging : '',
            ]
              .filter(Boolean)
              .join(' ')}
            aria-roledescription={swipeEnabled ? 'carousel' : undefined}
            onPointerDown={swipeEnabled ? onPointerDown : undefined}
            onPointerMove={swipeEnabled ? onPointerMove : undefined}
            onPointerUp={swipeEnabled ? endPointer : undefined}
            onPointerCancel={swipeEnabled ? endPointer : undefined}
          >
            <div
              className={[styles.track, dragging ? styles.trackDragging : ''].filter(Boolean).join(' ')}
              style={stageWidth > 0 ? { transform: `translate3d(${trackOffset}px, 0, 0)` } : undefined}
            >
              {images.map((image, imageIndex) => (
                <div
                  key={`${image.src}-${imageIndex}`}
                  className={styles.slide}
                  aria-hidden={imageIndex !== index}
                >
                  <img
                    src={image.src}
                    alt={image.alt}
                    className={styles.image}
                    draggable={false}
                    loading={Math.abs(imageIndex - index) <= 1 ? 'eager' : 'lazy'}
                  />
                </div>
              ))}
            </div>
          </div>

          {current.caption ? (
            <figcaption className={styles.caption}>{current.caption}</figcaption>
          ) : null}

          {hasMany ? (
            <ModalControls className={styles.mobileControls}>
              <IconButton
                tone="onDark"
                className={styles.mobileControlButton}
                aria-label="Previous image"
                onClick={() => goTo(index - 1)}
              >
                <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
              <ModalReadout className={styles.mobileReadout}>
                {index + 1}/{images.length}
              </ModalReadout>
              <IconButton
                tone="onDark"
                className={styles.mobileControlButton}
                aria-label="Next image"
                onClick={() => goTo(index + 1)}
              >
                <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
              </IconButton>
              <IconButton
                tone="onDark"
                className={[styles.mobileControlButton, styles.desktopOnlyControl].join(' ')}
                active={playing}
                aria-pressed={playing}
                aria-label={playing ? 'Pause slideshow' : 'Start slideshow'}
                onClick={() => setPlaying((on) => !on)}
              >
                {playing ? (
                  <Pause size={16} strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Play size={16} strokeWidth={1.75} aria-hidden="true" />
                )}
              </IconButton>
            </ModalControls>
          ) : null}

          {overlay ? <div className={styles.overlay}>{overlay}</div> : null}
        </figure>
      ) : null}
    </Modal>
  )
}
