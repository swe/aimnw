export const PRINCIPLE_CATEGORIES = [
  'Life',
  'People',
  'Work',
  'Freedom',
  'Money',
  'Health',
  'Objects',
  'Travel',
  'Learning',
  'Attention',
  'Nature',
] as const

export type PrincipleCategory = (typeof PRINCIPLE_CATEGORIES)[number]

export type Principle = {
  slug: string
  title: string
  /** The principle itself — the most prominent line. */
  statement: string
  /** Optional context; one or two short paragraphs. */
  explanation?: string | string[]
  category?: PrincipleCategory
  /** Year the principle was adopted. */
  since?: number
}

export const principlesPage = {
  title: 'Principles',
  lede: [
    'A small collection of ideas I currently try to live by. Specific enough to reveal how I think, practical enough to be useful beyond this page. Not rules in any absolute sense — just principles that help me make decisions, set boundaries, and keep myself somewhat consistent'
  ],
}

export const principles: Principle[] = [
  {
    slug: 'protect-the-spark-of-madness',
    title: 'Protect the spark of madness',
    statement:
      'There should always be something in life that is slightly irrational, unnecessary, or difficult to explain. Not everything valuable needs to survive a cost-benefit analysis',
    category: 'Life',
    since: 2024,
  },
  {
    slug: 'ideas-need-action',
    title: 'Ideas need action',
    statement:
      'Words and ideas are cheap until somebody is willing to build, change, leave, refuse, or risk something because of them. Thinking matters, but reality only notices what eventually becomes action',
    category: 'Work',
    since: 2025,
  },
  {
    slug: 'regret-is-part-of-the-deal',
    title: 'Regret is part of the deal',
    statement:
      'A large percentage of decisions will eventually look stupid from the perspective of the person I become later. That is not evidence that the decisions should never have been made',
    category: 'Life',
    since: 2024,
  },
  {
    slug: 'contradiction-is-normal',
    title: 'Contradiction is normal',
    statement:
      'I write differently from how I speak, speak differently from how I think, and probably think differently from how I believe I should think. I no longer expect a perfectly consistent version of myself to emerge',
    category: 'Life',
    since: 2025,
  },
  {
    slug: 'stand-in-the-rain',
    title: 'Stand in the rain',
    statement:
      'Some periods cannot be optimized away. There are moments when the only useful thing to do is endure them without turning temporary pain into a permanent conclusion',
    category: 'Life',
    since: 2024,
  },
  {
    slug: 'details-reveal-character',
    title: 'Details reveal character',
    statement:
      'I pay attention to small things: what someone orders for breakfast, how they treat a waiter, what they do when nobody important is watching. Grand declarations are easy to manufacture. Ordinary behaviour is much harder to fake consistently',
    category: 'People',
    since: 2026,
  },
  {
    slug: 'doubt-after-execution',
    title: 'Doubt after execution',
    statement:
      'Once I have enough information to make a decision, I prefer movement over endless reconsideration. Doubt is useful before commitment and during review; in the middle of execution it can become expensive noise',
    category: 'Work',
    since: 2025,
  },
  {
    slug: 'freedom-includes-uncomfortable-speech',
    title: 'Freedom includes uncomfortable speech',
    statement:
      'Freedom matters most when someone says something other people would rather not hear. Protecting agreeable speech is easy. Discomfort alone is a poor justification for silence',
    category: 'Freedom',
    since: 2024,
  },
  {
    slug: 'own-money-never-worship-it',
    title: 'Own money, never worship it',
    statement:
      'Money is useful because it buys independence, time, options, privacy, and occasionally beautiful things. It becomes dangerous when it stops being a tool and becomes a measure of human worth',
    category: 'Money',
    since: 2025,
  },
  {
    slug: 'never-make-happiness-the-project',
    title: 'Never make happiness the project',
    statement:
      'Happiness seems to appear most reliably as a side effect of living well, not as a target pursued directly',
    category: 'Life',
    since: 2026,
  },
  {
    slug: 'be-suspicious-of-concentrated-power',
    title: 'Be suspicious of concentrated power',
    statement:
      'Power has a tendency to justify its own expansion. Institutions rarely describe themselves as wanting control; they describe every new restriction as temporary, necessary, protective, or exceptional',
    category: 'Freedom',
    since: 2024,
  },
  {
    slug: 'freedom-can-wear-a-uniform',
    title: 'Freedom can wear a uniform',
    statement:
      'The most effective constraints are often the ones people stop recognizing as constraints. A system becomes especially powerful when obedience feels voluntary and surveillance feels convenient',
    category: 'Freedom',
    since: 2025,
  },
  {
    slug: 'censorship-deserves-suspicion',
    title: 'Censorship deserves suspicion',
    statement:
      'A society that becomes increasingly concerned with which words may be spoken deserves careful attention. Language changes and basic civility matters, but controlling vocabulary can easily become a way of controlling which ideas are possible to express',
    category: 'Freedom',
    since: 2024,
  },
  {
    slug: 'stay-confused',
    title: 'Stay confused',
    statement:
      'I like remaining slightly confused about the world. Certainty closes questions; confusion keeps them alive',
    category: 'Learning',
    since: 2026,
  },
  {
    slug: 'simplicity-creates-freedom',
    title: 'Simplicity creates freedom',
    statement:
      'My preferred version of freedom looks less like unlimited choice and more like fewer obligations, fewer unnecessary possessions, less dependence, and the ability to disappear for a while',
    category: 'Freedom',
    since: 2025,
  },
  {
    slug: 'run-to-clear-the-noise',
    title: 'Run to clear the noise',
    statement:
      'I do not run because I particularly care about proving how athletic I am. I run because repetitive movement eventually makes unnecessary thoughts quieter',
    category: 'Health',
    since: 2024,
  },
  {
    slug: 'buy-things-for-what-they-are',
    title: 'Buy things for what they are',
    statement:
      'I like objects that are well designed, well made, repairable, and pleasant to use. I have little interest in turning clothes or possessions into a substitute personality',
    category: 'Objects',
    since: 2026,
  },
  {
    slug: 'the-best-age-is-now',
    title: 'The best age is now',
    statement:
      'Nostalgia makes the past look better because it quietly removes most of the inconvenience. Anxiety does something similar to the future in reverse. The only age in which I can actually do anything is the one I am currently living through',
    category: 'Life',
    since: 2024,
  },
  {
    slug: 'recognition-is-pleasant-not-meaningful',
    title: 'Recognition is pleasant, not meaningful',
    statement:
      'Awards, praise, titles, numbers, and status feel good. Pretending otherwise would be dishonest. But the effect disappears remarkably quickly',
    category: 'Life',
    since: 2025,
  },
  {
    slug: 'know-what-is-already-enough',
    title: 'Know what is already enough',
    statement:
      'Ambition is useful, but there should be a few parts of life that are protected from permanent optimization. Some people, relationships, places, and rituals should be allowed to be enough',
    category: 'Life',
    since: 2026,
  },
  {
    slug: 'travel-as-a-participant',
    title: 'Travel as a participant',
    statement:
      'The most interesting journeys begin when a place stops behaving like a destination and starts becoming ordinary. I would rather understand one neighbourhood or local routine than collect twenty landmarks without touching the life around them',
    category: 'Travel',
    since: 2024,
  },
  {
    slug: 'compassion-requires-proximity',
    title: 'Compassion requires proximity',
    statement:
      'It is easy to have elegant theories about people whose lives never intersect with mine. Reality becomes harder and more humane once I have actually listened to people who are struggling',
    category: 'People',
    since: 2025,
  },
  {
    slug: 'money-cannot-replace-upbringing',
    title: 'Money cannot replace upbringing',
    statement:
      'Money can amplify comfort, education, opportunity, and freedom. It cannot automatically produce judgement, taste, discipline, kindness, or character',
    category: 'Money',
    since: 2024,
  },
  {
    slug: 'treat-the-body-as-finite',
    title: 'Treat the body as finite',
    statement:
      'The body negotiates for years and then sometimes simply says no. Health is easy to treat as infrastructure when everything works, but it is something much more fragile than that',
    category: 'Health',
    since: 2026,
  },
  {
    slug: 'choose-the-antidote',
    title: 'Choose the antidote',
    statement:
      'Hatred, pride, revenge, and fear are extraordinarily efficient at spreading themselves. Kindness, compassion, humour, generosity, and love are less dramatic, but they produce better outcomes',
    category: 'People',
    since: 2025,
  },
  {
    slug: 'keep-something-private',
    title: 'Keep something private',
    statement:
      "Not everything inside me needs to become content, explanation, confession, or personal branding. Privacy gives thoughts enough time to become something before other people's reactions begin shaping them",
    category: 'Attention',
    since: 2024,
  },
  {
    slug: 'cultivate-curiosity',
    title: 'Cultivate curiosity',
    statement:
      'Curiosity is one of the best reasons to keep going. There is always another subject, person, place, mechanism, book, craft, or question capable of reopening the world',
    category: 'Learning',
    since: 2026,
  },
  {
    slug: 'imagination-is-real-enough',
    title: 'Imagination is real enough',
    statement:
      'Some of the most important things in my life began as things that did not exist: plans, companies, journeys, relationships, rooms, systems, versions of myself',
    category: 'Learning',
    since: 2025,
  },
  {
    slug: 'discipline-needs-humility',
    title: 'Discipline needs humility',
    statement:
      "Part of me wants a monk's simplicity: routine, restraint, concentration, fewer distractions. Another part is still perfectly capable of flying directly toward the nearest flame",
    category: 'Life',
    since: 2026,
  },
  {
    slug: 'pessimism-is-not-permission',
    title: 'Pessimism is not permission',
    statement:
      'I can believe the world is moving in the wrong direction without making hopelessness a gift I hand to other people',
    category: 'Life',
    since: 2024,
  },
  {
    slug: 'work-for-yourself-not-for-work',
    title: 'Work for yourself, not for work',
    statement:
      'Work can provide money, craft, identity, community, challenge, and purpose. It still does not deserve ownership of an entire life',
    category: 'Work',
    since: 2025,
  },
  {
    slug: 'own-less',
    title: 'Own less',
    statement:
      'I have little interest in accumulating objects merely because accumulation itself feels satisfying. I would rather have fewer things and know why each of them is there',
    category: 'Objects',
    since: 2026,
  },
  {
    slug: 'freedom-is-the-prize',
    title: 'Freedom is the prize',
    statement:
      'Few experiences are better than removing a dependency that once controlled my choices. Every skill learned, debt removed, unnecessary obligation dropped, and fear overcome increases the number of ways I am able to live',
    category: 'Freedom',
    since: 2024,
  },
  {
    slug: 'doubt-is-evidence-of-sanity',
    title: 'Doubt is evidence of sanity',
    statement:
      'People capable of questioning themselves are usually harder to frighten than people who believe they are incapable of being wrong',
    category: 'Learning',
    since: 2025,
  },
  {
    slug: 'treat-certainty-as-temporary',
    title: 'Treat certainty as temporary',
    statement:
      'Making absolute claims about the future has become increasingly difficult and increasingly fashionable. I prefer strong opinions held provisionally',
    category: 'Learning',
    since: 2026,
  },
  {
    slug: 'keep-nature-nearby',
    title: 'Keep nature nearby',
    statement:
      'Flowers, trees, water, mountains, rain, and open sky are not decoration around real life. They are part of what makes real life tolerable',
    category: 'Nature',
    since: 2024,
  },
  {
    slug: 'respect-children-as-people',
    title: 'Respect children as people',
    statement:
      'Children deserve more than protection and instruction. They deserve respect. Being younger, inexperienced, dependent, or occasionally irrational does not make someone less entitled to dignity',
    category: 'People',
    since: 2025,
  },
  {
    slug: 'happiness-comes-from-inside',
    title: 'Happiness comes from inside',
    statement:
      'Other people can make life much better, but asking them to provide a permanent sense of completeness is an impossible assignment',
    category: 'Life',
    since: 2026,
  },
  {
    slug: 'do-not-demand-guarantees',
    title: 'Do not demand guarantees',
    statement:
      'The future refuses to sign contracts. I would rather make a considered decision under uncertainty than spend years waiting for certainty that was never available',
    category: 'Life',
    since: 2024,
  },
  {
    slug: 'avoid-mediocre-compromise',
    title: 'Avoid mediocre compromise',
    statement:
      'Compromise is useful when interests can genuinely coexist. It becomes dangerous when it produces an outcome everyone dislikes simply because nobody was willing to choose',
    category: 'Work',
    since: 2025,
  },
  {
    slug: 'solitude-is-productive',
    title: 'Solitude is productive',
    statement:
      'Communication is useful, but it is badly overprescribed. Some problems become clearer after an hour alone than after a week of meetings about them',
    category: 'Attention',
    since: 2026,
  },
  {
    slug: 'protect-the-information-diet',
    title: 'Protect the information diet',
    statement:
      'Information behaves remarkably like food: quantity matters, quality matters, and consuming more does not necessarily make me healthier',
    category: 'Attention',
    since: 2024,
  },
  {
    slug: 'repetition-does-not-create-truth',
    title: 'Repetition does not create truth',
    statement:
      'A claim repeated frequently enough starts feeling familiar, and familiarity is remarkably easy to mistake for evidence',
    category: 'Attention',
    since: 2025,
  },
  {
    slug: 'growing-up-is-unfinished-work',
    title: 'Growing up is unfinished work',
    statement:
      'I am increasingly suspicious of the idea that adulthood arrives at a particular birthday. There are areas where I am disciplined and areas where I remain completely unfinished',
    category: 'Life',
    since: 2026,
  },
  {
    slug: 'love-is-a-verb',
    title: 'Love is a verb',
    statement:
      'Love is not sustained by intensity alone. It requires attention, patience, loyalty, repair, responsibility, and a thousand small decisions nobody else sees',
    category: 'People',
    since: 2024,
  },
  {
    slug: 'good-is-rare',
    title: 'Good is rare',
    statement:
      'Truly good things are surprisingly uncommon: food, music, clothes, films, companies, ideas, friendships, dogs, books, architecture, conversations. That rarity is precisely why I prefer choosing carefully',
    category: 'Objects',
    since: 2025,
  },
  {
    slug: 'look-at-the-ocean',
    title: 'Look at the ocean',
    statement:
      'There are moments when sitting near the ocean teaches me more than another exhibition, feed, article, meeting, or explanation. Not everything worth understanding arrives as information',
    category: 'Nature',
    since: 2026,
  },
  {
    slug: 'somewhere-else-is-not-necessarily-better',
    title: 'Somewhere else is not necessarily better',
    statement:
      'I often have the feeling that somewhere else must be better than here. Sometimes it is. But I try to distinguish genuine dissatisfaction from the permanent human tendency to romanticize whatever is currently out of reach',
    category: 'Travel',
    since: 2024,
  },
]

export function principleCategoriesInUse(
  entries: readonly Principle[] = principles,
): PrincipleCategory[] {
  const seen = new Set<PrincipleCategory>()
  for (const entry of entries) {
    if (entry.category) seen.add(entry.category)
  }
  return PRINCIPLE_CATEGORIES.filter((category) => seen.has(category))
}

export function filterPrinciples(
  entries: readonly Principle[],
  category: string,
): Principle[] {
  if (category === 'all') return [...entries]
  return entries.filter((entry) => entry.category === category)
}
