import { useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Menu, X } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { Logo } from '@/components/brand/Logo'
import { IconButton } from '@/components/ui'
import { routePrefetchProps } from '@/api/preload'
import { primaryNavLinks } from '@/content/links'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import styles from './Nav.module.css'

/** Sub-routes that should keep a primary nav item highlighted. */
const navActiveAliases: Record<string, readonly string[]> = {
  '/whoami': ['/hate', '/drink', '/viewfinder', '/experiments', '/principles'],
  '/headspace': ['/headspace'],
}

function isNavActive(to: string, pathname: string, isActive: boolean) {
  if (isActive) return true
  const aliases = navActiveAliases[to]
  return Boolean(aliases?.some((alias) => pathname === alias || pathname.startsWith(`${alias}/`)))
}

function isCurrentNavPage(to: string, pathname: string) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  const normalizedTo = to.replace(/\/+$/, '') || '/'
  return isNavActive(to, pathname, normalizedPath === normalizedTo)
}

export function Nav() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const { skipRestore } = useBodyScrollLock(open, {
    className: 'nav-sheet-open',
    strategy: 'overflow',
  })

  useEffect(() => {
    skipRestore()
    setOpen(false)
  }, [pathname, skipRestore])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 861px)')
    const onChange = () => {
      if (mq.matches) setOpen(false)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    sheetRef.current?.focus()
    const menuButton = buttonRef.current

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      menuButton?.focus()
    }
  }, [open])

  return (
    <nav className={[styles.nav, open ? styles.navOpen : ''].filter(Boolean).join(' ')} aria-label="Primary">
      <NavLink to="/" className={styles.brand} end aria-label="Home">
        <Logo className={styles.logo} />
      </NavLink>

      <ul className={styles.list}>
        {primaryNavLinks.map((link) => (
          <li key={link.to}>
            <NavLink
              to={link.to}
              {...routePrefetchProps(link.to)}
              className={({ isActive }) =>
                [
                  styles.link,
                  isNavActive(link.to, pathname, isActive) ? styles.active : '',
                ]
                  .filter(Boolean)
                  .join(' ')
              }
            >
              {link.label}
            </NavLink>
          </li>
        ))}
      </ul>

      <IconButton
        ref={buttonRef}
        className={styles.menuButton}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
      >
        {open ? (
          <X size={18} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Menu size={18} strokeWidth={1.75} aria-hidden="true" />
        )}
      </IconButton>

      {open
        ? createPortal(
            <div
              ref={sheetRef}
              id={menuId}
              className={styles.sheet}
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              tabIndex={-1}
            >
              <ul className={styles.sheetList}>
                {primaryNavLinks.map((link) => (
                  <li key={link.to}>
                    <NavLink
                      to={link.to}
                      {...routePrefetchProps(link.to)}
                      className={({ isActive }) =>
                        [
                          styles.sheetLink,
                          isNavActive(link.to, pathname, isActive) ? styles.sheetActive : '',
                        ]
                          .filter(Boolean)
                          .join(' ')
                      }
                      onClick={(event) => {
                        if (!isCurrentNavPage(link.to, pathname)) return
                        event.preventDefault()
                        setOpen(false)
                      }}
                    >
                      {link.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </nav>
  )
}
