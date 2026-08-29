import { proxiedMediaUrl } from '@/lib/mediaUrl'

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export class ApiNotConfiguredError extends ApiError {
  envName: string

  constructor(envName: string, purpose = 'load this page') {
    super(`Set ${envName} in .env to ${purpose}.`, 503)
    this.name = 'ApiNotConfiguredError'
    this.envName = envName
  }
}

type RequestOptions = {
  signal?: AbortSignal
}

/** Walk JSON and send any `i.alleksy.com` URLs through `/media/i` (expired origin cert). */
function rewriteMediaUrls<T>(value: T): T {
  if (typeof value === 'string') {
    return (proxiedMediaUrl(value) ?? value) as T
  }
  if (Array.isArray(value)) {
    return value.map((item) => rewriteMediaUrls(item)) as T
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      out[key] = rewriteMediaUrls(nested)
    }
    return out as T
  }
  return value
}

export async function apiGet<T>(baseUrl: string, path = '', options: RequestOptions = {}): Promise<T> {
  if (!baseUrl) {
    throw new ApiError('API base URL is not configured', 500)
  }

  const url = `${baseUrl.replace(/\/$/, '')}${path}`
  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal: options.signal,
  })

  if (!response.ok) {
    throw new ApiError(`Request failed: ${response.status}`, response.status)
  }

  return rewriteMediaUrls((await response.json()) as T)
}

export function requireEnv(value: string | undefined, name: string): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new ApiNotConfiguredError(name)
  }
  return trimmed
}

export function isApiNotConfigured(error: unknown): boolean {
  return error instanceof ApiNotConfiguredError
}

type ProxyOptions = RequestOptions & {
  /** Completes "Set X in .env to …" when the proxy reports an unset variable. */
  purpose?: string
  cache?: RequestCache
}

/**
 * Local `/api/*` proxies keep the secrets, so they report failures as
 * `{ error }`. A "Missing X" body means the env var is unset, which is a
 * setup problem rather than an outage — the two read differently in the UI.
 */
export async function proxyFailure(response: Response, purpose?: string): Promise<ApiError> {
  let detail = `Request failed: ${response.status}`
  try {
    const body = (await response.json()) as { error?: string }
    if (body.error) {
      const missingEnv = /^Missing ([A-Z][A-Z0-9_]*)$/.exec(body.error)
      if (missingEnv) {
        return new ApiNotConfiguredError(missingEnv[1], purpose)
      }
      detail = body.error
    }
  } catch {
    /* the proxy answered with something other than JSON */
  }
  return new ApiError(detail, response.status)
}

export async function proxyGet<T>(path: string, options: ProxyOptions = {}): Promise<T> {
  const response = await fetch(path, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    cache: options.cache,
    signal: options.signal,
  })

  if (!response.ok) throw await proxyFailure(response, options.purpose)

  return (await response.json()) as T
}
