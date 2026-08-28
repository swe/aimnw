/** Default browser title (home and unlisted routes). */
export const SITE_TITLE =
  'Iván Aleksandrov · Security engineer, dogs lover and husband'

export const HEADSPACE_TITLE = 'Iván Aleksandrov · Headspace'

export function headspacePostTitle(postName: string) {
  return `${HEADSPACE_TITLE} · ${postName}`
}

/**
 * Resolve the document title for a location.
 * Headspace posts should call {@link headspacePostTitle} once the note title is known.
 */
export function documentTitleFor(pathname: string, search = ''): string {
  const path = pathname.replace(/\/+$/, '') || '/'
  const params = new URLSearchParams(search)

  if (path === '/') return SITE_TITLE
  if (path === '/whoami') return 'Who is Iván Aleksandrov'
  if (path === '/now') return 'Where is Iván now'
  if (path === '/experiments' || path.startsWith('/experiments/')) {
    return 'Iván Aleksandrov · Experiments'
  }
  if (path === '/viewfinder') return 'Iván Aleksandrov · Viewfinder'
  if (path === '/headspace') return HEADSPACE_TITLE
  if (path.startsWith('/headspace/')) return HEADSPACE_TITLE
  if (path === '/map') return 'Where has Iván been to'
  if (path === '/library') {
    return params.get('collection') === 'vinyl'
      ? 'Iván and his collection of music'
      : 'What Iván read in his life'
  }
  if (path === '/goals') return 'Goals of Iván'
  if (path === '/sport') return 'Iván likes to train well'
  if (path === '/ai') return 'Iván Aleksandrov · AI'
  if (path === '/hate') return 'Iván Aleksandrov · Personal hell'
  if (path === '/use' || path.startsWith('/use/')) return 'Iván and his gear'
  if (path === '/principles') return 'Iván Aleksandrov · Principles of life'
  if (path === '/drink') return "What is in the Iván's glass"

  return SITE_TITLE
}
