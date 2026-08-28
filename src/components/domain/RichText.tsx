import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'

export type RichPart =
  | string
  | { label: string; href: string }
  | { label: string; to: string }

type RichTextProps = {
  parts: RichPart[]
  className?: string
  linkClassName?: string
}

function isExternal(part: RichPart): part is { label: string; href: string } {
  return typeof part === 'object' && 'href' in part
}

function isInternal(part: RichPart): part is { label: string; to: string } {
  return typeof part === 'object' && 'to' in part
}

export function RichText({ parts, className, linkClassName }: RichTextProps) {
  const nodes: ReactNode[] = parts.map((part, index) => {
    if (typeof part === 'string') return <span key={index}>{part}</span>
    if (isExternal(part)) {
      return (
        <a
          key={index}
          href={part.href}
          className={linkClassName}
          target={part.href.startsWith('mailto:') ? undefined : '_blank'}
          rel={part.href.startsWith('mailto:') ? undefined : 'noreferrer'}
        >
          {part.label}
        </a>
      )
    }
    if (isInternal(part)) {
      return (
        <Link key={index} to={part.to} className={linkClassName}>
          {part.label}
        </Link>
      )
    }
    return null
  })

  return <p className={className}>{nodes}</p>
}
