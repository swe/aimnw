import type { RichPart } from '@/components/domain/RichText'
import { goalsPage } from '@/content/goals'

export type WhoamiLink = { label: string; href?: string; to?: string; hidden?: boolean }

export const whoami = {
  title: 'This is who I really am',
  birthIso: '1995-02-01T18:15:00+03:00',
  pronunciation: {
    phonetic: 'EE-v-AH-n',
    audioSrc: '/pronunciation.m4a',
    speakText: 'Iván',
  },
  preferredName: {
    display: 'Iván',
    username: 'iamalleksy',
  },
  linkRows: [
    {
      label: 'Online',
      links: [
        { label: 'gh/swe', href: 'https://github.com/swe' },
        { label: 'li/iamalleksy', href: 'https://linkedin.com/in/iamalleksy' },
        { label: 'ciao@alleksy.com', href: 'mailto:ciao@alleksy.com' },
      ] satisfies WhoamiLink[],
    },
    {
      label: 'Offline',
      links: [
        {
          label: 'Resume',
          href: '/media/i/docs/work/resume_ivan-aleksandrov.pdf',
        },
        { label: 'Viewfinder', to: '/viewfinder' },
        { label: 'Experiments', to: '/experiments', hidden: true },
        { label: 'Strava', href: 'https://www.strava.com/athletes/10659571' },
      ] satisfies WhoamiLink[],
    },
    {
      label: 'Preferences',
      links: [
        { label: 'I use', to: '/use' },
        { label: 'I hate', to: '/hate' },
        { label: 'I drink', to: '/drink' },
        { label: 'I read and listen', to: '/library' },
        { label: 'Principles', to: '/principles' },
      ] satisfies WhoamiLink[],
    },
  ],
  dryFacts: [
    [
      'My name is Iván, and I am a Russian-born, Swedish-raised Security Engineer and Researcher living and working in Vancouver, BC, Canada. I have a deep interest in internationalization and localization, ciphering and quantum technologies — the kinds of problems that reward patience more than flash',
    ],
    [
      "This website is an online space for archiving the projects I'm involved with, the books that stick, and the goals I set for myself along the way. It is less a portfolio and more a notebook I don't mind strangers reading",
    ],
    [
      'Right now I help my friends running ',
      { label: 'Svalbard Security', href: 'https://svalbard.ca/' },
      ', a boutique cybersecurity studio. Before that, among other things, I\'ve been the cyber security technical lead of CloudRAN team for ',
      { label: 'Ericsson', href: 'https://ericsson.com' },
      ' in Stockholm, and Cyber Security Analyst at ',
      { label: 'Hewlett-Packard Enterprise', href: 'https://hpe.com/' },
      ' in London',
    ],
  ] satisfies RichPart[][],
  butAlso: [
    [
      'I am much more than my work. In 2022 I moved to Vancouver after realizing the Canadian vibe was close to me, and I have been building a life around that feeling ever since. Here I practice long village walks, cold ocean swims, and trail runs that go a little farther than planned. Sitting on a bench in the middle of nowhere is my happy place. I keep a camera with me most of the time, drink V60 on a daily basis, and slowly perfect my French',
    ],
  ] satisfies RichPart[][],
  goalsNote: goalsPage.note,
  faq: [
    { question: 'How do you prefer to be called?', kind: 'named' as const },
    { question: 'How is your name pronounced?', kind: 'pronunciation' as const },
    { question: 'What are your pronouns?', kind: 'text' as const, text: 'He/him/his' },
    {
      question: 'Where are you from?',
      kind: 'text' as const,
      text: 'A Russian-born, Swedish-raised Canadian',
    },
    { question: 'How old are you?', kind: 'age' as const },
    { question: 'Which language do you think in?', kind: 'text' as const, text: 'None' },
    {
      question: 'How introverted or extroverted are you?',
      kind: 'text' as const,
      text: '99% introverted, 1% extroverted, but I pretend well',
    },
    {
      question: 'Do you sleep enough?',
      kind: 'text' as const,
      text: 'No, but I compensate with caffeine',
    },
    { question: 'Do you like small talk?', kind: 'text' as const, text: 'I survive it' },
    {
      question: "What's your favorite sound?",
      kind: 'text' as const,
      text: 'Whale songs in the autumn period',
    },
    {
      question: 'How do you make decisions?',
      kind: 'text' as const,
      text: 'Research first, intuition second, overthinking third',
    },
    {
      question: "What's your favorite type of clothing?",
      kind: 'text' as const,
      text: 'Black layers',
    },
  ],
}
