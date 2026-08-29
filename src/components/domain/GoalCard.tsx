import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ScrollCarousel } from '@/components/ui'
import { proxiedMediaUrlRequired } from '@/lib/mediaUrl'
import type { GoalItem } from '@/types'
import styles from './GoalCard.module.css'

function GoalCardFace({
  goal,
}: {
  goal: Pick<GoalItem, 'title' | 'image_url' | 'finished'>
}) {
  const hasImage = Boolean(goal.image_url)
  return (
    <>
      {hasImage ? (
        <img src={proxiedMediaUrlRequired(goal.image_url)} alt="" className={styles.img} loading="lazy" />
      ) : null}
      <span className={styles.title}>{goal.title}</span>
    </>
  )
}

function cardClass(goal: Pick<GoalItem, 'image_url' | 'finished'>, extra?: string) {
  return [
    styles.card,
    goal.image_url ? styles.image : '',
    goal.finished ? styles.done : '',
    extra,
  ]
    .filter(Boolean)
    .join(' ')
}

export function GoalCard({
  goal,
}: {
  goal: Pick<GoalItem, 'title' | 'image_url' | 'finished'>
}) {
  return (
    <div className={cardClass(goal)}>
      <GoalCardFace goal={goal} />
    </div>
  )
}

export function GoalCardLink({
  goal,
  to,
  snap = true,
}: {
  goal: Pick<GoalItem, 'title' | 'image_url' | 'finished'>
  to: string
  snap?: boolean
}) {
  return (
    <Link to={to} className={cardClass(goal, snap ? styles.snap : undefined)}>
      <GoalCardFace goal={goal} />
    </Link>
  )
}

export function GoalCardGrid({ children, compact }: { children: ReactNode; compact?: boolean }) {
  return <ul className={[styles.grid, compact ? styles.compact : ''].filter(Boolean).join(' ')}>{children}</ul>
}

export function GoalCardScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollCarousel trackClassName={styles.scroll} label="goals">
      {children}
    </ScrollCarousel>
  )
}