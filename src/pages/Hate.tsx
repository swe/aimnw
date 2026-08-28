import { PageHeader } from '@/components/layout/PageHeader'
import { ApiEmptyState } from '@/components/domain/ApiEmptyState'
import { EmptyState } from '@/components/domain/EmptyState'
import { ListPageSkeleton } from '@/components/domain/PageSkeleton'
import { VStack } from '@/components/ui'
import { activeHateCategories, getHates } from '@/api/hates'
import { hate } from '@/content/hate'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import styles from './Hate.module.css'

export function HatePage() {
  const state = useAsyncResource('hate', (signal) => getHates(signal))
  const categories =
    state.status === 'success' ? activeHateCategories(state.data.categories) : []

  return (
    <VStack gap={6}>
      <PageHeader title={hate.title} description={hate.lede} />

      {state.status === 'loading' ? <ListPageSkeleton cards={5} /> : null}
      {state.status === 'error' ? (
        <ApiEmptyState error={state.error} notConfigured={state.notConfigured} />
      ) : null}
      {state.status === 'success' ? (
        categories.length === 0 ? (
          <EmptyState message="The list is quiet for now." />
        ) : (
          <>
            <div className={styles.columns}>
              {categories.map((category) => (
                <section
                  key={category.id}
                  className={styles.category}
                  aria-labelledby={`hate-${category.id}`}
                >
                  <h2 id={`hate-${category.id}`} className="ui-kicker">
                    {category.title}
                  </h2>
                  <ul className="ui-list">
                    {category.items.map((item) => (
                      <li key={item.id} className="ui-list-item">
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <p className={styles.footer}>{hate.footer}</p>
          </>
        )
      ) : null}
    </VStack>
  )
}
