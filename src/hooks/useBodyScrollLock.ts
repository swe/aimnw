import { useCallback, useEffect, useRef } from 'react'

type ScrollLockStrategy = 'fixed' | 'overflow'

type Options = {
  className?: string
  /** `fixed` preserves iOS viewport (modals). `overflow` keeps sticky/fixed headers visible (menus). */
  strategy?: ScrollLockStrategy
}

/** Locks body scroll while preserving scroll position (fixes iOS jump / viewport gaps). */
export function useBodyScrollLock(active: boolean, options?: Options | string) {
  const normalized: Options =
    typeof options === 'string' ? { className: options } : (options ?? {})
  const { className, strategy = 'fixed' } = normalized

  const skipRestoreRef = useRef(false)

  const skipRestore = useCallback(() => {
    skipRestoreRef.current = true
  }, [])

  useEffect(() => {
    if (!active) return

    skipRestoreRef.current = false
    const scrollY = window.scrollY
    const { style: bodyStyle } = document.body
    const { style: htmlStyle } = document.documentElement

    const previous = {
      bodyPosition: bodyStyle.position,
      bodyTop: bodyStyle.top,
      bodyLeft: bodyStyle.left,
      bodyRight: bodyStyle.right,
      bodyOverflow: bodyStyle.overflow,
      bodyWidth: bodyStyle.width,
      htmlOverflow: htmlStyle.overflow,
    }

    if (strategy === 'overflow') {
      bodyStyle.overflow = 'hidden'
      htmlStyle.overflow = 'hidden'
    } else {
      bodyStyle.position = 'fixed'
      bodyStyle.top = `-${scrollY}px`
      bodyStyle.left = '0'
      bodyStyle.right = '0'
      bodyStyle.width = '100%'
      bodyStyle.overflow = 'hidden'
    }

    if (className) document.body.classList.add(className)

    return () => {
      bodyStyle.position = previous.bodyPosition
      bodyStyle.top = previous.bodyTop
      bodyStyle.left = previous.bodyLeft
      bodyStyle.right = previous.bodyRight
      bodyStyle.overflow = previous.bodyOverflow
      bodyStyle.width = previous.bodyWidth
      htmlStyle.overflow = previous.htmlOverflow

      if (className) document.body.classList.remove(className)

      if (strategy === 'fixed' && !skipRestoreRef.current) {
        window.scrollTo(0, scrollY)
      }
    }
  }, [active, className, strategy])

  return { skipRestore }
}
