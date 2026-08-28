import { useId, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Play } from 'lucide-react'
import { EmptyState } from '@/components/domain/EmptyState'
import { FollowLink } from '@/components/domain/FollowLink'
import { PageHeader } from '@/components/layout/PageHeader'
import { VStack } from '@/components/ui'
import {
  EXPERIMENT_STATUS_ORDER,
  experimentDayProgress,
  experimentStatusLabel,
  experimentVerdictLabel,
  experiments,
  experimentsByStatus,
  experimentsPage,
  formatExperimentDate,
  formatExperimentRange,
  getExperiment,
  videoThumbnail,
  type Experiment,
  type ExperimentStatus,
  type ExperimentVideo,
} from '@/content/experiments'
import { principles } from '@/content/principles'
import styles from './Experiments.module.css'

const EMPTY_MESSAGE = 'No experiments yet — the next one starts when I do.'

function indexTitle(entry: Experiment) {
  return entry.shortTitle ?? entry.title
}

/** Status, length, and outcome in one quiet line — the index carries no chrome. */
function metaLine(entry: Experiment) {
  const progress = experimentDayProgress(entry)
  const bits: string[] = [experimentStatusLabel[entry.status]]

  if (entry.status === 'running' && progress) {
    bits.push(`Day ${progress.current} / ${progress.total}`)
  } else if (entry.durationDays) {
    bits.push(`${entry.durationDays} days`)
  }

  if (entry.verdict) bits.push(experimentVerdictLabel[entry.verdict])
  if (entry.videos?.length) bits.push('Video')

  return bits.join(' · ')
}

function StatusSection({ status, entries }: { status: ExperimentStatus; entries: Experiment[] }) {
  if (entries.length === 0) return null

  return (
    <section className={styles.section} aria-labelledby={`experiments-${status}`}>
      <h2 id={`experiments-${status}`} className="ui-kicker">
        {experimentStatusLabel[status]}
      </h2>
      <ul className="ui-index-list ui-index-compact">
        {entries.map((entry) => (
          <li key={entry.slug}>
            <Link to={`/experiments/${entry.slug}`} className="ui-index-item">
              <span className="ui-index-meta">{metaLine(entry)}</span>
              <span className="ui-item-title">{indexTitle(entry)}</span>
              <span className="ui-index-excerpt">{entry.hook}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ExperimentsPage() {
  const grouped = EXPERIMENT_STATUS_ORDER.map((status) => ({
    status,
    entries: experimentsByStatus(status),
  })).filter((group) => group.entries.length > 0)

  return (
    <VStack gap={6}>
      <PageHeader title={experimentsPage.title} description={experimentsPage.lede} />

      {experiments.length === 0 ? (
        <EmptyState message={EMPTY_MESSAGE} />
      ) : (
        <div className={styles.sections}>
          {grouped.map((group) => (
            <StatusSection key={group.status} status={group.status} entries={group.entries} />
          ))}
        </div>
      )}
    </VStack>
  )
}

function VideoFigure({ video }: { video: ExperimentVideo }) {
  const [playing, setPlaying] = useState(false)
  const titleId = useId()

  return (
    <figure className={styles.videoFigure}>
      <div className={styles.videoFrame}>
        {playing ? (
          <iframe
            className={styles.videoEmbed}
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            className={styles.videoPoster}
            onClick={() => setPlaying(true)}
            aria-labelledby={titleId}
          >
            <img className={styles.videoImage} src={videoThumbnail(video)} alt="" loading="lazy" />
            <span className={styles.playMark} aria-hidden="true">
              <Play size={16} strokeWidth={1.75} fill="currentColor" />
            </span>
          </button>
        )}
      </div>
      <figcaption className={styles.videoCaption}>
        <span id={titleId} className="ui-prose">
          {video.title}
        </span>
        <span className="ui-index-meta">
          YouTube
          {video.duration ? ` · ${video.duration}` : ''}
          {video.label ? ` · ${video.label}` : ''}
        </span>
      </figcaption>
    </figure>
  )
}

function relatedPrincipleLinks(slugs: string[] | undefined) {
  if (!slugs?.length) return []
  return slugs
    .map((slug) => principles.find((entry) => entry.slug === slug))
    .filter((entry): entry is (typeof principles)[number] => Boolean(entry))
}

export function ExperimentPage() {
  const { slug = '' } = useParams()
  const entry = getExperiment(slug)

  if (!entry) {
    return (
      <VStack gap={6}>
        <PageHeader title="Missing experiment" description="That page wandered off. Try the index" />
        <FollowLink to="/experiments">All experiments</FollowLink>
      </VStack>
    )
  }

  const progress = experimentDayProgress(entry)
  const related = relatedPrincipleLinks(entry.relatedPrinciples)

  return (
    <article className={styles.article}>
      <VStack gap={6}>
        <PageHeader
          title={entry.title}
          kicker={
            <time className="ui-kicker" dateTime={entry.startDate}>
              {formatExperimentRange(entry)}
            </time>
          }
          description={entry.hook}
        >
          <p className="ui-index-meta">{metaLine(entry)}</p>
          {entry.status === 'running' && progress ? (
            <div className={styles.progress}>
              <span className={styles.progressLabel}>
                {progress.current} / {progress.total} days
              </span>
              <span className={styles.progressTrack} aria-hidden="true">
                <span
                  className={styles.progressFill}
                  style={{ width: `${Math.min(100, Math.round((progress.current / progress.total) * 100))}%` }}
                />
              </span>
            </div>
          ) : null}
        </PageHeader>

        <section className={styles.block} aria-labelledby="experiment-question">
          <h2 id="experiment-question" className="ui-kicker">
            Question
          </h2>
          <p className="ui-prose">{entry.question}</p>
        </section>

        {entry.videos?.map((video) => (
          <section key={video.youtubeId} className={styles.block} aria-label="Video">
            <VideoFigure video={video} />
          </section>
        ))}

        <section className={styles.block} aria-labelledby="experiment-setup">
          <h2 id="experiment-setup" className="ui-kicker">
            Setup
          </h2>
          <p className="ui-prose">{entry.description}</p>
          {entry.tracked?.length ? (
            <ul className="ui-list">
              {entry.tracked.map((item) => (
                <li key={item} className="ui-list-item">
                  {item}
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        {entry.observations?.length ? (
          <section className={styles.block} aria-labelledby="experiment-observations">
            <h2 id="experiment-observations" className="ui-kicker">
              Observations
            </h2>
            <ol className={styles.timeline}>
              {entry.observations.map((note) => (
                <li key={`${note.day}-${note.date ?? ''}`} className={styles.timelineItem}>
                  <span className="ui-index-meta">
                    Day {note.day}
                    {note.date ? ` · ${formatExperimentDate(note.date, 'short')}` : ''}
                  </span>
                  <p className="ui-prose">{note.text}</p>
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        {entry.photos?.length ? (
          <section className={styles.block} aria-labelledby="experiment-photos">
            <h2 id="experiment-photos" className="ui-kicker">
              Photos
            </h2>
            <ul className={styles.photos}>
              {entry.photos.map((photo) => (
                <li key={photo.src}>
                  <figure className={styles.photoFigure}>
                    <img className={styles.photo} src={photo.src} alt={photo.alt} loading="lazy" />
                    {photo.caption ? (
                      <figcaption className="ui-index-meta">{photo.caption}</figcaption>
                    ) : null}
                  </figure>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {entry.metrics?.length ? (
          <section className={styles.block} aria-labelledby="experiment-metrics">
            <h2 id="experiment-metrics" className="ui-kicker">
              Metrics
            </h2>
            <dl className={styles.metrics}>
              {entry.metrics.map((metric) => (
                <div key={metric.label} className={styles.metric}>
                  <dt>{metric.label}</dt>
                  <dd>{metric.value}</dd>
                </div>
              ))}
            </dl>
          </section>
        ) : null}

        {entry.result ? (
          <section className={styles.block} aria-labelledby="experiment-result">
            <h2 id="experiment-result" className="ui-kicker">
              Result
            </h2>
            <p className="ui-prose">{entry.result}</p>
          </section>
        ) : null}

        {entry.verdict ? (
          <section className={styles.block} aria-labelledby="experiment-verdict">
            <h2 id="experiment-verdict" className="ui-kicker">
              Verdict
            </h2>
            <p className={styles.verdict}>{experimentVerdictLabel[entry.verdict]}</p>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className={styles.block} aria-labelledby="experiment-principles">
            <h2 id="experiment-principles" className="ui-kicker">
              Related principles
            </h2>
            <ul className="ui-list">
              {related.map((principle) => (
                <li key={principle.slug} className="ui-list-item">
                  <Link to={`/principles#${principle.slug}`} className="prose-link">
                    {principle.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </VStack>
    </article>
  )
}
