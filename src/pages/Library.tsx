import { useCallback, useMemo, useState } from 'react'
import { LayoutGrid, List, Star } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { ApiEmptyState } from '@/components/domain/ApiEmptyState'
import { EmptyState } from '@/components/domain/EmptyState'
import { ItemCardButton, ItemGrid } from '@/components/domain/ItemGrid'
import { ItemModal } from '@/components/domain/ItemModal'
import { ListPageSkeleton } from '@/components/domain/PageSkeleton'
import { Rating } from '@/components/domain/Rating'
import { YearHeading } from '@/components/domain/YearHeading'
import { PageHeader } from '@/components/layout/PageHeader'
import { Chip, ChipBar, ChipLabel, IconButton, VStack } from '@/components/ui'
import { FilterBar } from '@/components/domain/FilterBar'
import { getLibrary, getLibraryItem } from '@/api/library'
import { getVinyl } from '@/api/vinyl'
import { libraryCopy } from '@/content/library'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useItemParam } from '@/hooks/useItemParam'
import { parseBookNotes } from '@/lib/format'
import type { LibraryItem, VinylRecord } from '@/types'
import styles from './Library.module.css'

type Collection = 'books' | 'vinyl'
type ViewMode = 'grid' | 'list'

const FAVOURITES_FILTER = 'favourites'
const BOOK_VIEW_KEY = 'aimnw:library-books-view'

type TagTone = { soft: string; fill: string; border: string }

/** Distinct colours for the five most-used categories. */
const TOP_TAG_TONES: TagTone[] = [
  { soft: '#e7f0e9', fill: '#2f6b45', border: '#2f6b45' },
  { soft: '#e7eef5', fill: '#2f5a85', border: '#2f5a85' },
  { soft: '#f5e9ec', fill: '#8a3d52', border: '#8a3d52' },
  { soft: '#f4eee7', fill: '#8a5a2f', border: '#8a5a2f' },
  { soft: '#e7f2f1', fill: '#2f6b66', border: '#2f6b66' },
]

/** Everyone else shares the quiet base chip. */
const BASE_TAG_TONE: TagTone = {
  soft: 'var(--color-surface)',
  fill: 'var(--color-fg-muted)',
  border: 'var(--color-border)',
}

function buildTagToneMap(categories: { name: string; count: number }[]) {
  const top = [...categories]
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, TOP_TAG_TONES.length)

  const map = new Map<string, TagTone>()
  top.forEach((tag, index) => {
    map.set(tag.name, TOP_TAG_TONES[index] ?? BASE_TAG_TONE)
  })
  return map
}

function tagTone(category: string, toneMap: Map<string, TagTone>) {
  return toneMap.get(category) ?? BASE_TAG_TONE
}

function readBookView(): ViewMode {
  try {
    return localStorage.getItem(BOOK_VIEW_KEY) === 'list' ? 'list' : 'grid'
  } catch {
    return 'grid'
  }
}

function writeBookView(view: ViewMode) {
  try {
    localStorage.setItem(BOOK_VIEW_KEY, view)
  } catch {
    /* ignore quota / private mode */
  }
}

function yearRead(book: LibraryItem): number {
  if (book.finished_at) {
    const parsed = new Date(book.finished_at).getFullYear()
    if (Number.isFinite(parsed)) return parsed
  }
  return book.year
}

function groupByYear<T>(
  items: T[],
  getYear: (item: T) => number,
): { year: number; items: T[] }[] {
  const map = new Map<number, T[]>()
  for (const item of items) {
    const year = getYear(item)
    const bucket = map.get(year)
    if (bucket) bucket.push(item)
    else map.set(year, [item])
  }
  return [...map.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, group]) => ({ year, items: group }))
}

function parseCollection(value: string | null): Collection {
  return value === 'vinyl' ? 'vinyl' : 'books'
}

export function LibraryPage() {
  const { openItem } = useItemParam()
  const [searchParams, setSearchParams] = useSearchParams()
  const collection = parseCollection(searchParams.get('collection'))
  const [filter, setFilter] = useState('all')
  const [view, setView] = useState<ViewMode>(() => readBookView())
  const state = useAsyncResource('library', (signal) => getLibrary(signal))
  const vinyl = useAsyncResource('vinyl', (signal) => getVinyl(signal))
  const loadItem = useCallback(
    (id: string, signal: AbortSignal) => getLibraryItem(id, signal),
    [],
  )

  const setBookView = useCallback((next: ViewMode) => {
    setView(next)
    writeBookView(next)
  }, [])

  const setCollection = useCallback(
    (next: Collection) => {
      const params = new URLSearchParams(searchParams)
      if (next === 'books') params.delete('collection')
      else params.set('collection', next)
      if (next === 'vinyl') params.delete('item')
      setSearchParams(params, { replace: true })
      setFilter('all')
    },
    [searchParams, setSearchParams],
  )

  const categories = useMemo(() => {
    if (state.status !== 'success') return [] as { name: string; count: number }[]
    const counts = new Map<string, number>()
    for (const book of state.data) {
      counts.set(book.category, (counts.get(book.category) ?? 0) + 1)
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
  }, [state])

  const tagToneMap = useMemo(() => buildTagToneMap(categories), [categories])

  const favouritesCount = useMemo(() => {
    if (state.status !== 'success') return 0
    return state.data.filter((book) => book.rating >= 5).length
  }, [state])

  const visibleBooks = useMemo(() => {
    if (state.status !== 'success') return []
    const filtered =
      filter === 'all'
        ? state.data
        : filter === FAVOURITES_FILTER
          ? state.data.filter((book) => book.rating >= 5)
          : state.data.filter((book) => book.category === filter)
    return [...filtered].sort((a, b) => {
      const yearDiff = yearRead(b) - yearRead(a)
      if (yearDiff !== 0) return yearDiff
      if (b.rating !== a.rating) return b.rating - a.rating
      return a.title.localeCompare(b.title)
    })
  }, [state, filter])

  const bookYears = useMemo(
    () => groupByYear(visibleBooks, yearRead),
    [visibleBooks],
  )

  const copy = collection === 'books' ? libraryCopy.books : libraryCopy.vinyl
  const bookTotal = state.status === 'success' ? state.data.length : 0

  return (
    <VStack gap={6}>
      <PageHeader
        title={libraryCopy.title}
        description={copy.description}
        end={
          <ChipBar aria-label="Collection">
            <Chip
              role="tab"
              aria-selected={collection === 'books'}
              active={collection === 'books'}
              onClick={() => setCollection('books')}
            >
              {libraryCopy.books.label}
            </Chip>
            <Chip
              role="tab"
              aria-selected={collection === 'vinyl'}
              active={collection === 'vinyl'}
              onClick={() => setCollection('vinyl')}
            >
              {libraryCopy.vinyl.label}
            </Chip>
          </ChipBar>
        }
      />

      {collection === 'books' ? (
        <>
          {state.status === 'loading' ? <ListPageSkeleton /> : null}
          {state.status === 'error' ? (
            <ApiEmptyState error={state.error} notConfigured={state.notConfigured} />
          ) : null}
          {state.status === 'success' ? (
            <>
              <LibraryToolbar
                total={bookTotal}
                favouritesCount={favouritesCount}
                filter={filter}
                onFilter={setFilter}
                tags={categories}
                tagToneMap={tagToneMap}
                view={view}
                onView={setBookView}
                showViewToggle
              />
              {visibleBooks.length === 0 ? (
                <EmptyState
                  message={
                    filter === FAVOURITES_FILTER
                      ? 'No five-star books yet.'
                      : 'Library is empty for now.'
                  }
                />
              ) : (
                <div className={styles.years}>
                  {bookYears.map(({ year, items }) => (
                    <section key={year} className={styles.yearBlock} aria-labelledby={`year-${year}`}>
                      <YearHeading id={`year-${year}`} label={year} count={items.length} />
                      {view === 'grid' ? (
                        <ItemGrid density="covers">
                          {items.map((book) => (
                            <ItemCardButton
                              key={book.id}
                              title={`${book.title} by ${book.author}`}
                              imageUrl={book.cover_url}
                              mediaRatio="book"
                              titleMode="none"
                              fallback={book.title.slice(0, 1)}
                              onClick={() => openItem(book.id)}
                            />
                          ))}
                        </ItemGrid>
                      ) : (
                        <ul className="ui-index-list ui-index-compact">
                          {items.map((book) => {
                            const tone = tagTone(book.category, tagToneMap)
                            return (
                              <li key={book.id}>
                                <button
                                  type="button"
                                  className="ui-index-item ui-index-row ui-index-row-aside"
                                  onClick={() => openItem(book.id)}
                                >
                                  {book.cover_url ? (
                                    <img
                                      src={book.cover_url}
                                      alt=""
                                      className="ui-index-lead ui-index-lead-cover"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <span
                                      className="ui-index-lead ui-index-lead-cover ui-index-lead-empty"
                                      aria-hidden="true"
                                    />
                                  )}
                                  <span className="ui-index-copy">
                                    <span className="ui-item-title">{book.title}</span>
                                    <span className="ui-index-excerpt">{book.author}</span>
                                  </span>
                                  <span className="ui-index-aside">
                                    <ChipLabel
                                      style={{
                                        background: tone.soft,
                                        color: tone.fill,
                                        borderColor: tone.border,
                                      }}
                                    >
                                      {book.category}
                                    </ChipLabel>
                                    <Rating value={book.rating} variant="star" />
                                  </span>
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </section>
                  ))}
                </div>
              )}
            </>
          ) : null}
        </>
      ) : (
        <>
          {vinyl.status === 'loading' ? <ListPageSkeleton cards={8} /> : null}
          {vinyl.status === 'error' ? (
            <ApiEmptyState error={vinyl.error} notConfigured={vinyl.notConfigured} />
          ) : null}
          {vinyl.status === 'success' ? (
            vinyl.data.length === 0 ? (
              <EmptyState message="No records yet." />
            ) : (
              <div className={styles.vinylShelf}>
                <div className={styles.vinylStand}>
                  {vinyl.data.map((record) => (
                    <VinylCoverCard key={record.id} record={record} />
                  ))}
                </div>
              </div>
            )
          ) : null}
        </>
      )}

      {collection === 'books' ? (
        <ItemModal<LibraryItem>
          titleFallback="Book"
          load={loadItem}
          getTitle={(item) => item.title}
          getTitleAside={(item) =>
            item.rating >= 5 ? (
              <span className={styles.titleFavorite} aria-label="all-time favourite">
                <Star size={15} strokeWidth={1.75} fill="currentColor" />
              </span>
            ) : null
          }
          render={(item) => (
            <LibraryDetail book={item} tone={tagTone(item.category, tagToneMap)} />
          )}
        />
      ) : null}
    </VStack>
  )
}

function LibraryToolbar({
  total,
  favouritesCount,
  filter,
  onFilter,
  tags,
  tagToneMap,
  view,
  onView,
  showViewToggle = false,
}: {
  total: number
  favouritesCount: number
  filter: string
  onFilter: (value: string) => void
  tags: { name: string; count: number }[]
  tagToneMap: Map<string, TagTone>
  view?: ViewMode
  onView?: (value: ViewMode) => void
  showViewToggle?: boolean
}) {
  const favouritesActive = filter === FAVOURITES_FILTER

  return (
    <div className={styles.toolbar}>
      <FilterBar
        className={styles.tagRow}
        options={tags.map((tag) => tag.name)}
        value={favouritesActive ? '' : filter}
        onChange={onFilter}
        counts={{
          all: total,
          ...Object.fromEntries(tags.map((tag) => [tag.name, tag.count])),
        }}
        optionStyle={(name, active) => {
          const tone = tagTone(name, tagToneMap)
          return active
            ? {
                background: tone.fill,
                color: 'var(--color-on-solid)',
                borderColor: tone.fill,
              }
            : {
                background: tone.soft,
                color: tone.fill,
                borderColor: tone.border,
              }
        }}
        leading={
          <IconButton
            role="tab"
            aria-selected={favouritesActive}
            className={favouritesActive ? styles.favouritesFilterActive : undefined}
            aria-label={`All-time favourites${favouritesCount ? `, ${favouritesCount}` : ''}`}
            title="All-time favourites"
            onClick={() => onFilter(favouritesActive ? 'all' : FAVOURITES_FILTER)}
          >
            <Star
              size={16}
              strokeWidth={1.75}
              fill={favouritesActive ? 'currentColor' : 'none'}
              aria-hidden="true"
            />
          </IconButton>
        }
      />
      {showViewToggle && view && onView ? (
        <div className={styles.toolbarAside}>
          <div className={styles.viewToggle} role="group" aria-label="View mode">
            <IconButton
              active={view === 'grid'}
              aria-pressed={view === 'grid'}
              aria-label="Grid view"
              onClick={() => onView('grid')}
            >
              <LayoutGrid size={15} strokeWidth={1.75} />
            </IconButton>
            <IconButton
              active={view === 'list'}
              aria-pressed={view === 'list'}
              aria-label="List view"
              onClick={() => onView('list')}
            >
              <List size={15} strokeWidth={1.75} />
            </IconButton>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function VinylCoverCard({ record }: { record: VinylRecord }) {
  return (
    <a
      className={styles.vinylCard}
      href={record.url}
      target="_blank"
      rel="noreferrer"
      aria-label={`${record.title} by ${record.artist}`}
    >
      <span className={styles.vinylLift}>
        <span className={styles.vinylDisc} aria-hidden="true" />
        {record.coverUrl ? (
          <img
            src={record.coverUrl}
            alt=""
            className={styles.vinylCover}
            loading="lazy"
          />
        ) : (
          <span className={styles.vinylFallback} aria-hidden="true">
            {record.artist.slice(0, 1)}
          </span>
        )}
      </span>
      <span className={styles.vinylFoot} aria-hidden="true" />
    </a>
  )
}

function LibraryDetail({ book, tone }: { book: LibraryItem; tone: TagTone }) {
  const notes = parseBookNotes(book.description ?? '')

  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        {book.cover_url ? (
          <img className={styles.detailCover} src={book.cover_url} alt="" />
        ) : (
          <div className={styles.detailCoverEmpty} aria-hidden="true">
            {book.title.slice(0, 1)}
          </div>
        )}
        <div className={styles.detailIntro}>
          <p className="ui-item-title">{book.author}</p>
          <div className={styles.detailMeta}>
            <ChipLabel
              style={{
                background: tone.soft,
                color: tone.fill,
                borderColor: tone.border,
              }}
            >
              {book.category}
            </ChipLabel>
            <Rating value={book.rating} variant="star" size="md" />
          </div>
        </div>
        {notes.length ? (
          <div className={styles.notes}>
            {notes.map((block, index) =>
              block.type === 'quote' ? (
                <blockquote key={index} className={styles.quote}>
                  {block.text}
                </blockquote>
              ) : (
                <p key={index} className={styles.note}>
                  {block.text}
                </p>
              ),
            )}
          </div>
        ) : (
          <p className={styles.noteEmpty}>No notes yet.</p>
        )}
      </div>
    </div>
  )
}
