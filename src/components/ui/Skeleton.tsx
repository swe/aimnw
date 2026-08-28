import type { CSSProperties, HTMLAttributes } from 'react'
import styles from './Skeleton.module.css'

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  width?: CSSProperties['width']
  height?: CSSProperties['height']
  radius?: CSSProperties['borderRadius']
  circle?: boolean
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  radius = 'var(--radius-md)',
  circle,
  className,
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={[styles.skeleton, className].filter(Boolean).join(' ')}
      style={{
        width: circle ? height : width,
        height,
        borderRadius: circle ? '999px' : radius,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  )
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className={styles.textBlock} aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton
          key={index}
          height="0.85rem"
          width={index === lines - 1 ? '68%' : '100%'}
        />
      ))}
    </div>
  )
}
