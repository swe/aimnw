import { ChevronDown, Trophy } from 'lucide-react'
import { SessionDetail } from './SessionDetail'
import { ACTIVITY_ICONS, ACTIVITY_LABELS } from './activityMeta'
import styles from './WeekSessionRow.module.css'
import {
  formatDurationMin,
  formatHrZone,
  formatKm,
  formatVolume,
} from '@/lib/sportFormat'
import { formatCivilDate } from '@/api/sport/time'
import type { SportWeekSession } from '@/types'

type Props = {
  session: SportWeekSession
  open: boolean
  onToggle: () => void
}

function rowSubtitle(session: SportWeekSession) {
  const day = formatCivilDate(session.date, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
  const kindLabel = ACTIVITY_LABELS[session.kind]
  const zone = formatHrZone(session.hrZone)
  return { day, kindLabel, zone }
}

function primaryMetrics(session: SportWeekSession) {
  const { detail } = session
  if (detail.kind === 'gym') {
    return {
      primary: formatVolume(detail.volumeKg),
      secondary: formatDurationMin(session.durationMin),
    }
  }
  if (detail.kind === 'contrast') {
    return {
      primary: `${formatDurationMin(detail.saunaMin)} + ${formatDurationMin(detail.plungeMin)}`,
      secondary: null as string | null,
    }
  }
  if (detail.kind === 'bouldering') {
    return {
      primary: detail.maxGrade ?? formatDurationMin(session.durationMin),
      secondary:
        detail.sends != null
          ? `${detail.sends} sends`
          : detail.maxGrade
            ? formatDurationMin(session.durationMin)
            : null,
    }
  }
  if (detail.kind === 'hiking') {
    const hasDistance = detail.distanceKm > 0
    return {
      primary: hasDistance
        ? formatKm(detail.distanceKm)
        : formatDurationMin(session.durationMin),
      secondary: hasDistance
        ? detail.avgSpeedKmH != null
          ? `${detail.avgSpeedKmH} km/h`
          : formatDurationMin(session.durationMin)
        : detail.calories != null
          ? `${detail.calories} cal`
          : detail.avgHr != null
            ? `${detail.avgHr} bpm`
            : null,
    }
  }
  if (detail.kind === 'soccer') {
    return {
      primary: detail.calories != null ? `${detail.calories} cal` : formatDurationMin(session.durationMin),
      secondary:
        detail.calories != null
          ? formatDurationMin(session.durationMin)
          : detail.avgHr != null
            ? `${detail.avgHr} bpm`
            : null,
    }
  }
  if (
    detail.kind === 'running' ||
    detail.kind === 'cycling' ||
    detail.kind === 'swimming'
  ) {
    const hasDistance = detail.distanceKm > 0
    return {
      primary: hasDistance
        ? formatKm(detail.distanceKm)
        : formatDurationMin(session.durationMin),
      secondary: hasDistance
        ? formatDurationMin(session.durationMin)
        : detail.calories != null
          ? `${detail.calories} cal`
          : detail.avgHr != null
            ? `${detail.avgHr} bpm`
            : null,
    }
  }
  return {
    primary: formatDurationMin(session.durationMin),
    secondary: null as string | null,
  }
}

export function WeekSessionRow({ session, open, onToggle }: Props) {
  const Icon = ACTIVITY_ICONS[session.kind]
  const { day, kindLabel, zone } = rowSubtitle(session)
  const metrics = primaryMetrics(session)
  const expandable = session.kind !== 'cold_plunge'

  const body = (
    <>
      <span className={styles.icon} data-kind={session.kind} aria-hidden="true">
        <Icon size={16} strokeWidth={1.75} />
      </span>
      <span className={styles.body}>
        <strong className={styles.title}>
          <span className={styles.titleText}>{session.title}</span>
          {session.detail.kind === 'gym' && session.detail.prs > 0 ? (
            <span
              className={styles.prMark}
              aria-label={`${session.detail.prs} personal record${session.detail.prs === 1 ? '' : 's'}`}
            >
              <Trophy size={12} strokeWidth={2.4} aria-hidden="true" />
              {session.detail.prs > 1 ? <span>{session.detail.prs}</span> : null}
            </span>
          ) : null}
        </strong>
        <span className={styles.meta}>
          {day}
          <span className={styles.dot} aria-hidden="true">
            ·
          </span>
          {kindLabel}
          {zone ? (
            <>
              <span className={styles.dot} aria-hidden="true">
                ·
              </span>
              <span className={styles.zone} data-zone={session.hrZone}>
                {zone}
              </span>
            </>
          ) : null}
        </span>
      </span>
      <span className={styles.metrics}>
        <strong>{metrics.primary}</strong>
        {metrics.secondary ? <span>{metrics.secondary}</span> : null}
      </span>
      {expandable ? (
        <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
      ) : (
        <span className={styles.chevronSpacer} aria-hidden="true" />
      )}
    </>
  )

  return (
    <li
      className={[styles.item, open && expandable ? styles.open : '', !expandable ? styles.static : '']
        .filter(Boolean)
        .join(' ')}
    >
      {expandable ? (
        <button type="button" className={styles.toggle} aria-expanded={open} onClick={onToggle}>
          {body}
        </button>
      ) : (
        <div className={styles.toggle}>{body}</div>
      )}
      {expandable && open ? <SessionDetail session={session} /> : null}
    </li>
  )
}
