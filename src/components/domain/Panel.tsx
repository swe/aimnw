import type { ReactNode } from 'react'
import { FollowLink } from '@/components/domain/FollowLink'
import styles from './Panel.module.css'

type PanelProps = {
  title: ReactNode
  action?: { label: string; to: string }
  hint?: string
  children: ReactNode
  className?: string
}

export function Panel({ title, action, hint, children, className }: PanelProps) {
  return (
    <section className={[styles.panel, className].filter(Boolean).join(' ')}>
      <header className={styles.header}>
        <h2 className={`ui-kicker ${styles.title}`}>{title}</h2>
        {hint || action ? (
          <div className={styles.headerEnd}>
            {hint ? (
              <span className={styles.hint}>
                <button type="button" className={styles.hintTrigger} aria-label={hint}>
                  ?
                </button>
                <span className={styles.hintPanel} role="tooltip">
                  {hint}
                </span>
              </span>
            ) : null}
            {action ? <FollowLink to={action.to}>{action.label}</FollowLink> : null}
          </div>
        ) : null}
      </header>
      <div className={styles.body}>{children}</div>
    </section>
  )
}
