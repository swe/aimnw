import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import styles from './Chip.module.css'

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  count?: number
  children?: ReactNode
}

export function Chip({ active, count, className, children, type = 'button', ...props }: ChipProps) {
  return (
    <button
      type={type}
      className={[styles.chip, active ? styles.active : '', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
      {count != null ? <span className={styles.count}>{count}</span> : null}
    </button>
  )
}

type ChipLinkProps = {
  to: string
  active?: boolean
  className?: string
  children?: ReactNode
  onClick?: AnchorHTMLAttributes<HTMLAnchorElement>['onClick']
  'aria-label'?: string
}

export function ChipLink({ to, active, className, children, onClick, 'aria-label': ariaLabel }: ChipLinkProps) {
  return (
    <Link
      to={to}
      className={[styles.chip, active ? styles.active : '', className].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {children}
    </Link>
  )
}

type ChipLabelProps = {
  children?: ReactNode
  className?: string
  style?: CSSProperties
}

export function ChipLabel({ children, className, style }: ChipLabelProps) {
  return (
    <span className={[styles.label, className].filter(Boolean).join(' ')} style={style}>
      {children}
    </span>
  )
}

type ChipBarProps = {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  'aria-label'?: string
}

export function ChipBar({ children, className, style, 'aria-label': ariaLabel }: ChipBarProps) {
  return (
    <div
      className={[styles.bar, className].filter(Boolean).join(' ')}
      role="tablist"
      aria-label={ariaLabel}
      style={style}
    >
      {children}
    </div>
  )
}