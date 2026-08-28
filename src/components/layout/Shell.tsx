import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { documentTitleFor } from '@/content/documentTitles'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { PageBackContext } from './BackButton'
import { ContactFab } from './ContactFab'
import { Nav } from './Nav'
import styles from './Shell.module.css'

const floatingBackExact: Record<string, string> = {
  '/hate': '/whoami',
  '/drink': '/whoami',
  '/use': '/whoami',
  '/viewfinder': '/whoami',
  '/experiments': '/whoami',
  '/principles': '/whoami',
}

function floatingBackFor(pathname: string): { fallback: string } | null {
  const path = pathname.replace(/\/+$/, '') || '/'
  if (floatingBackExact[path]) return { fallback: floatingBackExact[path] }
  if (path.startsWith('/experiments/')) return { fallback: '/experiments' }
  if (path.startsWith('/headspace/')) return { fallback: '/headspace' }

  const segments = path.split('/').filter(Boolean)
  if (segments[0] === 'use' && segments.length === 2) return { fallback: '/use' }
  if (segments[0] === 'use' && segments.length >= 3) {
    return { fallback: `/use/${segments[1]}` }
  }

  return null
}

export function Shell() {
  const { pathname, search } = useLocation()
  const back = floatingBackFor(pathname)
  const isMap = pathname === '/map'

  useDocumentTitle(documentTitleFor(pathname, search))

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <PageBackContext.Provider value={back}>
      {isMap ? (
        <>
          <header className={[styles.top, styles.topMap].filter(Boolean).join(' ')}>
            <div className={styles.inner}>
              <Nav />
            </div>
          </header>
          <div className={styles.shellMap}>
            <main className={styles.mainMap}>
              <div className={styles.innerMap}>
                <Outlet />
              </div>
            </main>
            <ContactFab />
          </div>
        </>
      ) : (
        <div className={styles.shell}>
          <header className={styles.top}>
            <div className={styles.inner}>
              <Nav />
            </div>
          </header>
          <main className={styles.main}>
            <div className={styles.inner}>
              <Outlet />
            </div>
          </main>
          <ContactFab />
        </div>
      )}
    </PageBackContext.Provider>
  )
}
