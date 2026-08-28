import type { RichPart } from '@/components/domain/RichText'

export type AiBlock =
  | { kind: 'prose'; parts: RichPart[] }
  | { kind: 'quotes'; items: string[] }

export type AiSection = {
  title: string
  blocks: AiBlock[]
}

export const ai = {
  title: 'My take on AI',
  lede: "The tools I use, the boundaries I keep, and the rules I expect myself to follow. Mostly common sense, made explicit because I prefer clear lines over vague promises",
  sections: [
    {
      title: 'Research & learning',
      blocks: [
        {
          kind: 'prose',
          parts: [
            'I like to use generative AI, and mostly ',
            { label: 'Claude', href: 'https://claude.ai' },
            ' by ',
            { label: 'Anthropic', href: 'https://www.anthropic.com' },
            ', for research, learning new tools, and validating ideas. In a way, search engines once worked, before white noise replaced signal',
          ],
        },
        {
          kind: 'prose',
          parts: [
            'Also, I use ',
            { label: 'Periplus', href: 'https://periplus.app/' },
            ' when I would like to learn something new, and as a pretty much curious person, I use it a lot. But the whole idea of how I use it — I generate a master plan of the course, prepare the basics, fundamentals, and then I go to the library to find the fundamental books for the topic I want to learn. For example, as of May 2026, I learned about Quantum Ciphering',
          ],
        },
      ],
    },
    {
      title: 'What I write myself',
      blocks: [
        {
          kind: 'prose',
          parts: [
            'Everything I write is created without AI. No emails. No notes. No drafts. No blog posts. No comments. Nothing that claims to be mine is written by anyone or anything else',
          ],
        },
        {
          kind: 'prose',
          parts: [
            'Personally, I believe in the act of writing and in thinking by hand. In shaping words slowly. It\'s about being, not having — I even started journaling using the ',
            { label: 'Hobonichi', href: 'https://www.1101.com/store/techo/en/' },
            ' approach',
          ],
        },
      ],
    },
    {
      title: 'Code & craft',
      blocks: [
        {
          kind: 'prose',
          parts: [
            'Occasionally, I use AI to explain code — SQL, Python, Go, JavaScript, etc. Sometimes, I do ask to write some small functions when I am lazy, but mostly for educational purposes. Always adapted by hand before use or go on production',
          ],
        },
        {
          kind: 'quotes',
          items: [
            'What is impossible to prove but shapes belief?',
            'Which trades still use a physical toolbox?',
          ],
        },
        {
          kind: 'prose',
          parts: ['But the words are mine'],
        },
      ],
    },
    {
      title: 'If this changes',
      blocks: [
        {
          kind: 'prose',
          parts: [
            'If this ever changes, I will say so. Right here: ',
            { label: 'alleksy.com/ai', href: 'https://alleksy.com/ai' },
          ],
        },
      ],
    },
  ] satisfies AiSection[],
}
