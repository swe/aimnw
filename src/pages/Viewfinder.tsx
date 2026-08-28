import { useCallback, useMemo, useState } from 'react'
import { ApiEmptyState } from '@/components/domain/ApiEmptyState'
import { EmptyState } from '@/components/domain/EmptyState'
import { ImageLightbox } from '@/components/domain/ImageLightbox'
import { ViewfinderPhotoMeta } from '@/components/domain/viewfinder/ViewfinderPhotoMeta'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton, VStack } from '@/components/ui'
import { ItemCardButton, ItemGrid } from '@/components/domain/ItemGrid'
import { getViewfinderPhotos, type ViewfinderPhoto } from '@/api/photos'
import { hasViewfinderMetaPanel } from '@/lib/photoMeta'
import { YearHeading } from '@/components/domain/YearHeading'
import { viewfinder } from '@/content/viewfinder'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import styles from './Viewfinder.module.css'

function photoYear(photo: ViewfinderPhoto): number {
  const parsed = new Date(photo.createdAt).getFullYear()
  return Number.isFinite(parsed) ? parsed : 0
}

function groupByYear(photos: ViewfinderPhoto[]) {
  const map = new Map<number, ViewfinderPhoto[]>()
  for (const photo of photos) {
    const year = photoYear(photo)
    const bucket = map.get(year)
    if (bucket) bucket.push(photo)
    else map.set(year, [photo])
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, items]) => ({ year, items }))
}

export function ViewfinderPage() {
  const state = useAsyncResource('viewfinder', (signal) => getViewfinderPhotos(signal))
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const photos = useMemo(() => {
    if (state.status !== 'success') return []
    return [...state.data].sort((a, b) => {
      const timeDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (timeDiff !== 0) return timeDiff
      return a.id.localeCompare(b.id)
    })
  }, [state])

  const years = useMemo(() => groupByYear(photos), [photos])

  const indexById = useMemo(() => {
    const map = new Map<string, number>()
    photos.forEach((photo, index) => map.set(photo.id, index))
    return map
  }, [photos])

  const lightboxImages = useMemo(
    () =>
      photos.map((photo) => ({
        src: photo.imageUrl,
        alt: photo.meta?.title || 'Archive photo',
        caption: photo.meta?.title,
      })),
    [photos],
  )

  const lightboxMeta = useMemo(() => {
    if (lightboxIndex === null) return null
    const meta = photos[lightboxIndex]?.meta
    if (!hasViewfinderMetaPanel(meta)) return null
    return <ViewfinderPhotoMeta key={photos[lightboxIndex].id} meta={meta} />
  }, [lightboxIndex, photos])

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  return (
    <VStack gap={6}>
      <PageHeader title={viewfinder.title} description={viewfinder.lede} />

      {state.status === 'loading' ? (
        <ItemGrid density="gallery">
          {Array.from({ length: 12 }, (_, index) => (
            <Skeleton key={index} height="100%" style={{ aspectRatio: '1' }} />
          ))}
        </ItemGrid>
      ) : null}

      {state.status === 'error' ? (
        <ApiEmptyState error={state.error} notConfigured={state.notConfigured} />
      ) : null}

      {state.status === 'success' && photos.length === 0 ? (
        <EmptyState message="No photos in the archive yet." />
      ) : null}

      {state.status === 'success' && photos.length > 0 ? (
        <div className={styles.years}>
          {years.map(({ year, items }) => (
            <section
              key={year}
              className={styles.yearBlock}
              aria-labelledby={`viewfinder-year-${year}`}
            >
              <YearHeading
                id={`viewfinder-year-${year}`}
                label={year || 'Undated'}
                count={items.length}
              />
              <ItemGrid density="gallery">
                {items.map((photo) => {
                  const index = indexById.get(photo.id) ?? 0
                  return (
                    <ItemCardButton
                      key={photo.id}
                      title={`Open photo ${index + 1} of ${photos.length}`}
                      imageUrl={photo.imageUrl}
                      mediaRatio="square"
                      titleMode="none"
                      onClick={() => setLightboxIndex(index)}
                    />
                  )
                })}
              </ItemGrid>
            </section>
          ))}
        </div>
      ) : null}

      <ImageLightbox
        images={lightboxImages}
        index={lightboxIndex}
        onClose={closeLightbox}
        onChange={setLightboxIndex}
        overlay={lightboxMeta}
      />
    </VStack>
  )
}
