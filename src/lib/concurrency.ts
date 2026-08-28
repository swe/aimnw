/** Runs `task` over `items` with a bounded worker pool, keeping input order. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let next = 0

  async function worker() {
    for (;;) {
      const index = next
      next += 1
      if (index >= items.length) return
      results[index] = await task(items[index], index)
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () => worker()),
  )
  return results
}
