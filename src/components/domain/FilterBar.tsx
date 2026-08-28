import type { CSSProperties, ReactNode } from 'react'
import { Chip, ChipBar } from '@/components/ui/Chip'

type FilterBarProps = {
  options: string[]
  value: string
  onChange: (value: string) => void
  allLabel?: string
  formatLabel?: (label: string) => ReactNode
  counts?: Record<string, number>
  leading?: ReactNode
  className?: string
  optionStyle?: (option: string, active: boolean) => CSSProperties | undefined
}

export function FilterBar({
  options,
  value,
  onChange,
  allLabel = 'All',
  formatLabel = (label) => label,
  counts,
  leading,
  className,
  optionStyle,
}: FilterBarProps) {
  const items = [allLabel, ...options]

  return (
    <ChipBar className={className} aria-label="Filter">
      {leading}
      {items.map((option) => {
        const next = option === allLabel ? 'all' : option
        const active = value === next
        return (
          <Chip
            key={option}
            role="tab"
            aria-selected={active}
            active={active}
            count={counts?.[next]}
            onClick={() => onChange(next)}
            style={option === allLabel ? undefined : optionStyle?.(option, active)}
          >
            {option === allLabel ? allLabel : formatLabel(option)}
          </Chip>
        )
      })}
    </ChipBar>
  )
}