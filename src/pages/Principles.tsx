import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { EmptyState } from '@/components/domain/EmptyState'
import { FilterBar } from '@/components/domain/FilterBar'
import { PageHeader } from '@/components/layout/PageHeader'
import { VStack } from '@/components/ui'
import {
  filterPrinciples,
  principleCategoriesInUse,
  principles,
  principlesPage,
  type Principle,
} from '@/content/principles'
import styles from './Principles.module.css'

const ALL = 'all'

const EMPTY_MESSAGE = 'Nothing in this category yet.'

/** Catalogue numbers stay with a principle regardless of the active filter. */
const PRINCIPLE_NUMBERS = new Map(principles.map((entry, index) => [entry.slug, index + 1]))

function explanationParagraphs(explanation?: string | string[]) {
  if (!explanation) return []
  return Array.isArray(explanation) ? explanation : [explanation]
}

function principleNumber(entry: Principle) {
  return String(PRINCIPLE_NUMBERS.get(entry.slug) ?? 0).padStart(2, '0')
}

function PrincipleEntry({ entry }: { entry: Principle }) {
  return (
    <article className={styles.entry} id={entry.slug}>
      <span className={styles.number} aria-hidden="true">
        {principleNumber(entry)}
      </span>
      <div className={styles.body}>
        <div className={styles.head}>
          <h2 className={`ui-item-title ${styles.title}`}>{entry.title}</h2>
          {entry.since ? (
            <span className={styles.since}>
              Since <time dateTime={String(entry.since)}>{entry.since}</time>
            </span>
          ) : null}
        </div>
        <p className="ui-prose">{entry.statement}</p>
        {explanationParagraphs(entry.explanation).map((paragraph) => (
          <p key={paragraph.slice(0, 48)} className="ui-prose">
            {paragraph}
          </p>
        ))}
      </div>
    </article>
  )
}

export function PrinciplesPage() {
  const { hash } = useLocation()
  const [category, setCategory] = useState(ALL)
  const categories = useMemo(() => principleCategoriesInUse(principles), [])
  const visible = useMemo(() => filterPrinciples(principles, category), [category])
  const counts = useMemo(() => {
    const next: Record<string, number> = { all: principles.length }
    for (const name of categories) {
      next[name] = principles.filter((entry) => entry.category === name).length
    }
    return next
  }, [categories])

  useEffect(() => {
    const id = hash.replace(/^#/, '')
    if (!id) return
    if (!principles.some((entry) => entry.slug === id)) return
    setCategory(ALL)
  }, [hash])

  useEffect(() => {
    const id = hash.replace(/^#/, '')
    if (!id || category !== ALL) return
    const target = document.getElementById(id)
    if (!target) return
    requestAnimationFrame(() => {
      target.scrollIntoView({ block: 'start' })
    })
  }, [hash, category, visible])

  const railOptions = [
    { id: ALL, label: 'All' },
    ...categories.map((name) => ({ id: name, label: name })),
  ]

  return (
    <VStack gap={5}>
      <PageHeader title={principlesPage.title} description={principlesPage.lede.join(' ')}>
        <FilterBar
          className={styles.chipFilters}
          options={categories}
          value={category}
          onChange={setCategory}
          counts={counts}
        />
      </PageHeader>

      <div className={styles.layout}>
        <nav className={styles.rail} aria-label="Categories">
          {railOptions.map((option) => {
            const active = category === option.id
            return (
              <button
                key={option.id}
                type="button"
                className={[styles.railButton, active ? styles.railActive : '']
                  .filter(Boolean)
                  .join(' ')}
                aria-pressed={active}
                onClick={() => setCategory(option.id)}
              >
                <span>{option.label}</span>
                <span className={styles.railCount}>{counts[option.id] ?? 0}</span>
              </button>
            )
          })}
        </nav>

        {visible.length === 0 ? (
          <EmptyState message={EMPTY_MESSAGE} />
        ) : (
          <ol className={styles.list}>
            {visible.map((entry) => (
              <li key={entry.slug}>
                <PrincipleEntry entry={entry} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </VStack>
  )
}
