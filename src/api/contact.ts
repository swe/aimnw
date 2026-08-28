import { proxyFailure } from './client'

export type ContactPayload = {
  email: string
  message: string
  /** Honeypot — leave empty. */
  company?: string
}

export async function sendContactMessage(
  payload: ContactPayload,
  signal?: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    throw await proxyFailure(response, 'receive contact messages')
  }
}
