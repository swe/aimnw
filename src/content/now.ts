import type { RichPart } from '@/components/domain/RichText'

export type NowSection = {
  title: string
  paragraphs: RichPart[][]
}

export const now = {
  title: "What I'm Doing Now",
  lede: 'A running record of what has my attention right now. Not a feed, not a status page, and not updated for the sake of looking active. Things stay here for as long as they remain genuinely important',
  updated: 'May 2026',
  inspiredBy: {
    label: 'Derek Sivers',
    href: 'https://nownownow.com/about',
  },
  sections: [
    {
      title: 'Homeseeking',
      paragraphs: [
        [
          'This year I am getting married, and I finally want to start calling Vancouver my home — not just the city I live in, but the place I am choosing to build around. That means slower Sundays, familiar routes, and treating the next chapter as something rooted rather than temporary',
        ],
      ],
    },
    {
      title: 'Building',
      paragraphs: [
        [
          'Most of my time goes into ',
          { label: 'Svalbard Security', href: 'https://svalbard.ca/' },
          ', the boutique cybersecurity studio I help run with friends. My big dream is to grow our small venture into a world-class enterprise cyber security agency — well-known, trusted, and with a reputation for defending the good',
        ],
        [
          'If you are curious about protecting your assets, or want to learn more about this wild field, just talk to us: ',
          { label: 'svalbard.ca/contact', href: 'https://svalbard.ca/contact' },
        ],
      ],
    },
    {
      title: 'Learning',
      paragraphs: [
        [
          'More than cybersecurity, I like to keep learning something new in my life. Right now, with the help of ',
          { label: 'Periplus', href: 'https://periplus.app/' },
          ', I built a perfectly tailored course for myself on quantum ciphering and elliptic curves — and this is the learning path I am about to walk through, deliberately and without rushing the hard parts',
        ],
        [
          'Moreover, I would like to achieve some real level of expertise in that space and eventually publish research papers on ',
          { label: 'arXiv', href: 'https://arxiv.org/' },
          ', so the work does not stay only in private notes',
        ],
      ],
    },
    {
      title: 'Training',
      paragraphs: [
        [
          'This year is also about sports achievements. I started running last year and have made some progress, and now I am focusing mostly on endurance, general health, and regular check-ups. Building a healthy body is a long journey, and it is not a destination — which is exactly why I keep showing up for the boring middle bits',
        ],
        [
          'You can also check my ',
          { label: 'Goals', to: '/goals' },
          ' and ',
          { label: 'Training', to: '/sport' },
          ' pages to see the progress as it accumulates',
        ],
      ],
    },
  ] satisfies NowSection[],
}
