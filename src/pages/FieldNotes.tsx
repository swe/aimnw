import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ApiEmptyState } from '@/components/domain/ApiEmptyState'
import { EmptyState } from '@/components/domain/EmptyState'
import { FieldNoteBody } from '@/components/domain/FieldNoteBody'
import { ImageLightbox } from '@/components/domain/ImageLightbox'
import { DetailSkeleton } from '@/components/domain/PageSkeleton'
import { PageHeader } from '@/components/layout/PageHeader'
import { Skeleton, VStack } from '@/components/ui'
import { fieldNoteKey, getFieldNote, getFieldNotes } from '@/api/notes'
import { HEADSPACE_TITLE, headspacePostTitle } from '@/content/documentTitles'
import {
  fieldNotes,
  type FieldNoteBlock,
  type FieldNoteImage,
  type FieldNoteInline,
} from '@/content/fieldNotes'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

function formatDate(value: string) {
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

function collectInlines(nodes: FieldNoteInline[], images: FieldNoteImage[]) {
  for (const node of nodes) {
    if (node.t === 'image') images.push({ src: node.src, alt: node.alt })
    if (node.t === 'em' || node.t === 'strong' || node.t === 'del' || node.t === 'mark' || node.t === 'link') {
      collectInlines(node.c, images)
    }
  }
}

function collectImages(blocks: FieldNoteBlock[]): FieldNoteImage[] {
  const images: FieldNoteImage[] = []
  for (const block of blocks) {
    if (block.type === 'image') images.push(block.image)
    if (block.type === 'imageGrid') images.push(...block.images)
    if (block.type === 'paragraph' && block.inlines) collectInlines(block.inlines, images)
    if (block.type === 'heading') collectInlines(block.inlines, images)
    if (block.type === 'quote') collectInlines(block.inlines, images)
    if (block.type === 'list') {
      const walk = (items: typeof block.items) => {
        for (const item of items) {
          collectInlines(item.content, images)
          if (item.childList) walk(item.childList.items)
        }
      }
      walk(block.items)
    }
    if (block.type === 'footnotes') {
      for (const item of block.items) collectInlines(item.inlines, images)
    }
  }
  return images
}

export function FieldNotesPage() {
  const notes = useAsyncResource('joplin-posts', getFieldNotes, {
    refreshOnFocus: true,
  })

  return (
    <VStack gap={6}>
      <PageHeader title={fieldNotes.title} description={fieldNotes.description} />

      {notes.status === 'loading' ? (
        <VStack gap={6}>
          <Skeleton height="4.5rem" />
          <Skeleton height="4.5rem" />
          <Skeleton height="4.5rem" />
        </VStack>
      ) : null}

      {notes.status === 'error' ? (
        <ApiEmptyState error={notes.error} notConfigured={notes.notConfigured} />
      ) : null}

      {notes.status === 'success' && notes.data.length === 0 ? (
        <EmptyState message="No notes in this Joplin notebook yet." />
      ) : null}

      {notes.status === 'success' && notes.data.length > 0 ? (
        <ul className="ui-index-list">
          {notes.data.map((post) => (
            <li key={post.slug}>
              <Link to={`/headspace/${post.slug}`} className="ui-index-item">
                <time className="ui-index-meta" dateTime={post.date}>
                  {formatDate(post.date)}
                </time>
                <span className="ui-item-title">{post.title}</span>
                <span className="ui-index-excerpt">{post.excerpt}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </VStack>
  )
}

export function FieldNotePage() {
  const { slug = '' } = useParams()
  // The index payload carries every body, so refreshing it re-seeds this note.
  useAsyncResource('joplin-posts', getFieldNotes, { refreshOnFocus: true })
  const note = useAsyncResource(fieldNoteKey(slug), (signal) =>
    getFieldNote(slug, signal),
  )
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  const post = note.status === 'success' ? note.data : null
  useDocumentTitle(post ? headspacePostTitle(post.title) : HEADSPACE_TITLE)
  const images = useMemo(() => (post ? collectImages(post.body) : []), [post])

  const openImage = useCallback(
    (image: FieldNoteImage) => {
      const next = images.findIndex((entry) => entry.src === image.src)
      if (next >= 0) setLightboxIndex(next)
    },
    [images],
  )

  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  if (note.status === 'loading') {
    return (
      <VStack gap={6}>
        <PageHeader title={fieldNotes.title} description={fieldNotes.description} />
        <DetailSkeleton />
      </VStack>
    )
  }

  if (note.status === 'error' || !post) {
    return (
      <VStack gap={6}>
        <PageHeader
          title="Missing note"
          description="That page wandered off. Try the index"
        />
        {note.status === 'error' ? (
          <ApiEmptyState error={note.error} notConfigured={note.notConfigured} />
        ) : null}
      </VStack>
    )
  }

  return (
    <article>
      <VStack gap={6}>
        <PageHeader
          title={post.title}
          kicker={
            <time className="ui-kicker" dateTime={post.date}>
              {formatDate(post.date)}
            </time>
          }
        />

        <FieldNoteBody blocks={post.body} onOpen={openImage} />
      </VStack>

      <ImageLightbox
        images={images}
        index={lightboxIndex}
        onClose={closeLightbox}
        onChange={setLightboxIndex}
      />
    </article>
  )
}
