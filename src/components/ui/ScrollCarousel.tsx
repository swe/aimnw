import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { IconButton } from './IconButton'
import styles from './ScrollCarousel.module.css'

export function ScrollCarousel({
  children,
  trackClassName,
  label,
}: {
  children: ReactNode
  trackClassName?: string
  label?: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateEdges = useCallback(() => {
    const node = trackRef.current
    if (!node) return
    const maxScroll = node.scrollWidth - node.clientWidth
    setCanScrollLeft(node.scrollLeft > 1)
    setCanScrollRight(node.scrollLeft < maxScroll - 1)
  }, [])

  useEffect(() => {
    const node = trackRef.current
    if (!node) return

    updateEdges()
    node.addEventListener('scroll', updateEdges, { passive: true })

    const observer = new ResizeObserver(updateEdges)
    observer.observe(node)

    return () => {
      node.removeEventListener('scroll', updateEdges)
      observer.disconnect()
    }
  }, [updateEdges, children])

  const scrollByDirection = (direction: 1 | -1) => {
    const node = trackRef.current
    if (!node) return
    node.scrollBy({ left: direction * node.clientWidth * 0.8, behavior: 'smooth' })
  }

  return (
    <div className={styles.wrap}>
      <div ref={trackRef} className={[styles.track, trackClassName].filter(Boolean).join(' ')}>
        {children}
      </div>
      <div
        className={[styles.fade, styles.fadeLeft, canScrollLeft ? styles.fadeVisible : '']
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      />
      <div
        className={[styles.fade, styles.fadeRight, canScrollRight ? styles.fadeVisible : '']
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      />
      {canScrollLeft ? (
        <IconButton
          variant="bordered"
          className={`${styles.arrow} ${styles.arrowLeft}`}
          aria-label={label ? `Scroll ${label} left` : 'Scroll left'}
          onClick={() => scrollByDirection(-1)}
        >
          <ChevronLeft strokeWidth={1.75} />
        </IconButton>
      ) : null}
      {canScrollRight ? (
        <IconButton
          variant="bordered"
          className={`${styles.arrow} ${styles.arrowRight}`}
          aria-label={label ? `Scroll ${label} right` : 'Scroll right'}
          onClick={() => scrollByDirection(1)}
        >
          <ChevronRight strokeWidth={1.75} />
        </IconButton>
      ) : null}
    </div>
  )
}
