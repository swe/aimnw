import { Skeleton, SkeletonText, VStack } from '@/components/ui'
import styles from './PageSkeleton.module.css'

export function ListPageSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className={styles.grid} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: cards }, (_, index) => (
        <div key={index} className={styles.card}>
          <Skeleton height="9rem" radius="var(--radius-md)" />
          <VStack gap={3} style={{ paddingTop: 'var(--space-4)' }}>
            <Skeleton height="1.1rem" width="72%" />
            <SkeletonText lines={2} />
          </VStack>
        </div>
      ))}
    </div>
  )
}

export function SectionSkeleton() {
  return (
    <div className={styles.section} aria-busy="true">
      <span className="sr-only">Loading</span>
      <Skeleton height="1.25rem" width="8rem" />
      <SkeletonText lines={3} />
    </div>
  )
}

export function DetailSkeleton() {
  return (
    <VStack gap={4} aria-busy="true">
      <span className="sr-only">Loading details</span>
      <Skeleton height="12rem" radius="var(--radius-md)" />
      <Skeleton height="1.25rem" width="55%" />
      <SkeletonText lines={4} />
    </VStack>
  )
}

export function SportSkeleton() {
  return (
    <div className={styles.sport} aria-busy="true">
      <span className="sr-only">Loading training data</span>
      <Skeleton height="10rem" radius="var(--radius-md)" />
      <Skeleton height="9rem" radius="var(--radius-md)" />
      <Skeleton height="12rem" radius="var(--radius-md)" />
      <Skeleton height="10rem" radius="var(--radius-md)" />
      <Skeleton height="11rem" radius="var(--radius-md)" />
      <Skeleton height="16rem" radius="var(--radius-md)" />
    </div>
  )
}

export function MapSkeleton() {
  return (
    <div className={styles.map} aria-busy="true">
      <span className="sr-only">Loading map</span>
      <Skeleton height="22rem" radius="var(--radius-xl)" />
    </div>
  )
}
