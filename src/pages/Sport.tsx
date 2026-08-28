import { PageHeader } from '@/components/layout/PageHeader'
import { ApiEmptyState } from '@/components/domain/ApiEmptyState'
import { SportSkeleton } from '@/components/domain/PageSkeleton'
import { SportBody } from '@/components/domain/sport/SportBody'
import { SportHeatmap } from '@/components/domain/sport/SportHeatmap'
import { SportHrZones } from '@/components/domain/sport/SportHrZones'
import { SportLongRun } from '@/components/domain/sport/SportLongRun'
import { SportSignals } from '@/components/domain/sport/SportSignals'
import { SportTrends } from '@/components/domain/sport/SportTrends'
import { SportWeeklyProgress } from '@/components/domain/sport/SportWeeklyProgress'
import { VStack } from '@/components/ui'
import { getSportHub } from '@/api/sport'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import styles from './Sport.module.css'

const PAGE_DESCRIPTION =
  'Strength volume, cardio, GPS, heart-rate zones, recovery, sleep, and cardio age are all tracked in one place. Less about chasing perfect numbers, more about seeing whether the work is actually doing anything'

export function SportPage() {
  const state = useAsyncResource('sport', (signal) => getSportHub(signal))
  const year = state.status === 'success' ? state.data.year : new Date().getFullYear()
  const title = `${year} year in training`

  return (
    <VStack gap={6}>
      <PageHeader title={title} description={PAGE_DESCRIPTION} />

      {state.status === 'loading' ? <SportSkeleton /> : null}
      {state.status === 'error' ? (
        <ApiEmptyState error={state.error} notConfigured={state.notConfigured} />
      ) : null}

      {state.status === 'success' ? (
        <div className={styles.hub}>
          {state.data.ouraStatus.ok ? null : (
            <div className={styles.notice} role="status">
              <span className={styles.noticeTitle}>
                Oura is unavailable — recovery, sleep, and cardio-age tiles are missing below.
              </span>
              <span className={styles.noticeDetail}>{state.data.ouraStatus.message}</span>
            </div>
          )}
          {state.data.garminStatus.ok ? null : (
            <div className={styles.notice} role="status">
              <span className={styles.noticeTitle}>
                Garmin is unavailable — maps, HR zones, and measured distance are missing below.
              </span>
              <span className={styles.noticeDetail}>{state.data.garminStatus.message}</span>
            </div>
          )}
          <SportSignals tiles={state.data.kpis} />
          <SportHeatmap year={state.data.year} days={state.data.heatmap} />
          <SportTrends rows={state.data.trends} />
          <SportHrZones weeks={state.data.zoneWeeks} yearSummary={state.data.zoneYearSummary} />
          <SportLongRun weeks={state.data.longRuns} />
          <SportBody series={state.data.bodySeries} />
          <SportWeeklyProgress weeks={state.data.weekly} />
        </div>
      ) : null}
    </VStack>
  )
}
