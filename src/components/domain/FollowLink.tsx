import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { routePrefetchProps } from '@/api/preload'
import styles from './FollowLink.module.css'

type FollowLinkProps = {
  to?: string
  href?: string
  children: ReactNode
  className?: string
}

export function FollowLink({ to, href, children, className }: FollowLinkProps) {
  const classNames = [styles.link, className].filter(Boolean).join(' ')
  const inner = (
    <>
      <span className={styles.label}>{children}</span>
      <ArrowUpRight className={styles.icon} aria-hidden="true" strokeWidth={1.75} />
    </>
  )

  if (href) {
    return (
      <a href={href} className={classNames} target="_blank" rel="noreferrer">
        {inner}
      </a>
    )
  }

  const target = to ?? '/'

  return (
    <Link to={target} className={classNames} {...routePrefetchProps(target)}>
      {inner}
    </Link>
  )
}
