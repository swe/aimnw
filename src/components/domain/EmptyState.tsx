import type { ReactNode } from 'react'
import { Text } from '@/components/ui'
import styles from './EmptyState.module.css'

type EmptyStateProps = {
  message: string
  hint?: string
  children?: ReactNode
}

export function EmptyState({ message, hint, children }: EmptyStateProps) {
  return (
    <div className={styles.empty}>
      <Text tone="muted">{message}</Text>
      {hint ? (
        <Text tone="subtle" size="sm" style={{ marginTop: 'var(--space-3)' }}>
          {hint}
        </Text>
      ) : null}
      {children}
    </div>
  )
}
