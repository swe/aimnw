import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import { MessageCircleMore, X } from 'lucide-react'
import { sendContactMessage } from '@/api/contact'
import { ApiError, isApiNotConfigured } from '@/api/client'
import styles from './ContactFab.module.css'

type Status = 'idle' | 'sending' | 'sent' | 'error'

export function ContactFab() {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)

  const rootRef = useRef<HTMLDivElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const formId = useId()
  const titleId = useId()
  const emailId = useId()
  const messageId = useId()

  const canSend =
    email.trim().length > 0 &&
    message.trim().length > 0 &&
    status !== 'sending' &&
    status !== 'sent'

  const close = useCallback(() => {
    setOpen(false)
    setStatus((current) => (current === 'sending' ? current : 'idle'))
    setError(null)
  }, [])

  const openPanel = useCallback(() => {
    setOpen(true)
    setStatus('idle')
    setError(null)
  }, [])

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close()
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('pointerdown', onPointerDown)
    const focusTimer = window.setTimeout(() => emailRef.current?.focus(), 40)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointerdown', onPointerDown)
      window.clearTimeout(focusTimer)
    }
  }, [open, close])

  useEffect(() => {
    if (status !== 'sent') return
    const timer = window.setTimeout(() => {
      setOpen(false)
      setEmail('')
      setMessage('')
      setStatus('idle')
    }, 2200)
    return () => window.clearTimeout(timer)
  }, [status])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSend) return

    setStatus('sending')
    setError(null)

    try {
      await sendContactMessage({
        email: email.trim(),
        message: message.trim(),
        company: honeypot,
      })
      setStatus('sent')
    } catch (err) {
      setStatus('error')
      if (isApiNotConfigured(err)) {
        setError('Contact form is not configured yet.')
      } else if (err instanceof ApiError) {
        setError(err.message)
      } else {
        setError('Could not send — try again in a moment.')
      }
    }
  }

  return (
    <div
      ref={rootRef}
      className={[styles.root, open ? styles.open : ''].filter(Boolean).join(' ')}
    >
      {open ? (
        <form
          id={formId}
          className={styles.panel}
          onSubmit={onSubmit}
          aria-labelledby={titleId}
          noValidate
        >
          <h2 className={styles.title} id={titleId}>
            {status === 'sent' ? 'Message sent' : 'Send me a message'}
          </h2>

          {status === 'sent' ? (
            <p className={styles.success}>
              Thanks — I will write back when I can.
            </p>
          ) : (
            <>
              <label className={styles.honey} htmlFor={`${emailId}-company`}>
                Company
                <input
                  id={`${emailId}-company`}
                  name="company"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(event) => setHoneypot(event.target.value)}
                />
              </label>

              <label className={styles.field} htmlFor={emailId}>
                <span className="sr-only">Your email</span>
                <input
                  ref={emailRef}
                  id={emailId}
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  placeholder="your@email.com (so I can write back)"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  disabled={status === 'sending'}
                />
              </label>

              <label className={styles.field} htmlFor={messageId}>
                <span className="sr-only">Your message</span>
                <textarea
                  id={messageId}
                  name="message"
                  required
                  maxLength={2000}
                  rows={4}
                  placeholder="What's on your mind? Ask any question or just say hi"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  disabled={status === 'sending'}
                />
              </label>

              {error ? <p className={styles.error}>{error}</p> : null}

              <button
                type="submit"
                className={styles.submit}
                disabled={!canSend}
              >
                {status === 'sending' ? 'Sending…' : 'Send'}
              </button>
            </>
          )}
        </form>
      ) : null}

      <button
        type="button"
        className={styles.fab}
        aria-label={open ? 'Close contact form' : 'Send me a message'}
        aria-expanded={open}
        aria-controls={open ? formId : undefined}
        onClick={() => (open ? close() : openPanel())}
      >
        {open ? (
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <MessageCircleMore size={20} strokeWidth={1.6} aria-hidden="true" />
        )}
      </button>
    </div>
  )
}
