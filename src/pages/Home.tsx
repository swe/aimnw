import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown } from 'lucide-react'
import { CameraRoll } from '@/components/domain/CameraRoll'
import { Panel } from '@/components/domain/Panel'
import { GoalCardLink, GoalCardScroll } from '@/components/domain/GoalCard'
import {
  ACTIVITY_ICONS,
  ACTIVITY_LABELS,
} from '@/components/domain/sport/weekly/activityMeta'
import { Heading, Skeleton } from '@/components/ui'
import { getGoals } from '@/api/goals'
import { pickRandomHatePreview, getHates } from '@/api/hates'
import { getLibrary } from '@/api/library'
import { getSportHub, pickRecentSportSessions } from '@/api/sport'
import { formatCivilDate } from '@/api/sport/time'
import { getGear } from '@/api/gear'
import { getFieldNotes } from '@/api/notes'
import { fieldNotes } from '@/content/fieldNotes'
import { home, shufflePreview } from '@/content/home'
import { slugify } from '@/lib/format'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import styles from './Home.module.css'

const WorldMapPreview = lazy(() =>
  import('@/components/domain/WorldMapPreview').then((mod) => ({
    default: mod.WorldMapPreview,
  })),
)

type FeelingWord = 'hate' | 'love'

type SpotlightItem = {
  id: string
  title: string
  label?: string
  imageUrl?: string | null
  to?: string
}

const feelingRoutes: Record<FeelingWord, string> = {
  hate: '/hate',
  love: '/use',
}

const feelingActions: Record<FeelingWord, string> = {
  hate: 'See the list of rage',
  love: 'See the full collection',
}

const feelingOptions: FeelingWord[] = ['hate', 'love']

/**
 * A source that was never wired up reads differently from one that broke, and
 * the panels are small enough that a single line has to carry the difference.
 */
function PanelNotice({
  state,
  unwired,
  failed,
}: {
  state: { notConfigured: boolean }
  unwired: string
  failed: string
}) {
  return <p className={styles.muted}>{state.notConfigured ? unwired : failed}</p>
}

const SPOTLIGHT_INTERVAL_MS = 5200
const SPOTLIGHT_PREVIEW_COUNT = 10
const SPOTLIGHT_SWIPE_THRESHOLD_PX = 56

export function HomePage() {
  const library = useAsyncResource('library', (signal) => getLibrary(signal))
  const goals = useAsyncResource('goals', (signal) => getGoals(signal))
  const hates = useAsyncResource('hate', (signal) => getHates(signal))
  const sport = useAsyncResource('sport', (signal) => getSportHub(signal))
  const notes = useAsyncResource(
    'joplin-posts',
    (signal) => getFieldNotes(signal),
    { refreshOnFocus: true },
  )
  const gear = useAsyncResource(
    'use',
    (signal) => getGear(signal),
    { refreshOnFocus: true },
  )
  const [feeling, setFeeling] = useState<FeelingWord>('hate')
  const [feelingOpen, setFeelingOpen] = useState(false)
  const feelingRef = useRef<HTMLSpanElement>(null)
  const feelingListId = useId()
  const [hateSpotlightItems, setHateSpotlightItems] = useState<SpotlightItem[]>([])
  const [loveSpotlightItems, setLoveSpotlightItems] = useState<SpotlightItem[]>([])

  useEffect(() => {
    if (hates.status !== 'success') {
      setHateSpotlightItems([])
      return
    }
    setHateSpotlightItems(pickRandomHatePreview(hates.data.categories, SPOTLIGHT_PREVIEW_COUNT))
  }, [hates])

  useEffect(() => {
    if (gear.status !== 'success') {
      setLoveSpotlightItems([])
      return
    }
    setLoveSpotlightItems(
      shufflePreview(gear.data, SPOTLIGHT_PREVIEW_COUNT).map((item) => ({
        id: item.slug,
        title: item.title,
        label: item.summary,
        imageUrl: item.image,
        to: `/use/${slugify(item.category || 'gear')}/${item.slug}`,
      })),
    )
  }, [gear])

  const spotlightItems = feeling === 'hate' ? hateSpotlightItems : loveSpotlightItems

  const spotlightCount = spotlightItems.length
  const spotlightKey = spotlightItems.map((item) => item.id).join(',')
  const [spotlightIndex, setSpotlightIndex] = useState(0)
  const [spotlightPaused, setSpotlightPaused] = useState(false)
  const [spotlightDragX, setSpotlightDragX] = useState(0)
  const [spotlightDragging, setSpotlightDragging] = useState(false)
  const [spotlightWidth, setSpotlightWidth] = useState(0)
  const [spotlightHeight, setSpotlightHeight] = useState<number | undefined>()
  const spotlightStageRef = useRef<HTMLDivElement>(null)
  const spotlightSlideRefs = useRef<Array<HTMLDivElement | null>>([])
  const spotlightDragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    swiping: boolean
  } | null>(null)

  useEffect(() => {
    setSpotlightIndex(0)
    setSpotlightDragX(0)
  }, [feeling, spotlightKey])

  useEffect(() => {
    const node = spotlightStageRef.current
    if (!node) return

    const measure = () => setSpotlightWidth(node.clientWidth)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(node)
    return () => observer.disconnect()
  }, [spotlightCount, feeling, hates.status, gear.status])

  useEffect(() => {
    const slide = spotlightSlideRefs.current[spotlightIndex]
    if (!slide) return

    const measure = () => setSpotlightHeight(slide.offsetHeight)
    measure()

    const observer = new ResizeObserver(measure)
    observer.observe(slide)

    const images = [...slide.querySelectorAll('img')]
    for (const image of images) {
      image.addEventListener('load', measure)
    }

    return () => {
      observer.disconnect()
      for (const image of images) {
        image.removeEventListener('load', measure)
      }
    }
  }, [spotlightIndex, spotlightKey, spotlightWidth])

  useEffect(() => {
    spotlightSlideRefs.current = spotlightSlideRefs.current.slice(0, spotlightCount)
  }, [spotlightCount])

  useEffect(() => {
    if (spotlightPaused || spotlightDragging || spotlightCount < 2) return
    const id = window.setInterval(() => {
      setSpotlightIndex((current) => (current + 1) % spotlightCount)
    }, SPOTLIGHT_INTERVAL_MS)
    return () => window.clearInterval(id)
  }, [spotlightPaused, spotlightDragging, spotlightCount])

  const spotlightDraggable = feeling === 'hate' && spotlightCount >= 2

  const goToSpotlight = useCallback(
    (next: number) => {
      if (spotlightCount === 0) return
      setSpotlightDragX(0)
      setSpotlightIndex(((next % spotlightCount) + spotlightCount) % spotlightCount)
    },
    [spotlightCount],
  )

  const onSpotlightPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !spotlightDraggable) return
    spotlightDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      swiping: false,
    }
    setSpotlightPaused(true)
  }

  const onSpotlightPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = spotlightDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return

    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY

    if (!drag.swiping) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        drag.swiping = true
        setSpotlightDragging(true)
        event.currentTarget.setPointerCapture(event.pointerId)
      } else {
        return
      }
    }

    event.preventDefault()
    setSpotlightDragX(dx)
  }

  const endSpotlightPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = spotlightDragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    spotlightDragRef.current = null

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    const dx = event.clientX - drag.startX
    const shouldAdvance =
      drag.swiping && Math.abs(dx) >= SPOTLIGHT_SWIPE_THRESHOLD_PX

    setSpotlightDragging(false)
    setSpotlightDragX(0)

    if (shouldAdvance) {
      const step = dx < 0 ? 1 : -1
      setSpotlightIndex((current) => {
        if (spotlightCount === 0) return current
        return ((current + step) % spotlightCount + spotlightCount) % spotlightCount
      })
    }

    if (!event.currentTarget.matches(':hover')) {
      setSpotlightPaused(false)
    }
  }

  useEffect(() => {
    if (!feelingOpen) return

    const onPointerDown = (event: PointerEvent) => {
      if (!feelingRef.current?.contains(event.target as Node)) {
        setFeelingOpen(false)
      }
    }

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setFeelingOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [feelingOpen])

  const onFeelingKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setFeelingOpen(true)
    }
  }

  const reading = useMemo(() => {
    if (library.status !== 'success') return []
    return [...library.data]
      .sort((a, b) => {
        const aAt = Date.parse(a.finished_at ?? a.updated_at ?? a.created_at)
        const bAt = Date.parse(b.finished_at ?? b.updated_at ?? b.created_at)
        return (Number.isFinite(bAt) ? bAt : 0) - (Number.isFinite(aAt) ? aAt : 0)
      })
      .slice(0, 3)
  }, [library])

  const goalPreview = useMemo(() => {
    if (goals.status !== 'success') return []
    const finished = goals.data.goals.filter((goal) => goal.finished)
    const open = goals.data.goals.filter((goal) => !goal.finished)
    return [...finished, ...open].slice(0, 4)
  }, [goals])

  const notesPreview = useMemo(() => {
    if (notes.status !== 'success') return []
    return notes.data.slice(0, 2)
  }, [notes])

  const trainingPreview = useMemo(() => {
    if (sport.status !== 'success') return []
    return pickRecentSportSessions(sport.data.weekly, 2)
  }, [sport])

  const formatNoteDate = (value: string) => {
    const date = new Date(`${value}T12:00:00`)
    if (Number.isNaN(date.getTime())) return value
    return new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date)
  }

  const formatTrainingDate = (value: string) => formatCivilDate(value, {
    month: 'short',
    day: 'numeric',
  })

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <img
          className={styles.avatar}
          src="/profile.png"
          alt=""
          width={1254}
          height={1254}
          decoding="async"
        />
        <div className={styles.heroCopy}>
          <div className={styles.identity}>
            <Heading as="h1" size="2xl">
              {home.name}
            </Heading>
            <p className={styles.tagline}>{home.tagline}</p>
          </div>
          <p className={styles.bio}>{home.bio}</p>
          <div className="prose-link-rows">
            <p className="prose-link-row">
              <span className="prose-link-label">Online:</span>
              {home.online.map((item, index) => (
                <span key={item.label} className="prose-link-chunk">
                  {index > 0 ? <span className="prose-link-sep">·</span> : null}
                  <a href={item.href} className="prose-link">
                    {item.label}
                  </a>
                </span>
              ))}
            </p>
            <p className="prose-link-row">
              <span className="prose-link-label">Offline:</span>
              {home.offline.map((item, index) => (
                <span key={item.label} className="prose-link-chunk">
                  {index > 0 ? <span className="prose-link-sep">·</span> : null}
                  {'to' in item && item.to ? (
                    <Link to={item.to} className="prose-link">
                      {item.label}
                    </Link>
                  ) : (
                    <a href={item.href} className="prose-link">
                      {item.label}
                    </a>
                  )}
                </span>
              ))}
            </p>
          </div>
        </div>
      </section>

      <div className={styles.columns}>
        <div className={styles.primary}>
          <Panel
            title={fieldNotes.title}
            action={{ label: 'More to read', to: '/headspace' }}
          >
            <ul className="ui-index-list">
              {notes.status === 'loading' ? (
                <li>
                  <Skeleton height="4.5rem" />
                </li>
              ) : null}
              {notes.status === 'error' ? (
                <li>
                  <PanelNotice
                    state={notes}
                    unwired="Notes aren’t connected yet."
                    failed="Notes didn’t load — the Joplin proxy is unhappy."
                  />
                </li>
              ) : null}
              {notes.status === 'success'
                ? notesPreview.map((post) => (
                    <li key={post.slug}>
                      <Link to={`/headspace/${post.slug}`} className="ui-index-item">
                        <time className="ui-index-meta" dateTime={post.date}>
                          {formatNoteDate(post.date)}
                        </time>
                        <span className="ui-item-title">{post.title}</span>
                        <span className="ui-index-excerpt">{post.excerpt}</span>
                      </Link>
                    </li>
                  ))
                : null}
            </ul>
          </Panel>

          <Panel title="Reading" action={{ label: 'See library', to: '/library' }}>
            {library.status === 'loading' ? (
              <div className={styles.stackGap}>
                <Skeleton height="3.25rem" />
                <Skeleton height="3.25rem" />
                <Skeleton height="3.25rem" />
              </div>
            ) : null}
            {library.status === 'error' ? (
              <PanelNotice
                state={library}
                unwired="Library isn’t connected yet."
                failed="Library didn’t load right now."
              />
            ) : null}
            {library.status === 'success' ? (
              <ul className="ui-index-list ui-index-compact">
                {reading.map((book) => (
                  <li key={book.id}>
                    <Link to={`/library?item=${book.id}`} className="ui-index-item ui-index-row">
                      {book.cover_url ? (
                        <span className={styles.bookCover}>
                          <img src={book.cover_url} alt="" />
                        </span>
                      ) : (
                        <span className={styles.bookCover} aria-hidden="true" />
                      )}
                      <span className="ui-index-copy">
                        <span className="ui-item-title">{book.title}</span>
                        <span className="ui-index-excerpt">{book.author}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>

          <Panel title="Camera roll" hint={home.cameraRoll.note}>
            <CameraRoll />
          </Panel>
        </div>

        <div className={styles.secondary}>
          <Panel title={home.map.title} action={{ label: 'Full archive', to: '/map' }}>
            <Suspense fallback={<Skeleton height="10rem" radius="var(--radius-md)" />}>
              <WorldMapPreview />
            </Suspense>
          </Panel>

          <Panel
            title="Goals for this year"
            action={{
              label:
                goals.status === 'success'
                  ? `All ${goals.data.goals.length} goals`
                  : 'All goals',
              to: '/goals',
            }}
          >
            {goals.status === 'loading' ? (
              <div className={styles.stackGap}>
                <Skeleton height="1.4rem" />
                <Skeleton height="1.4rem" />
                <Skeleton height="1.4rem" />
              </div>
            ) : null}
            {goals.status === 'error' ? (
              <PanelNotice
                state={goals}
                unwired="Goals aren’t connected yet."
                failed="Goals didn’t load right now."
              />
            ) : null}
            {goals.status === 'success' ? (
              <GoalCardScroll>
                {goalPreview.map((goal) => (
                  <GoalCardLink key={goal.id} goal={goal} to="/goals" />
                ))}
              </GoalCardScroll>
            ) : null}
          </Panel>

          <Panel
            title={
              <>
                What I{' '}
                <span className={styles.feeling} ref={feelingRef}>
                  <button
                    type="button"
                    className={styles.feelingTrigger}
                    aria-haspopup="listbox"
                    aria-expanded={feelingOpen}
                    aria-controls={feelingListId}
                    onClick={() => setFeelingOpen((open) => !open)}
                    onKeyDown={onFeelingKeyDown}
                  >
                    <span className={styles.feelingWord}>{feeling}</span>
                    <ChevronDown
                      className={[
                        styles.feelingChevron,
                        feelingOpen ? styles.feelingChevronOpen : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-hidden="true"
                      strokeWidth={1.75}
                    />
                  </button>
                  {feelingOpen ? (
                    <ul
                      id={feelingListId}
                      className={styles.feelingMenu}
                      role="listbox"
                      aria-label="Choose feeling"
                    >
                      {feelingOptions.map((option) => (
                        <li key={option} role="presentation">
                          <button
                            type="button"
                            role="option"
                            aria-selected={feeling === option}
                            className={[
                              styles.feelingOption,
                              feeling === option ? styles.feelingOptionActive : '',
                            ]
                              .filter(Boolean)
                              .join(' ')}
                            onClick={() => {
                              setFeeling(option)
                              setFeelingOpen(false)
                            }}
                          >
                            {option}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </span>
              </>
            }
            action={{ label: feelingActions[feeling], to: feelingRoutes[feeling] }}
          >
            {feeling === 'hate' && hates.status === 'loading' ? (
              <div className={styles.spotlight}>
                <div className={styles.spotlightStage}>
                  <Skeleton height="1.6rem" width="70%" />
                  <Skeleton height="1rem" width="45%" style={{ marginTop: '0.5rem' }} />
                </div>
              </div>
            ) : null}
            {feeling === 'love' && gear.status === 'loading' ? (
              <div className={styles.spotlight}>
                <div className={styles.spotlightStage}>
                  <Skeleton height="1.6rem" width="70%" />
                  <Skeleton height="1rem" width="45%" style={{ marginTop: '0.5rem' }} />
                </div>
              </div>
            ) : null}
            {feeling === 'hate' && hates.status === 'error' ? (
              <PanelNotice
                state={hates}
                unwired="Hates aren’t connected yet."
                failed="Hates didn’t load right now."
              />
            ) : null}
            {feeling === 'love' && gear.status === 'error' ? (
              <PanelNotice
                state={gear}
                unwired="The collection isn’t connected yet."
                failed="The collection didn’t load right now."
              />
            ) : null}
            {((feeling === 'hate' && hates.status === 'success') ||
              (feeling === 'love' && gear.status === 'success')) &&
            spotlightCount === 0 ? (
              <p className={styles.muted}>The list is quiet for now.</p>
            ) : null}
            {((feeling === 'hate' && hates.status === 'success') ||
              (feeling === 'love' && gear.status === 'success')) &&
            spotlightCount > 0 ? (
              <div
                className={styles.spotlight}
                onMouseEnter={() => setSpotlightPaused(true)}
                onMouseLeave={() => setSpotlightPaused(false)}
                onFocusCapture={() => setSpotlightPaused(true)}
                onBlurCapture={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                    setSpotlightPaused(false)
                  }
                }}
              >
                <div
                  ref={spotlightStageRef}
                  className={[
                    styles.spotlightStage,
                    spotlightDraggable ? styles.spotlightStageDraggable : '',
                    spotlightDragging ? styles.spotlightStageDragging : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  style={
                    spotlightHeight
                      ? { height: spotlightHeight }
                      : undefined
                  }
                  aria-roledescription="carousel"
                  aria-label={feeling === 'hate' ? 'Things I hate' : 'Things I love'}
                  onPointerDown={spotlightDraggable ? onSpotlightPointerDown : undefined}
                  onPointerMove={spotlightDraggable ? onSpotlightPointerMove : undefined}
                  onPointerUp={spotlightDraggable ? endSpotlightPointer : undefined}
                  onPointerCancel={spotlightDraggable ? endSpotlightPointer : undefined}
                >
                  <div
                    className={[
                      styles.spotlightTrack,
                      spotlightDragging ? styles.spotlightTrackDragging : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    style={{
                      transform: `translate3d(${
                        -spotlightIndex * spotlightWidth + spotlightDragX
                      }px, 0, 0)`,
                    }}
                  >
                    {spotlightItems.map((item, itemIndex) => {
                      const media = item.imageUrl ? (
                        <div className={styles.spotlightMat}>
                          <img
                            className={styles.spotlightImage}
                            src={item.imageUrl}
                            alt=""
                            loading={itemIndex === 0 ? 'eager' : 'lazy'}
                            draggable={false}
                          />
                        </div>
                      ) : null
                      const label = item.label ? (
                        item.to ? (
                          <span className={styles.spotlightLabel}>{item.label}</span>
                        ) : (
                          <p className={styles.spotlightLabel}>{item.label}</p>
                        )
                      ) : null

                      return (
                        <div
                          key={item.id}
                          ref={(node) => {
                            spotlightSlideRefs.current[itemIndex] = node
                          }}
                          className={styles.spotlightSlide}
                          aria-hidden={itemIndex !== spotlightIndex}
                        >
                          {item.to ? (
                            <Link
                              to={item.to}
                              className={styles.spotlightItemLink}
                              tabIndex={itemIndex === spotlightIndex ? undefined : -1}
                            >
                              {media}
                              <span className={`ui-section-title ${styles.spotlightTitleLink}`}>
                                {item.title}
                              </span>
                              {label}
                            </Link>
                          ) : (
                            <>
                              {media}
                              <p className={`ui-section-title ${styles.spotlightTitle}`}>
                                {item.title}
                              </p>
                              {label}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {spotlightCount > 1 ? (
                  <div className={styles.spotlightDots} role="tablist" aria-label="Preview items">
                    {spotlightItems.map((item, itemIndex) => (
                      <button
                        key={item.id}
                        type="button"
                        role="tab"
                        aria-selected={itemIndex === spotlightIndex}
                        aria-label={`Show ${item.title}`}
                        className={[
                          styles.spotlightDot,
                          itemIndex === spotlightIndex ? styles.spotlightDotActive : '',
                        ]
                          .filter(Boolean)
                          .join(' ')}
                        onClick={() => goToSpotlight(itemIndex)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </Panel>

          <Panel
            title="This year in training"
            action={{ label: 'See the year', to: '/sport' }}
          >
            {sport.status === 'loading' ? (
              <div className={styles.stackGap}>
                <Skeleton height="3.25rem" />
                <Skeleton height="3.25rem" />
              </div>
            ) : null}
            {sport.status === 'error' ? (
              <PanelNotice
                state={sport}
                unwired="Training isn’t connected yet."
                failed="Training didn’t load right now."
              />
            ) : null}
            {sport.status === 'success' ? (
              <>
                {trainingPreview.length === 0 ? (
                  <p className={styles.muted}>Nothing logged this year yet.</p>
                ) : null}
                <ul className="ui-index-list ui-index-compact">
                  {trainingPreview.map((session, index) => {
                    const Icon = ACTIVITY_ICONS[session.kind]
                    return (
                      <li
                        key={session.id}
                        className={styles.trainingIn}
                        style={{ animationDelay: `${index * 70}ms` }}
                      >
                        <div className="ui-index-row">
                          <span className="ui-index-lead ui-index-lead-mark" aria-hidden="true">
                            <Icon className="ui-index-lead-icon" strokeWidth={1.75} />
                          </span>
                          <div className={styles.trainingBody}>
                            <span className="ui-item-title">{session.title}</span>
                            <p className={styles.trainingMeta}>
                              <span className={styles.trainingKind}>
                                {ACTIVITY_LABELS[session.kind]}
                              </span>
                              <time className={styles.trainingDate} dateTime={session.date}>
                                {formatTrainingDate(session.date)}
                              </time>
                            </p>
                          </div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
                {sport.data.ouraStatus.ok ? null : (
                  <p className={styles.trainingNotice}>
                    {sport.data.garminStatus.ok
                      ? 'Oura is down, so recovery tiles on Training are missing.'
                      : 'Oura is down, so only gym sessions are listed.'}
                  </p>
                )}
                {sport.data.garminStatus.ok ? null : sport.data.ouraStatus.ok ? (
                  <p className={styles.trainingNotice}>
                    Garmin is down, so maps and HR zones on Training are missing.
                  </p>
                ) : null}
              </>
            ) : null}
          </Panel>

          <Panel title="Notes" hint={home.notes.note}>
            <p className={styles.notes}>{home.notes.builtWith}</p>
            <p className={styles.notesMeta}>Updated {home.notes.updated}</p>
          </Panel>
        </div>
      </div>
    </div>
  )
}
