import type { CSSProperties, ElementType, HTMLAttributes, ReactNode } from 'react'

type TextProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType
  size?: 'xs' | 'sm' | 'md' | 'lg'
  tone?: 'default' | 'muted' | 'subtle' | 'accent'
  weight?: CSSProperties['fontWeight']
  children?: ReactNode
}

const sizeMap = {
  xs: 'var(--text-xs)',
  sm: 'var(--text-sm)',
  md: 'var(--text-md)',
  lg: 'var(--text-lg)',
} as const

const toneMap = {
  default: 'var(--color-fg)',
  muted: 'var(--color-fg-muted)',
  subtle: 'var(--color-fg-subtle)',
  accent: 'var(--color-accent)',
} as const

export function Text({
  as: Tag = 'p',
  size = 'md',
  tone = 'default',
  weight,
  style,
  children,
  ...props
}: TextProps) {
  return (
    <Tag
      style={{
        fontSize: sizeMap[size],
        color: toneMap[tone],
        fontWeight: weight,
        lineHeight: 'var(--leading-relaxed)',
        ...style,
      }}
      {...props}
    >
      {children}
    </Tag>
  )
}

type HeadingProps = HTMLAttributes<HTMLHeadingElement> & {
  as?: 'h1' | 'h2' | 'h3' | 'h4'
  size?: 'lg' | 'xl' | '2xl' | '3xl'
  children?: ReactNode
}

const headingClass = {
  lg: 'ui-item-title',
  xl: 'ui-section-title',
  '2xl': 'ui-page-title',
  '3xl': 'ui-page-title',
} as const

export function Heading({
  as: Tag = 'h2',
  size = 'xl',
  className,
  children,
  ...props
}: HeadingProps) {
  return (
    <Tag className={[headingClass[size], className].filter(Boolean).join(' ')} {...props}>
      {children}
    </Tag>
  )
}
