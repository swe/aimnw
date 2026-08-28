export type ExperimentStatus = 'planned' | 'running' | 'completed' | 'abandoned'

export type ExperimentVerdict = 'keep' | 'modify' | 'abandon'

export type ExperimentObservation = {
  day: number
  date?: string
  text: string
}

export type ExperimentMetric = {
  label: string
  value: string
}

export type ExperimentPhoto = {
  src: string
  alt: string
  caption?: string
}

/** A YouTube story tied to the experiment — can be added before, during, or after. */
export type ExperimentVideo = {
  youtubeId: string
  title: string
  duration?: string
  /** Optional custom still; falls back to YouTube hqdefault. */
  thumbnail?: string
  /** Short label under the player, e.g. "Day 1" or "The wrap-up". */
  label?: string
}

export type Experiment = {
  slug: string
  title: string
  shortTitle?: string
  /** One-line hook for cards — the human reason to open it. */
  hook: string
  question: string
  status: ExperimentStatus
  startDate: string
  endDate?: string
  durationDays?: number
  description: string
  /** Optional still, kept for future use — no layout depends on it. */
  cover?: string
  coverAlt?: string
  tracked?: string[]
  observations?: ExperimentObservation[]
  result?: string
  verdict?: ExperimentVerdict
  metrics?: ExperimentMetric[]
  photos?: ExperimentPhoto[]
  videos?: ExperimentVideo[]
  relatedPrinciples?: string[]
}

export const experimentsPage = {
  title: 'Experiments',
  lede:
    'I run small experiments on my own life — sleep, attention, training, stuff I own — then write down what actually happened. The site is the archive. YouTube is the story',
}

export const EXPERIMENT_STATUS_ORDER: ExperimentStatus[] = [
  'running',
  'planned',
  'completed',
  'abandoned',
]

export const experimentStatusLabel: Record<ExperimentStatus, string> = {
  planned: 'Planned',
  running: 'Running',
  completed: 'Completed',
  abandoned: 'Abandoned',
}

export const experimentVerdictLabel: Record<ExperimentVerdict, string> = {
  keep: 'Keep',
  modify: 'Modify',
  abandon: 'Abandon',
}

function ytThumb(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
}

/** Mock archive — replace the copy and the placeholder YouTube IDs with real ones. */
export const experiments: Experiment[] = [
  {
    slug: 'waking-up-at-0520',
    title: 'Wake up at 5:20 for 21 days',
    shortTitle: 'Wake up at 5:20',
    hook: 'Same alarm. Every day. Including weekends',
    question:
      'Does waking up at the same early time make training, meals, and the rest of the day easier to hold?',
    status: 'running',
    startDate: '2026-08-03',
    durationDays: 21,
    description:
      'Alarm at 5:20. No snooze. Lights on, water, out of bed. I want to know if a fixed early start makes the day feel less like a negotiation',
    tracked: [
      'bedtime',
      'wake-up time',
      'sleep duration',
      'readiness',
      'training completion',
      'subjective energy',
    ],
    observations: [
      {
        day: 3,
        date: '2026-08-05',
        text: 'Still dragging before coffee. The early window is quiet — I am mostly staring into it, not using it yet',
      },
      {
        day: 11,
        date: '2026-08-13',
        text: 'Weekdays click. Weekends hurt. One late night and the whole morning tax shows up immediately',
      },
      {
        day: 14,
        date: '2026-08-16',
        text: 'Training starts before the city wakes up. Meals get steadier when the day begins on rails',
      },
    ],
    videos: [
      {
        youtubeId: 'jNQXAC9IVRw',
        title: 'I set my alarm to 5:20 for 21 days',
        duration: '0:19',
        label: 'Starting the experiment',
      },
    ],
    relatedPrinciples: [
      'treat-the-body-as-finite',
      'discipline-needs-humility',
      'simplicity-creates-freedom',
    ],
  },
  {
    slug: 'run-without-headphones',
    title: 'Run without headphones for 30 days',
    shortTitle: 'Run without headphones',
    hook: 'No podcasts. No music. Just the road',
    question:
      'What changes in pace, attention, and enjoyment when I stop filling every run with audio?',
    status: 'running',
    startDate: '2026-08-14',
    durationDays: 30,
    description:
      'Outdoor runs only for this one — no podcasts, music, or calls. Treadmill days can keep audio. I want to hear the run again',
    tracked: ['perceived effort', 'route choice', 'urge to check the phone', 'post-run notes'],
    observations: [
      {
        day: 2,
        date: '2026-08-15',
        text: 'The first quiet kilometer feels longer. I notice street detail — and how often my hand reaches for a pocket that has nothing useful in it',
      },
      {
        day: 9,
        date: '2026-08-22',
        text: 'Longer runs are less entertaining and somehow less fragmented. I finish more present and a little bored. Both feel useful',
      },
    ],
    videos: [
      {
        youtubeId: 'LXb3EKWsInQ',
        title: 'Running without headphones for a month',
        duration: '4:12',
        label: 'Mid-experiment',
      },
    ],
    relatedPrinciples: ['run-to-clear-the-noise', 'solitude-is-productive'],
  },
  {
    slug: 'no-phone-first-hour',
    title: 'No phone during the first hour of the day',
    shortTitle: 'No phone first hour',
    hook: 'Sixty quiet minutes before the feed',
    question:
      'If I protect the first hour from feeds and messages, does the rest of the morning stay clearer?',
    status: 'completed',
    startDate: '2026-07-01',
    endDate: '2026-07-30',
    durationDays: 30,
    description:
      'Phone stays in another room for the first sixty minutes after waking. Alarm lives on a cheap clock. Laptop is fine for writing — not for browsing',
    tracked: ['first useful action', 'urge intensity (1–5)', 'morning training or writing started'],
    observations: [
      {
        day: 1,
        text: 'The urge is physical — hand already moving before I decide. Putting the phone in another room is the actual intervention',
      },
      {
        day: 18,
        text: 'Coffee and a short walk replace the scroll. By day 18 the first hour feels like mine again',
      },
    ],
    result:
      'The first hour got quieter and more deliberate. I still checked messages later — just not while the day was being shaped. Keeping it on weekdays; weekends can stay looser',
    verdict: 'keep',
    metrics: [
      { label: 'Days held', value: '28 / 30' },
      { label: 'Urge week 1 → 4', value: '4.2 → 2.1' },
    ],
    videos: [
      {
        youtubeId: 'M7lc1UVf-VE',
        title: 'I tried no phone for the first hour of the day',
        duration: '12:43',
        label: 'The wrap-up',
      },
    ],
    relatedPrinciples: [
      'protect-the-information-diet',
      'keep-something-private',
      'solitude-is-productive',
    ],
  },
  {
    slug: 'cold-showers',
    title: 'Cold showers for 14 days',
    shortTitle: 'Cold showers',
    hook: 'Sixty cold seconds. Then I quit early',
    question:
      'Does a cold finish to every shower improve morning alertness enough to justify the friction?',
    status: 'abandoned',
    startDate: '2026-06-10',
    endDate: '2026-06-17',
    durationDays: 14,
    description:
      'End every shower with at least sixty seconds of cold water. No exceptions for travel days. Abandoned is allowed — sometimes the answer arrives early',
    tracked: ['completion', 'alertness 30 min later', 'dread beforehand'],
    observations: [
      {
        day: 4,
        text: 'Alertness bump is real and short. The dread beforehand lasts longer than the benefit',
      },
    ],
    result:
      'Stopped on day 8. The experiment answered the question early: the cost outweighed the gain for me. Ending early was the conclusion, not a failed streak',
    verdict: 'abandon',
    videos: [
      {
        youtubeId: 'aqz-KE-bpKQ',
        title: 'Why I stopped the cold shower experiment',
        duration: '8:02',
        label: 'What I learned by quitting',
      },
    ],
    relatedPrinciples: ['treat-the-body-as-finite', 'know-what-is-already-enough'],
  },
  {
    slug: 'fewer-possessions-30-days',
    title: 'Live with a tighter closet for 30 days',
    shortTitle: 'Fewer possessions',
    hook: 'Pack it away. See what I actually miss',
    question:
      'If I box everything I have not worn in a month, do mornings get simpler — or just more annoying?',
    status: 'planned',
    startDate: '2026-09-01',
    durationDays: 30,
    description:
      'Non-essentials leave the closet for thirty days. Keep a short rotation I already like. Note every time I miss something boxed away',
    relatedPrinciples: ['own-less', 'buy-things-for-what-they-are'],
  },
]

export function getExperiment(slug: string): Experiment | undefined {
  return experiments.find((entry) => entry.slug === slug)
}

export function experimentsByStatus(
  status: ExperimentStatus,
  entries: readonly Experiment[] = experiments,
): Experiment[] {
  return entries.filter((entry) => entry.status === status)
}

export function experimentDayProgress(
  experiment: Experiment,
  today = new Date(),
): { current: number; total: number } | null {
  const total = experiment.durationDays
  if (!total || total <= 0) return null

  const start = parseLocalDate(experiment.startDate)
  if (!start) return null

  const endCap = experiment.endDate ? parseLocalDate(experiment.endDate) : null
  const reference = endCap && endCap < startOfLocalDay(today) ? endCap : startOfLocalDay(today)
  const diffMs = reference.getTime() - start.getTime()
  const day = Math.floor(diffMs / 86_400_000) + 1

  if (experiment.status === 'planned' && day < 1) {
    return { current: 0, total }
  }

  return {
    current: Math.min(Math.max(day, 0), total),
    total,
  }
}

export function formatExperimentDate(value: string, style: 'short' | 'long' = 'long') {
  const date = parseLocalDate(value)
  if (!date) return value
  return new Intl.DateTimeFormat(
    'en-US',
    style === 'short'
      ? { month: 'short', day: 'numeric', year: 'numeric' }
      : { month: 'long', day: 'numeric', year: 'numeric' },
  ).format(date)
}

export function formatExperimentRange(experiment: Experiment) {
  const start = parseLocalDate(experiment.startDate)
  const end = experiment.endDate ? parseLocalDate(experiment.endDate) : null
  if (start && end) {
    const sameYear = start.getFullYear() === end.getFullYear()
    const startLabel = new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      ...(sameYear ? {} : { year: 'numeric' }),
    }).format(start)
    const endLabel = formatExperimentDate(experiment.endDate!)
    return `${startLabel} — ${endLabel}`
  }
  const startLabel = formatExperimentDate(experiment.startDate)
  if (experiment.durationDays) {
    return `${startLabel} · ${experiment.durationDays} days`
  }
  return startLabel
}

export function videoThumbnail(video: ExperimentVideo) {
  return video.thumbnail ?? ytThumb(video.youtubeId)
}

function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
