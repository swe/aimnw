import type { ReactNode } from 'react'
import { proxiedMediaUrl } from '@/lib/mediaUrl'
import styles from './ItemGrid.module.css'

export type ItemGridDensity = 'catalog' | 'covers' | 'gallery'

export function ItemGrid({
  children,
  density = 'catalog',
}: {
  children: ReactNode
  density?: ItemGridDensity
}) {
  const densityClass =
    density === 'covers' ? styles.covers : density === 'gallery' ? styles.gallery : ''
  return <div className={[styles.grid, densityClass].filter(Boolean).join(' ')}>{children}</div>
}

type ItemCardButtonProps = {
  title: string
  summary?: string
  kicker?: string
  imageUrl?: string | null
  imageAlt?: string
  trailing?: ReactNode
  fallback?: ReactNode
  mediaRatio?: 'portrait' | 'square' | 'book'
  titleMode?: 'under' | 'none'
  onClick: () => void
}

export function ItemCardButton({
  title,
  summary,
  kicker,
  imageUrl,
  imageAlt,
  trailing,
  fallback,
  mediaRatio = 'portrait',
  titleMode = 'under',
  onClick,
}: ItemCardButtonProps) {
  const ratioClass =
    mediaRatio === 'square' ? styles.square : mediaRatio === 'book' ? styles.book : ''
  const mediaClass = [styles.media, ratioClass].filter(Boolean).join(' ')
  const emptyClass = [styles.mediaEmpty, ratioClass, fallback ? styles.mediaFallback : '']
    .filter(Boolean)
    .join(' ')
  const mute = titleMode === 'none'

  return (
    <button
      type="button"
      className={`ui-tile ${styles.card} ${mute ? styles.mute : ''}`}
      onClick={onClick}
      aria-label={mute ? title : undefined}
    >
      {imageUrl ? (
        <img
          className={mediaClass}
          src={proxiedMediaUrl(imageUrl) ?? imageUrl}
          alt={imageAlt ?? ''}
          loading="lazy"
        />
      ) : (
        <div className={emptyClass} aria-hidden="true">
          {fallback ?? null}
        </div>
      )}
      {mute ? null : (
        <span className={styles.meta}>
          <span className={styles.row}>
            {kicker ? <span className="ui-kicker">{kicker}</span> : <span />}
            {trailing}
          </span>
          <span className="ui-item-title">{title}</span>
          {summary ? <span className={styles.summary}>{summary}</span> : null}
        </span>
      )}
    </button>
  )
}
