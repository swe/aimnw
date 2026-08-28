export type TrainingKind =
  | 'cycling'
  | 'running'
  | 'gym'
  | 'swimming'
  | 'sauna'
  | 'meditation'

export type TrainingSession = {
  title: string
  kind: TrainingKind
  date: string
}

export const home = {
  name: 'Iván Aleksandrov',
  tagline: 'Security engineer who still likes making things',
  bio: 'I work across cloud, crypto, and the messier edges of infrastructure — systems that stay quiet under pressure. Outside of work I run trails, read widely, and photograph the in-between, usually with a V60 somewhere nearby',
  map: {
    title: 'Where am I right now?',
  },
  online: [
    { label: 'GitHub', href: 'https://github.com/swe' },
    { label: 'LinkedIn', href: 'https://linkedin.com/in/iamalleksy' },
    { label: 'Email', href: 'mailto:ciao@alleksy.com' },
  ],
  offline: [
    {
      label: 'Résumé',
      href: 'https://i.alleksy.com/docs/work/resume_ivan-aleksandrov.pdf',
    },
    { label: 'Viewfinder', to: '/viewfinder' },
    { label: 'Strava', href: 'https://www.strava.com/athletes/10659571' },
  ],
  cameraRoll: {
    note: 'Real-time sync with my personal gallery — whatever I shot last shows up here',
  },
  lovesPreview: [
    {
      id: 'v60',
      title: 'Hario V60',
      label: 'Coffee',
      category: 'coffee',
      slug: 'hario-v60',
      imageUrl:
        'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'keyboard',
      title: 'HHKB Professional',
      label: 'Desk',
      category: 'desk',
      slug: 'hhkb-professional',
      imageUrl:
        'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'camera',
      title: 'Fujifilm X100V',
      label: 'Photo',
      category: 'photo',
      slug: 'fujifilm-x100v',
      imageUrl:
        'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'shoes',
      title: 'Nike Pegasus Trail',
      label: 'Running',
      category: 'running',
      slug: 'nike-pegasus-trail',
      imageUrl:
        'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'notebook',
      title: 'Leuchtturm1917',
      label: 'Notes',
      category: 'notes',
      slug: 'leuchtturm1917',
      imageUrl:
        'https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'headphones',
      title: 'Sony WH-1000XM5',
      label: 'Audio',
      category: 'audio',
      slug: 'sony-wh-1000xm5',
      imageUrl:
        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'watch',
      title: 'Seiko Prospex',
      label: 'Everyday',
      category: 'everyday',
      slug: 'seiko-prospex',
      imageUrl:
        'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'bike',
      title: 'Canyon Endurace',
      label: 'Cycling',
      category: 'cycling',
      slug: 'canyon-endurace',
      imageUrl:
        'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'lamp',
      title: 'Anglepoise Type 75',
      label: 'Desk',
      category: 'desk',
      slug: 'anglepoise-type-75',
      imageUrl:
        'https://images.unsplash.com/photo-1513506003901-1e6a229e2d15?auto=format&fit=crop&w=900&q=80',
    },
    {
      id: 'pen',
      title: 'Lamy 2000',
      label: 'Writing',
      category: 'writing',
      slug: 'lamy-2000',
      imageUrl:
        'https://images.unsplash.com/photo-1583485088034-697b5bc36b55?auto=format&fit=crop&w=900&q=80',
    },
  ],
  trainingPool: [
    {
      title: 'Coastal road loop through the early fog',
      kind: 'cycling',
      date: '2026-07-08',
    },
    {
      title: 'North shore trail',
      kind: 'running',
      date: '2026-07-07',
    },
    {
      title: 'Lower body strength — slow and heavy',
      kind: 'gym',
      date: '2026-07-06',
    },
    {
      title: 'Morning lanes',
      kind: 'swimming',
      date: '2026-07-05',
    },
    {
      title: 'Heat session',
      kind: 'sauna',
      date: '2026-07-05',
    },
    {
      title: 'Evening sit after a long week',
      kind: 'meditation',
      date: '2026-07-04',
    },
  ] satisfies TrainingSession[],
  notes: {
    builtWith:
      'To do groceries with this list only, start a complain about the Swiss flight I had few weeks ago. Elliptical curves and its intersection with real world. 4 different call recordings ',
    updated: 'Aug 2026',
    note: 'A blend of my latest thoughts in a one-liner — fetched from my self-hosted Joplin and summarized by a locally fine-tuned LLM running on Ollama',
  },
}

export function pickTrainingPreview(
  pool: readonly TrainingSession[],
  count = 2,
): TrainingSession[] {
  const selected = [...pool]
  for (let i = selected.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[selected[i], selected[j]] = [selected[j], selected[i]]
  }
  return selected.slice(0, count).sort((a, b) => b.date.localeCompare(a.date))
}

export function shufflePreview<T>(pool: readonly T[], count = pool.length): T[] {
  const selected = [...pool]
  for (let i = selected.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[selected[i], selected[j]] = [selected[j], selected[i]]
  }
  return selected.slice(0, count)
}
