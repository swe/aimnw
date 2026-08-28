import styles from './Rating.module.css'

type RatingProps = {
  value: number
  max?: number
  /** Dots match most of the site; stars suit the library list cards. */
  variant?: 'dot' | 'star'
  size?: 'sm' | 'md'
  className?: string
}

export function Rating({
  value,
  max = 5,
  variant = 'dot',
  size = 'sm',
  className,
}: RatingProps) {
  const on = variant === 'star' ? '★' : '●'
  const off = variant === 'star' ? '☆' : '●'

  return (
    <span
      className={[
        styles.rating,
        variant === 'star' ? styles.stars : '',
        size === 'md' ? styles.md : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={`${value} out of ${max}`}
    >
      {Array.from({ length: max }, (_, index) => (
        <span
          key={index}
          className={index < value ? styles.on : styles.off}
          aria-hidden="true"
        >
          {index < value ? on : off}
        </span>
      ))}
    </span>
  )
}
