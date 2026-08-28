import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'

type BoxProps = HTMLAttributes<HTMLDivElement> & {
  as?: 'div' | 'section' | 'article' | 'main' | 'aside' | 'header' | 'footer' | 'nav'
  children?: ReactNode
}

export function Box({ as: Tag = 'div', children, ...props }: BoxProps) {
  return <Tag {...props}>{children}</Tag>
}

type StackProps = HTMLAttributes<HTMLDivElement> & {
  gap?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | (string & {})
  align?: CSSProperties['alignItems']
  justify?: CSSProperties['justifyContent']
  direction?: 'row' | 'column'
  wrap?: boolean
  children?: ReactNode
}

const gapMap = {
  1: 'var(--space-1)',
  2: 'var(--space-2)',
  3: 'var(--space-3)',
  4: 'var(--space-4)',
  5: 'var(--space-5)',
  6: 'var(--space-6)',
  7: 'var(--space-7)',
  8: 'var(--space-8)',
} as const

export function Stack({
  gap = 4,
  align,
  justify,
  direction = 'column',
  wrap,
  style,
  children,
  ...props
}: StackProps) {
  const resolvedGap = typeof gap === 'number' ? gapMap[gap] : gap

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        alignItems: align,
        justifyContent: justify,
        flexWrap: wrap ? 'wrap' : undefined,
        gap: resolvedGap,
        minWidth: 0,
        maxWidth: '100%',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  )
}

export function VStack(props: Omit<StackProps, 'direction'>) {
  return <Stack direction="column" {...props} />
}

export function HStack(props: Omit<StackProps, 'direction'>) {
  return <Stack direction="row" {...props} />
}
