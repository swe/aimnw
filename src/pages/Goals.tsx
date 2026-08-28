import { PageHeader } from '@/components/layout/PageHeader'
import { ApiEmptyState } from '@/components/domain/ApiEmptyState'
import { EmptyState } from '@/components/domain/EmptyState'
import { GoalCard, GoalCardGrid } from '@/components/domain/GoalCard'
import { ListPageSkeleton } from '@/components/domain/PageSkeleton'
import { VStack } from '@/components/ui'
import { getGoals } from '@/api/goals'
import { goalsPage } from '@/content/goals'
import { shufflePreview } from '@/content/home'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useMemo } from 'react'

/** Survives Strict Mode remounts so the grid doesn’t reshuffle after first paint. */
let goalVisitOrder: string[] = []

export function GoalsPage() {
  const state = useAsyncResource('goals', (signal) => getGoals(signal))
  const goals = state.status === 'success' ? state.data.goals : null

  const ordered = useMemo(() => {
    if (!goals) return []
    if (goals.length === 0) {
      goalVisitOrder = []
      return []
    }
    const byId = new Map(goals.map((goal) => [goal.id, goal]))
    const sameSet =
      goalVisitOrder.length === goals.length && goalVisitOrder.every((id) => byId.has(id))
    if (!sameSet) {
      goalVisitOrder = shufflePreview(goals).map((goal) => goal.id)
    }
    return goalVisitOrder.flatMap((id) => {
      const goal = byId.get(id)
      return goal ? [goal] : []
    })
  }, [goals])

  const currentYear = new Date().getFullYear()
  const apiYear = state.status === 'success' ? state.data.year : null
  const year = apiYear != null && Number.isFinite(apiYear) ? apiYear : currentYear
  const title = `${year} Goals`

  return (
    <VStack gap={6}>
      <PageHeader title={title} description={goalsPage.lede} />

      {state.status === 'loading' ? <ListPageSkeleton cards={6} /> : null}
      {state.status === 'error' ? (
        <ApiEmptyState error={state.error} notConfigured={state.notConfigured} />
      ) : null}
      {state.status === 'success' ? (
        state.data.goals.length === 0 ? (
          <EmptyState message={goalsPage.empty} />
        ) : (
          <GoalCardGrid>
            {ordered.map((goal) => (
              <li key={goal.id}>
                <GoalCard goal={goal} />
              </li>
            ))}
          </GoalCardGrid>
        )
      ) : null}
    </VStack>
  )
}