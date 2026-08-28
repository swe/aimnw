import { createContext, useContext } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { IconButton } from '@/components/ui'
import styles from './BackButton.module.css'

export type PageBack = { fallback: string }

export const PageBackContext = createContext<PageBack | null>(null)

export function usePageBack() {
  return useContext(PageBackContext)
}

type BackButtonProps = {
  fallback: string
  label?: string
  appearance?: 'mark' | 'inline'
}

function canGoBack() {
  const idx = window.history.state?.idx
  return typeof idx === 'number' && idx > 0
}

export function BackButton({
  fallback,
  label = 'Back',
  appearance = 'mark',
}: BackButtonProps) {
  const navigate = useNavigate()

  const go = () => {
    if (canGoBack()) {
      navigate(-1)
      return
    }
    navigate(fallback)
  }

  if (appearance === 'inline') {
    return (
      <button type="button" className={styles.inline} onClick={go}>
        <ArrowLeft className={styles.icon} size={14} strokeWidth={1.75} aria-hidden="true" />
        <span>{label}</span>
      </button>
    )
  }

  return (
    <IconButton variant="bordered" aria-label={label} onClick={go}>
      <ArrowLeft className={styles.icon} size={14} strokeWidth={1.75} aria-hidden="true" />
      <span className={styles.label}>{label}</span>
    </IconButton>
  )
}
