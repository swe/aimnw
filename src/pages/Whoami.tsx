import { useCallback, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Volume2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { getGoals } from '@/api/goals'
import { getPlaces } from '@/api/map'
import { getQuests, isCountriesQuest } from '@/api/quests'
import { routePrefetchProps } from '@/api/preload'
import { FollowLink } from '@/components/domain/FollowLink'
import { GoalCardLink, GoalCardScroll } from '@/components/domain/GoalCard'
import { RichText } from '@/components/domain/RichText'
import { PageHeader } from '@/components/layout/PageHeader'
import { ChipLink, IconButton, Skeleton, VStack } from '@/components/ui'
import { whoami, type WhoamiLink } from '@/content/whoami'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useDecimalAge } from '@/hooks/useDecimalAge'
import { UN_COUNTRY_TOTAL, countVisitedCountries } from '@/lib/mapCountries'
import type { QuestItem } from '@/types'
import styles from './Whoami.module.css'

type SideQuestView = {
  id: string
  label: string
  done: boolean
  doneAt?: string
  image?: string
  progress?: { current: number; total: number; to: string }
}

function formatQuestDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function toSideQuestView(quest: QuestItem, visitedCountries: number | null): SideQuestView {
  const done = Boolean(quest.achievedAt)
  const base: SideQuestView = {
    id: quest.id,
    label: quest.title,
    done,
    doneAt: quest.achievedAt ?? undefined,
    image: quest.image ?? undefined,
  }

  if (!isCountriesQuest(quest.title) || visitedCountries === null) return base

  return {
    ...base,
    done: done || visitedCountries >= UN_COUNTRY_TOTAL,
    progress: {
      current: Math.min(visitedCountries, UN_COUNTRY_TOTAL),
      total: UN_COUNTRY_TOTAL,
      to: '/map',
    },
  }
}

function SiteLink({ link, className }: { link: WhoamiLink; className?: string }) {
  if (link.to) {
    return (
      <Link to={link.to} className={className} {...routePrefetchProps(link.to)}>
        {link.label}
      </Link>
    )
  }
  return (
    <a
      href={link.href}
      className={className}
      target={link.href?.startsWith('mailto:') ? undefined : '_blank'}
      rel={link.href?.startsWith('mailto:') ? undefined : 'noreferrer'}
    >
      {link.label}
    </a>
  )
}

function PronounceButton() {
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const play = useCallback(() => {
    const src = whoami.pronunciation.audioSrc
    if (!audioRef.current) {
      audioRef.current = new Audio(src)
    }
    const audio = audioRef.current
    audio.currentTime = 0
    audio.play().catch(() => {
      if (!('speechSynthesis' in window)) return
      window.speechSynthesis.cancel()
      const msg = new SpeechSynthesisUtterance(whoami.pronunciation.speakText)
      msg.lang = 'en-CA'
      msg.rate = 0.95
      window.speechSynthesis.speak(msg)
    })
  }, [])

  return (
    <IconButton
      variant="bordered"
      className={styles.pronounce}
      onClick={play}
      aria-label="Play name pronunciation"
    >
      <Volume2 size={14} strokeWidth={1.75} aria-hidden="true" />
    </IconButton>
  )
}

function LiveAge() {
  const age = useDecimalAge(whoami.birthIso, 9)
  return <span aria-live="off">{age}</span>
}

export function WhoamiPage() {
  const goals = useAsyncResource('goals', (signal) => getGoals(signal))
  const quests = useAsyncResource('quests', (signal) => getQuests(signal))
  const places = useAsyncResource('map', (signal) => getPlaces(signal))
  const [toast, setToast] = useState(false)
  const toastTimer = useRef<number | null>(null)

  const visitedCountries = useMemo(() => {
    if (places.status !== 'success') return null
    return countVisitedCountries(places.data.map((place) => place.country))
  }, [places])

  const sideQuests = useMemo(() => {
    if (quests.status !== 'success') return [] as SideQuestView[]
    return quests.data.sideQuests.map((quest) => toSideQuestView(quest, visitedCountries))
  }, [quests, visitedCountries])

  const teaseSideQuest = (quest: SideQuestView, event: MouseEvent) => {
    if ((event.target as HTMLElement).closest('a')) return
    if (quest.done) return
    setToast(true)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(false), 2400)
  }

  const goalCards =
    goals.status === 'success'
      ? [...goals.data.goals]
          .sort((a, b) => Number(a.finished) - Number(b.finished))
          .slice(0, 5)
      : []

  return (
    <VStack gap={6}>
      <PageHeader title={whoami.title}>
        <div className="prose-link-rows">
          {whoami.linkRows.map((row) => (
            <p key={row.label} className="prose-link-row">
              <span className="prose-link-label">{row.label}:</span>
              {row.links
                .filter((link) => !link.hidden)
                .map((link, index) => (
                <span key={link.label} className="prose-link-chunk">
                  {index > 0 ? <span className="prose-link-sep">·</span> : null}
                  <SiteLink link={link} className="prose-link" />
                </span>
              ))}
            </p>
          ))}
        </div>
      </PageHeader>

      <section className={styles.section}>
        <h2 className="ui-section-title">Dry facts</h2>
        <div className={styles.stack}>
          {whoami.dryFacts.map((parts, i) => (
            <RichText
              key={i}
              parts={parts}
              className="ui-prose"
              linkClassName="prose-link"
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="ui-section-title">But also</h2>
        <div className={styles.stack}>
          {whoami.butAlso.map((parts, i) => (
            <RichText
              key={i}
              parts={parts}
              className="ui-prose"
              linkClassName="prose-link"
            />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="ui-section-title">Side quests I've accepted</h2>
        {quests.status === 'loading' ? (
          <div className={styles.quests}>
            <Skeleton width="16rem" height="0.9rem" radius="var(--radius-sm)" />
            <Skeleton width="14rem" height="0.9rem" radius="var(--radius-sm)" />
            <Skeleton width="18rem" height="0.9rem" radius="var(--radius-sm)" />
          </div>
        ) : null}
        {quests.status === 'error' ? (
          <p className={styles.note}>Side quests aren’t connected yet.</p>
        ) : null}
        {quests.status === 'success' && sideQuests.length === 0 ? (
          <p className={styles.note}>No side quests listed yet.</p>
        ) : null}
        {quests.status === 'success' && sideQuests.length > 0 ? (
          <ul className={styles.quests} aria-label="Side quests">
            {sideQuests.map((quest) => (
                <li
                  key={quest.id}
                  className={[styles.quest, quest.done ? styles.questDone : '']
                    .filter(Boolean)
                    .join(' ')}
                  onClick={(event) => teaseSideQuest(quest, event)}
                >
                  <input
                    className="ui-checkbox"
                    type="checkbox"
                    checked={quest.done}
                    disabled
                    tabIndex={-1}
                    aria-hidden="true"
                    onChange={() => {}}
                  />
                  <span className={styles.questMain}>
                    <span className={styles.questLabel}>{quest.label}</span>
                    {quest.progress ? (
                      <ChipLink
                        to={quest.progress.to}
                        active
                        className={styles.questBadge}
                        aria-label={`${quest.progress.current} of ${quest.progress.total} countries visited`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {quest.progress.current}/{quest.progress.total}
                      </ChipLink>
                    ) : null}
                  </span>
                  {quest.doneAt && !quest.progress ? (
                    <time className={styles.questAside} dateTime={quest.doneAt}>
                      {formatQuestDate(quest.doneAt)}
                    </time>
                  ) : null}
                </li>
              ))}
          </ul>
        ) : null}
      </section>

      <section className={styles.section} aria-labelledby="whoami-goals-heading">
        <div className={styles.sectionHead}>
          <h2 id="whoami-goals-heading" className="ui-section-title">
            Goals for this year
          </h2>
          <FollowLink to="/goals">All goals</FollowLink>
        </div>
        <p className={styles.note}>{whoami.goalsNote}</p>
        {goals.status === 'loading' ? (
          <GoalCardScroll>
            <Skeleton width="8.75rem" height="5.85rem" radius="var(--radius-md)" />
            <Skeleton width="8.75rem" height="5.85rem" radius="var(--radius-md)" />
            <Skeleton width="8.75rem" height="5.85rem" radius="var(--radius-md)" />
          </GoalCardScroll>
        ) : null}
        {goals.status === 'error' ? (
          <p className={styles.note}>Goals aren’t connected yet.</p>
        ) : null}
        {goals.status === 'success' && goalCards.length === 0 ? (
          <p className={styles.note}>No goals listed yet.</p>
        ) : null}
        {goals.status === 'success' && goalCards.length > 0 ? (
          <GoalCardScroll>
            {goalCards.map((goal) => (
              <GoalCardLink key={goal.id} goal={goal} to="/goals" />
            ))}
          </GoalCardScroll>
        ) : null}
      </section>

      <section className={styles.section}>
        <h2 className="ui-section-title">Things People Asked Me At Least Once</h2>
        <div className={styles.faq}>
          {whoami.faq.map((item) => (
            <div key={item.question} className={styles.qa}>
              <span className={styles.question}>{item.question}</span>
              <div className={styles.answer}>
                {item.kind === 'named' ? (
                  <>
                    {whoami.preferredName.display}, or{' '}
                    <code className={styles.code}>{whoami.preferredName.username}</code>{' '}
                    (only as a username, never capitalized)
                  </>
                ) : null}
                {item.kind === 'pronunciation' ? (
                  <>
                    <em>{whoami.pronunciation.phonetic}</em>
                    <PronounceButton />
                  </>
                ) : null}
                {item.kind === 'age' ? (
                  <>
                    <LiveAge /> years old
                  </>
                ) : null}
                {item.kind === 'text' ? item.text : null}
              </div>
            </div>
          ))}
        </div>
      </section>

      <div
        className={[styles.toast, toast ? styles.toastVisible : ''].filter(Boolean).join(' ')}
        role="status"
        aria-live="polite"
      >
        Nice try, hero. Only Iván has admin rights for these side quests
      </div>
    </VStack>
  )
}
