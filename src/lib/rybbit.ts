import rybbit from '@rybbit/js'

/** Self-hosted Rybbit — site ID is public (same as the snippet `data-site-id`). */
const ANALYTICS_HOST = 'https://stats.alleksy.com/api'
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
