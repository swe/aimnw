import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'

const ITEM_PARAM = 'item'

export function useItemParam() {
  const [searchParams, setSearchParams] = useSearchParams()
  const item = searchParams.get(ITEM_PARAM)

  const openItem = useCallback(
    (slug: string) => {
      const next = new URLSearchParams(searchParams)
      next.set(ITEM_PARAM, slug)
      setSearchParams(next, { replace: false })
    },
    [searchParams, setSearchParams],
  )

  const closeItem = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.delete(ITEM_PARAM)
    setSearchParams(next, { replace: false })
  }, [searchParams, setSearchParams])

  return { item, openItem, closeItem }
}
