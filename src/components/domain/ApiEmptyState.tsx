import { EmptyState } from './EmptyState'

type ApiEmptyStateProps = {
  error: string
  /** True when the source has no credentials yet, rather than being down. */
  notConfigured?: boolean
}

export function ApiEmptyState({ error, notConfigured = false }: ApiEmptyStateProps) {
  return (
    <EmptyState
      message={notConfigured ? 'This page is ready — data isn’t connected yet.' : error}
      hint={notConfigured ? error : 'Check the API or try again in a moment.'}
    />
  )
}
