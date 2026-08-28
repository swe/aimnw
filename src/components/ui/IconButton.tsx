import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import styles from './IconButton.module.css'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'ghost' | 'bordered'
  tone?: 'default' | 'onDark'
  active?: boolean
  children?: ReactNode
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      variant = 'ghost',
      tone = 'default',
      active,
      className,
      children,
      type = 'button',
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={[
          styles.button,
          styles[variant],
          tone === 'onDark' ? styles.onDark : '',
          active ? styles.active : '',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </button>
    )
  },
)
