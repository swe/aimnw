import { useCallback, useEffect, useState } from 'react'
import { getCameraRollPhotos, type CameraPhoto } from '@/api/photos'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { Skeleton } from '@/components/ui'
import styles from './CameraRoll.module.css'

const INTERVAL_MS = 5200

export function CameraRoll() {
  const state = useAsyncResource('camera-roll', (signal) => getCameraRollPhotos(signal))
  const photos = state.status === 'success' ? state.data : []
  const count = photos.length
  const photoKey = photos.map((photo) => photo.id).join(',')
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    setIndex(0)
  }, [photoKey])

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return
      setIndex(((next % count) + count) % count)
    },
    [count],
  )

  useEffect(() => {
    if (paused || count < 2) return
    const id = window.setInterval(() => {
      setIndex((current) => (current + 1) % count)
    }, INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [paused, count])

  return (
    <div
      className={styles.camera}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setPaused(false)
        }
      }}
    >
      {state.status === 'loading' ? (
        <div className={styles.stage}>
          <div className={styles.mat}>
            <Skeleton height="100%" radius="var(--radius-sm)" style={{ position: 'absolute', inset: 0 }} />
          </div>
        </div>
      ) : null}

      {state.status === 'error' ? (
        <p className={styles.note}>Gallery isn’t available right now.</p>
      ) : null}

      {state.status === 'success' && count === 0 ? (
        <p className={styles.note}>No photos in the gallery yet.</p>
      ) : null}

      {state.status === 'success' && count > 0 ? (
        <GalleryFrame photos={photos} index={index} goTo={goTo} />
      ) : null}
    </div>
  )
}

function GalleryFrame({
  photos,
  index,
  goTo,
}: {
  photos: CameraPhoto[]
  index: number
  goTo: (next: number) => void
}) {
  return (
    <div className={styles.stage} aria-roledescription="carousel" aria-label="Camera roll">
      <div className={styles.mat}>
        {photos.map((photo, photoIndex) => (
          <img
            key={photo.id}
            className={[styles.image, photoIndex === index ? styles.imageActive : '']
              .filter(Boolean)
              .join(' ')}
            src={photo.imageUrl}
            alt=""
            loading={photoIndex === 0 ? 'eager' : 'lazy'}
          />
        ))}

        <div className={styles.rail}>
          <button
            type="button"
            className={styles.step}
            aria-label="Previous photo"
            onClick={() => goTo(index - 1)}
          >
            ←
          </button>

          <div className={styles.marks} role="tablist" aria-label="Photos">
            {photos.map((photo, photoIndex) => (
              <button
                key={photo.id}
                type="button"
                role="tab"
                aria-selected={photoIndex === index}
                aria-label={`Photo ${photoIndex + 1}`}
                className={[styles.mark, photoIndex === index ? styles.markActive : '']
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => goTo(photoIndex)}
              />
            ))}
          </div>

          <button
            type="button"
            className={styles.step}
            aria-label="Next photo"
            onClick={() => goTo(index + 1)}
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
