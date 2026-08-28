import { joplinGet } from './joplin'
import { peekResource, seedResource } from '@/lib/resourceCache'
import type { FieldNote } from '@/content/fieldNotes'

type PostsResponse = {
  posts: FieldNote[]
}

export function fieldNoteKey(slug: string) {
  return `joplin-post:${slug}`
}

/** The index payload carries every body, so each note page is seeded from this one call. */
export async function getFieldNotes(signal?: AbortSignal): Promise<FieldNote[]> {
  const payload = await joplinGet<PostsResponse>('/api/joplin/posts', signal)
  for (const post of payload.posts) {
    if (post.body) seedResource(fieldNoteKey(post.slug), post)
  }
  return payload.posts
}

export async function getFieldNote(
  slug: string,
  signal?: AbortSignal,
): Promise<FieldNote> {
  const seeded = peekResource(fieldNoteKey(slug))
  if (seeded?.status === 'success') return seeded.data as FieldNote
  return joplinGet<FieldNote>(`/api/joplin/posts/${encodeURIComponent(slug)}`, signal)
}
