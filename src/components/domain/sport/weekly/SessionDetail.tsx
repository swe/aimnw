import { Trophy } from 'lucide-react'
import { RouteMap } from './RouteMap'
import { SoccerPitchHeatmap } from './SoccerPitchHeatmap'
import hr from '../hrZones.module.css'
import styles from './SessionDetail.module.css'
import {
  formatDurationMin,
  formatElevation,
  formatKm,
  formatPace,
  formatVolume,
} from '@/lib/sportFormat'
import { useGarminRouteMap, useGpxRouteMap } from '@/hooks/useRouteMap'
import type { SportHrZoneSeconds, SportSessionDetail, SportWeekSession } from '@/types'

type Props = {
  session: SportWeekSession
}

const ZONE_LABELS = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5'] as const

function ZonesBar({ zones }: { zones: SportHrZoneSeconds }) {
  const total = zones.reduce((sum, value) => sum + value, 0)
  if (total <= 0) return null
  const active = zones
    .map((sec, index) => ({ sec, index }))
    .filter((row) => row.sec > 0)
  return (
    <div className={styles.zones}>
      <div className={styles.zonesTrack} aria-hidden="true">
        <div className={styles.zonesFill}>
          {active.map(({ sec, index }) => (
            <span
              key={ZONE_LABELS[index]}
              className={`${styles.zoneSeg} ${hr.fill}`}
              data-zone={index + 1}
              style={{ width: `${(sec / total) * 100}%` }}
            />
          ))}
        </div>
      </div>
      <div className={hr.legend}>
        {active.map(({ sec, index }) => (
          <span key={ZONE_LABELS[index]} className={hr.item}>
            <span className={hr.swatch} data-zone={index + 1} />
            <strong className={hr.ink} data-zone={index + 1}>
              {ZONE_LABELS[index]}
            </strong>
            <span>{Math.round((sec / total) * 100)}%</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricLabel}>{label}</span>
      <strong className={styles.metricValue}>{value}</strong>
    </div>
  )
}

function garminIdOf(detail: SportSessionDetail): string | null {
  if (
    detail.kind === 'running' ||
    detail.kind === 'cycling' ||
    detail.kind === 'hiking' ||
    detail.kind === 'swimming' ||
    detail.kind === 'soccer'
  ) {
    return detail.garminActivityId ?? null
  }
  return null
}

function mapLabelOf(session: SportWeekSession): string | null {
  const { detail } = session
  if (detail.kind === 'running') return detail.mapLabel ?? session.title
  return session.title
}

function embeddedMapOf(detail: SportSessionDetail) {
  if (
    detail.kind === 'running' ||
    detail.kind === 'cycling' ||
    detail.kind === 'hiking' ||
    detail.kind === 'swimming' ||
    detail.kind === 'soccer'
  ) {
    return detail.map
  }
  return null
}

export function SessionDetail({ session }: Props) {
  const { detail } = session
  const garminId = garminIdOf(detail)
  const mapLabel = mapLabelOf(session)
  const garminMap = useGarminRouteMap(garminId, mapLabel)
  const gpxPath =
    detail.kind === 'running' && !detail.map && !garminMap ? detail.gpxPath : null
  const gpxMap = useGpxRouteMap(gpxPath, mapLabel)
  const routeMap = embeddedMapOf(detail) ?? garminMap ?? gpxMap

  return (
    <div className={styles.panel}>
      {detail.kind === 'gym' ? (
        <>
          <div className={styles.metrics}>
            <Metric label="Duration" value={formatDurationMin(session.durationMin)} />
            <Metric label="Volume" value={formatVolume(detail.volumeKg)} />
            <Metric label="Sets" value={String(detail.sets)} />
            <Metric label="Exercises" value={String(detail.exerciseCount)} />
            {detail.avgHr != null ? <Metric label="Avg HR" value={`${detail.avgHr} bpm`} /> : null}
            {detail.maxHr != null ? <Metric label="Max HR" value={`${detail.maxHr} bpm`} /> : null}
            {detail.calories != null ? (
              <Metric label="Calories" value={`${detail.calories} cal`} />
            ) : null}
          </div>
          {detail.prs > 0 ? (
            <p className={styles.prBanner}>
              <Trophy size={14} strokeWidth={2.2} aria-hidden="true" />
              <strong>
                {detail.prs} PR{detail.prs === 1 ? '' : 's'}
              </strong>
              <span>new session-volume highs this year</span>
            </p>
          ) : null}
          {detail.zones ? <ZonesBar zones={detail.zones} /> : null}
        </>
      ) : null}

      {detail.kind === 'running' ? (
        <>
          {routeMap ? <RouteMap map={routeMap} kind="running" /> : null}
          <div className={styles.metrics}>
            {detail.distanceKm > 0 ? (
              <Metric label="Distance" value={formatKm(detail.distanceKm)} />
            ) : null}
            <Metric label="Duration" value={formatDurationMin(session.durationMin)} />
            {detail.paceSecPerKm != null ? (
              <Metric label="Pace" value={formatPace(detail.paceSecPerKm)} />
            ) : null}
            {detail.elevationM != null ? (
              <Metric label="Elevation" value={formatElevation(detail.elevationM)} />
            ) : null}
            {detail.avgHr != null ? <Metric label="Avg HR" value={`${detail.avgHr} bpm`} /> : null}
            {detail.maxHr != null ? <Metric label="Max HR" value={`${detail.maxHr} bpm`} /> : null}
            {detail.calories != null ? (
              <Metric label="Calories" value={`${detail.calories} cal`} />
            ) : null}
          </div>
          {detail.zones ? <ZonesBar zones={detail.zones} /> : null}
        </>
      ) : null}

      {detail.kind === 'cycling' ? (
        <>
          {routeMap ? <RouteMap map={routeMap} kind="cycling" /> : null}
          <div className={styles.metrics}>
            {detail.distanceKm > 0 ? (
              <Metric label="Distance" value={formatKm(detail.distanceKm)} />
            ) : null}
            <Metric label="Duration" value={formatDurationMin(session.durationMin)} />
            {detail.speedKmH != null ? (
              <Metric label="Speed" value={`${detail.speedKmH} km/h`} />
            ) : null}
            {detail.elevationM != null ? (
              <Metric label="Elevation" value={formatElevation(detail.elevationM)} />
            ) : null}
            {detail.avgHr != null ? <Metric label="Avg HR" value={`${detail.avgHr} bpm`} /> : null}
            {detail.maxHr != null ? <Metric label="Max HR" value={`${detail.maxHr} bpm`} /> : null}
            {detail.calories != null ? (
              <Metric label="Calories" value={`${detail.calories} cal`} />
            ) : null}
          </div>
          {detail.zones ? <ZonesBar zones={detail.zones} /> : null}
        </>
      ) : null}

      {detail.kind === 'swimming' ? (
        <>
          {routeMap ? <RouteMap map={routeMap} kind="swimming" /> : null}
          <div className={styles.metrics}>
            <Metric label="Distance" value={formatKm(detail.distanceKm)} />
            <Metric label="Duration" value={formatDurationMin(session.durationMin)} />
            {detail.paceSecPer100m != null ? (
              <Metric label="Pace" value={formatPace(detail.paceSecPer100m, '/100m')} />
            ) : null}
            {detail.avgHr != null ? <Metric label="Avg HR" value={`${detail.avgHr} bpm`} /> : null}
            {detail.maxHr != null ? <Metric label="Max HR" value={`${detail.maxHr} bpm`} /> : null}
            {detail.calories != null ? (
              <Metric label="Calories" value={`${detail.calories} cal`} />
            ) : null}
          </div>
          {detail.zones ? <ZonesBar zones={detail.zones} /> : null}
        </>
      ) : null}

      {detail.kind === 'hiking' ? (
        <>
          {routeMap ? <RouteMap map={routeMap} kind="hiking" /> : null}
          <div className={styles.metrics}>
            {detail.distanceKm > 0 ? (
              <Metric label="Distance" value={formatKm(detail.distanceKm)} />
            ) : null}
            {detail.elevationM > 0 ? (
              <Metric label="Elevation" value={formatElevation(detail.elevationM)} />
            ) : null}
            <Metric label="Duration" value={formatDurationMin(session.durationMin)} />
            {detail.avgSpeedKmH != null ? (
              <Metric label="Avg speed" value={`${detail.avgSpeedKmH} km/h`} />
            ) : null}
            {detail.avgHr != null ? <Metric label="Avg HR" value={`${detail.avgHr} bpm`} /> : null}
            {detail.maxHr != null ? <Metric label="Max HR" value={`${detail.maxHr} bpm`} /> : null}
            {detail.calories != null ? (
              <Metric label="Calories" value={`${detail.calories} cal`} />
            ) : null}
          </div>
          {detail.zones ? <ZonesBar zones={detail.zones} /> : null}
        </>
      ) : null}

      {detail.kind === 'soccer' ? (
        <>
          {detail.pitchHeat ? (
            <SoccerPitchHeatmap heat={detail.pitchHeat} />
          ) : routeMap ? (
            <RouteMap map={routeMap} kind="soccer" />
          ) : null}
          <div className={styles.metrics}>
            {detail.calories != null ? (
              <Metric label="Calories" value={`${detail.calories} cal`} />
            ) : null}
            <Metric label="Duration" value={formatDurationMin(session.durationMin)} />
            {detail.avgHr != null ? <Metric label="Avg HR" value={`${detail.avgHr} bpm`} /> : null}
            {detail.maxHr != null ? <Metric label="Max HR" value={`${detail.maxHr} bpm`} /> : null}
          </div>
          {detail.zones ? <ZonesBar zones={detail.zones} /> : null}
        </>
      ) : null}

      {detail.kind === 'bouldering' ? (
        <>
          <div className={styles.metrics}>
            <Metric label="Duration" value={formatDurationMin(session.durationMin)} />
            {detail.maxGrade != null ? <Metric label="Max grade" value={detail.maxGrade} /> : null}
            {detail.sends != null ? <Metric label="Sends" value={String(detail.sends)} /> : null}
            {detail.avgHr != null ? <Metric label="Avg HR" value={`${detail.avgHr} bpm`} /> : null}
            {detail.calories != null ? (
              <Metric label="Calories" value={`${detail.calories} cal`} />
            ) : null}
          </div>
          {detail.zones ? <ZonesBar zones={detail.zones} /> : null}
          {detail.notes ? <p className={styles.notes}>{detail.notes}</p> : null}
        </>
      ) : null}

      {detail.kind === 'contrast' ? (
        <div className={styles.contrastSplit}>
          <div className={styles.contrastHalf} data-part="sauna">
            <span className={styles.contrastLabel}>Sauna</span>
            <strong className={styles.contrastValue}>{formatDurationMin(detail.saunaMin)}</strong>
            {detail.avgHr != null ? (
              <span className={styles.contrastMeta}>{detail.avgHr} bpm avg</span>
            ) : null}
          </div>
          <div className={styles.contrastHalf} data-part="plunge">
            <span className={styles.contrastLabel}>Cold plunge</span>
            <strong className={styles.contrastValue}>{formatDurationMin(detail.plungeMin)}</strong>
            {detail.notes ? <span className={styles.contrastMeta}>{detail.notes}</span> : null}
          </div>
        </div>
      ) : null}

      {detail.kind === 'sauna' ? (
        <div className={styles.metrics}>
          <Metric label="Duration" value={formatDurationMin(session.durationMin)} />
          {detail.avgHr != null ? <Metric label="Avg HR" value={`${detail.avgHr} bpm`} /> : null}
          {detail.maxHr != null ? <Metric label="Max HR" value={`${detail.maxHr} bpm`} /> : null}
        </div>
      ) : null}
    </div>
  )
}
