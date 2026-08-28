export type FieldNoteImage = {
  src: string
  alt: string
  caption?: string
}

export type FieldNoteInline =
  | { t: 'text'; v: string }
  | { t: 'em'; c: FieldNoteInline[] }
  | { t: 'strong'; c: FieldNoteInline[] }
  | { t: 'del'; c: FieldNoteInline[] }
  | { t: 'mark'; c: FieldNoteInline[] }
  | { t: 'code'; v: string }
  | { t: 'link'; href: string; c: FieldNoteInline[] }
  | { t: 'image'; src: string; alt: string }
  | { t: 'footnoteRef'; id: string; n: number }

export type FieldNoteList = {
  ordered: boolean
  start?: number
  items: FieldNoteListItem[]
}

export type FieldNoteListItem = {
  content: FieldNoteInline[]
  checked?: boolean
  childList?: FieldNoteList
}

export type FieldNoteFootnote = {
  id: string
  n: number
  inlines: FieldNoteInline[]
}

export type FieldNoteBlock =
  | { type: 'paragraph'; inlines: FieldNoteInline[]; text?: string }
  | { type: 'heading'; level: 1 | 2 | 3 | 4; id?: string; inlines: FieldNoteInline[] }
  | { type: 'list'; ordered: boolean; start?: number; items: FieldNoteListItem[] }
  | { type: 'quote'; inlines: FieldNoteInline[] }
  | { type: 'code'; lang?: string; text: string }
  | { type: 'mermaid'; text: string }
  | { type: 'table'; headers: FieldNoteInline[][]; rows: FieldNoteInline[][][] }
  | { type: 'rule' }
  | { type: 'image'; image: FieldNoteImage }
  | { type: 'imageGrid'; images: FieldNoteImage[] }
  | { type: 'footnotes'; items: FieldNoteFootnote[] }

export type FieldNote = {
  slug: string
  title: string
  date: string
  excerpt: string
  body: FieldNoteBlock[]
}

export const fieldNotes = {
  title: 'Headspace',
  description:
    'Notes from somewhere between work, life, and whatever I happened to notice along the way. Systems, trails, coffee, ideas, occasional complaints, and things that survived long enough in my drafts to become public',
}
