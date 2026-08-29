const MEDIA_HOST = 'i.alleksy.com'
const PROXY_PREFIX = '/media/i'

/**
 * Rewrite `https://i.alleksy.com/...` to same-origin `/media/i/...` so the browser
 * never talks to the expired cert. Other URLs pass through unchanged.
 */
export function proxiedMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.href : 'https://local')
    if (parsed.hostname !== MEDIA_HOST) return url
    return `${PROXY_PREFIX}${parsed.pathname}${parsed.search}`
  } catch {
    return url
  }
}

export function proxiedMediaUrlRequired(url: string): string {
  return proxiedMediaUrl(url) ?? url
}
