export const siteLinks = [
  { to: '/', label: 'Home', end: true },
  { to: '/whoami', label: 'Whoami' },
  { to: '/now', label: 'Now' },
  { to: '/headspace', label: 'Headspace' },
  { to: '/map', label: 'Map' },
  { to: '/library', label: 'Library' },
  { to: '/goals', label: 'Goals' },
  { to: '/sport', label: 'Training' },
  { to: '/ai', label: 'AI' },
  { to: '/use', label: 'Use' },
  { to: '/hate', label: 'Hate' },
  { to: '/drink', label: 'Drink' },
] as const

export const primaryNavLinks = siteLinks.filter(
  (link) =>
    link.to !== '/' &&
    link.to !== '/use' &&
    link.to !== '/hate' &&
    link.to !== '/drink',
)
