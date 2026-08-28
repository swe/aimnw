import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'
import { Modal, Text } from '@/components/ui'
import { DetailSkeleton } from '@/components/domain/PageSkeleton'
import { ApiError } from '@/api/client'
import { useItemParam } from '@/hooks/useItemParam'

type ItemModalProps<T> = {
  titleFallback?: string
  slug?: string | null
  onClose?: () => void
  load: (slug: string, signal: AbortSignal) => Promise<T>
  getTitle: (item: T) => string
  getTitleAside?: (item: T) => ReactNode
  render: (item: T) => ReactNode
  dialogClassName?: string
  fit?: boolean
}

export function ItemModal<T>({
  titleFallback = 'Details',
  slug: slugProp,
  onClose,
  load,
  getTitle,
  getTitleAside,
  render,
  dialogClassName,
  fit = false,
}: ItemModalProps<T>) {
  const { item: paramSlug, closeItem } = useItemParam()
  const slug = slugProp !== undefined ? slugProp : paramSlug
  const handleClose = onClose ?? closeItem
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!slug) {
      setData(null)
      setError(null)
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setData(null)

    load(slug, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result)
          setLoading(false)
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        const message =
          err instanceof ApiError ? err.message : 'Something went wrong loading this item.'
        setError(message)
        setLoading(false)
      })

    return () => controller.abort()
  }, [slug, load])

  const open = Boolean(slug)
  const title = data ? getTitle(data) : titleFallback
  const titleAside = data && getTitleAside ? getTitleAside(data) : null

  return (
    <Modal
      open={open}
      title={title}
      titleAside={titleAside}
      onClose={handleClose}
      busy={loading}
      className={dialogClassName}
      fit={fit}
    >
      {loading ? <DetailSkeleton /> : null}
      {!loading && error ? <Text tone="muted">{error}</Text> : null}
      {!loading && !error && data ? render(data) : null}
    </Modal>
  )
}
