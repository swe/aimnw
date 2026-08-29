import rybbit from '@rybbit/js'

/** Same-origin proxy → stats.alleksy.com (avoids sendBeacon CORS credentials issues). */
const ANALYTICS_HOST = '/analytics'
const SITE_ID = '9b0ff68cd9b8'

declare global {
  interface Window {
    rybbit?: typeof rybbit
  }
}

export function initAnalytics(): void {
  window.rybbit = rybbit
  void rybbit.init({
    analyticsHost: ANALYTICS_HOST,
    siteId: SITE_ID,
  })
}
