import { useCallback, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { PageHeader } from '@/components/layout/PageHeader'
import { ApiEmptyState } from '@/components/domain/ApiEmptyState'
import { EmptyState } from '@/components/domain/EmptyState'
import { FieldNoteBody } from '@/components/domain/FieldNoteBody'
import { FollowLink } from '@/components/domain/FollowLink'
import { ImageLightbox } from '@/components/domain/ImageLightbox'
import { ListPageSkeleton, DetailSkeleton } from '@/components/domain/PageSkeleton'
import { ChipLink, ScrollCarousel, Skeleton, VStack } from '@/components/ui'
import { gearItemKey, getGear, getGearItem } from '@/api/gear'
import {
  type FieldNoteBlock,
  type FieldNoteImage,
  type FieldNoteInline,
} from '@/content/fieldNotes'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { slugify } from '@/lib/format'
import type { GearItem } from '@/types'
import styles from './Use.module.css'

function categorySlug(category?: string) {
  return slugify(category || 'gear')
}

function itemPath(item: GearItem) {
  return `/use/${categorySlug(item.category)}/${item.slug}`
}

function groupByCategory(items: GearItem[]) {
  const groups: { name: string; slug: string; items: GearItem[] }[] = []
  const index = new Map<string, (typeof groups)[number]>()

  for (const item of items) {
    const name = item.category?.trim() || 'Gear'
    const slug = categorySlug(name)
    let group = index.get(slug)
    if (!group) {
      group = { name, slug, items: [] }
      index.set(slug, group)
      groups.push(group)
    }
    group.items.push(item)
  }

  return groups
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

function dropHeroDuplicate(blocks: FieldNoteBlock[], heroSrc?: string) {
  if (!heroSrc || !blocks.length) return blocks
  const first = blocks[0]
  if (first.type === 'image' && first.image.src === heroSrc) return blocks.slice(1)
  return blocks
}

function UseCard({ item }: { item: GearItem }) {
  const inner = (
    <>
      {item.image ? (
        <img className={styles.cardImage} src={item.image} alt="" loading="lazy" />
      ) : (
        <span className={styles.cardImageEmpty} aria-hidden="true" />
      )}
      <span className={styles.cardMeta}>
        <span className="ui-item-title">{item.title}</span>
      </span>
    </>
  )

  if (!item.slug) {
    return <div className={styles.card}>{inner}</div>
  }

  return (
    <Link to={itemPath(item)} className={`ui-tile ${styles.card}`}>
      {inner}
    </Link>
  )
}

function CategoryRow({
  name,
  slug,
  items,
  linked,
}: {
  name: string
  slug: string
  items: GearItem[]
  linked?: boolean
}) {
  return (
    <section className={styles.section} aria-labelledby={`use-${slug}`}>
      <div className={styles.categoryHead}>
        {linked ? (
          <h2 className="ui-section-title" id={`use-${slug}`}>
            <FollowLink to={`/use/${slug}`} className={styles.categoryLink}>
              {name}
            </FollowLink>
          </h2>
        ) : (
          <>
            <h2 className="ui-section-title" id={`use-${slug}`}>
              {name}
            </h2>
            <span className={styles.count}>{items.length}</span>
          </>
        )}
      </div>
      <ScrollCarousel trackClassName={styles.row} label={name}>
        {items.map((item) => (
          <UseCard key={item.slug} item={item} />
        ))}
      </ScrollCarousel>
    </section>
  )
}

function UseIndexSkeleton() {
  return (
    <VStack gap={6}>
      <ListPageSkeleton cards={4} />
    </VStack>
  )
}

export function UsePage() {
  const state = useAsyncResource('use', (signal) => getGear(signal), {
    refreshOnFocus: true,
  })
  const groups = useMemo(
    () => (state.status === 'success' ? groupByCategory(state.data) : []),
    [state],
  )

  return (
    <VStack gap={6}>
      <PageHeader
        title="What I use"
        description="Hardware, software, tools, and ordinary objects that earned their place by being consistently useful. No list of things I tried once and forgot about. If it is here, I use it"
      />
      {state.status === 'loading' ? <UseIndexSkeleton /> : null}
      {state.status === 'error' ? (
        <ApiEmptyState error={state.error} notConfigured={state.notConfigured} />
      ) : null}
      {state.status === 'success' ? (
        groups.length === 0 ? (
          <EmptyState message="Nothing listed yet." />
        ) : (
          <div className={styles.groups}>
            {groups.map((group) => (
              <CategoryRow
                key={group.slug}
                name={group.name}
                slug={group.slug}
                items={group.items}
                linked
              />
            ))}
          </div>
        )
      ) : null}
    </VStack>
  )
}

export function UseCategoryPage() {
  const { category = '' } = useParams()
  const state = useAsyncResource('use', (signal) => getGear(signal), {
    refreshOnFocus: true,
  })
  const group = useMemo(() => {
    if (state.status !== 'success') return null
    return groupByCategory(state.data).find((entry) => entry.slug === category) ?? null
  }, [state, category])

  return (
    <VStack gap={6}>
      <PageHeader title={group?.name ?? 'What I use'} />
      {state.status === 'loading' ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} height="100%" style={{ aspectRatio: '1' }} radius="var(--radius-md)" />
          ))}
        </div>
      ) : null}
      {state.status === 'error' ? (
        <ApiEmptyState error={state.error} notConfigured={state.notConfigured} />
      ) : null}
      {state.status === 'success' && !group ? (
        <EmptyState message="No items in this category." />
      ) : null}
      {group ? (
        <div className={styles.grid}>
          {group.items.map((entry) => (
            <UseCard key={entry.slug} item={entry} />
          ))}
        </div>
      ) : null}
    </VStack>
  )
}

export function UseItemPage() {
  const { slug = '' } = useParams()
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const item = useAsyncResource(gearItemKey(slug), (signal) =>
    getGearItem(slug, signal),
  )
  // The catalog payload carries every body, so refreshing it re-seeds this item.
  const catalog = useAsyncResource('use', (signal) => getGear(signal), {
    refreshOnFocus: true,
  })

  const entry = item.status === 'success' ? item.data : null
  const body = useMemo(
    () => dropHeroDuplicate(entry?.body ?? [], entry?.image),
    [entry],
  )
  const images = useMemo(() => {
    const fromBody = collectImages(body)
    if (!entry?.image) return fromBody
    if (fromBody.some((image) => image.src === entry.image)) return fromBody
    return [{ src: entry.image, alt: entry.title }, ...fromBody]
  }, [body, entry])

  const related = useMemo(() => {
    if (!entry || catalog.status !== 'success') return []
    return catalog.data.filter(
      (other) =>
        other.slug !== entry.slug &&
        categorySlug(other.category) === categorySlug(entry.category),
    )
  }, [catalog, entry])

  const openImage = useCallback(
    (image: FieldNoteImage) => {
      const next = images.findIndex((entryImage) => entryImage.src === image.src)
      if (next >= 0) setLightboxIndex(next)
    },
    [images],
  )
  const closeLightbox = useCallback(() => setLightboxIndex(null), [])

  if (item.status === 'loading') {
    return (
      <VStack gap={6}>
        <PageHeader title="What I use" />
        <DetailSkeleton />
      </VStack>
    )
  }

  if (item.status === 'error' || !entry) {
    return (
      <VStack gap={6}>
        <PageHeader title="Missing item" description="That page wandered off. Try the index" />
        {item.status === 'error' ? (
          <ApiEmptyState error={item.error} notConfigured={item.notConfigured} />
        ) : null}
      </VStack>
    )
  }

  return (
    <article className={styles.article}>
      <PageHeader title={entry.title}>
        <div className={styles.metaRow}>
          {entry.category ? (
            <ChipLink to={`/use/${categorySlug(entry.category)}`}>{entry.category}</ChipLink>
          ) : null}
          {entry.link ? <FollowLink href={entry.link}>Buy it</FollowLink> : null}
        </div>
      </PageHeader>

      <VStack gap={6}>
        {entry.image ? (
          <figure className={styles.figure}>
            <button
              type="button"
              className={styles.imageButton}
              onClick={() => openImage({ src: entry.image!, alt: entry.title })}
              aria-label={`View ${entry.title}`}
            >
              <img className={styles.hero} src={entry.image} alt="" />
            </button>
          </figure>
        ) : null}

        {body.length ? <FieldNoteBody blocks={body} onOpen={openImage} /> : null}

        {related.length > 0 && entry.category ? (
          <section className={styles.more} aria-labelledby="use-more">
            <div className={styles.moreHead}>
              <h2 className="ui-section-title" id="use-more">
                More from {entry.category}
              </h2>
              <FollowLink to={`/use/${categorySlug(entry.category)}`}>See all</FollowLink>
            </div>
            <ul className={styles.moreList}>
              {related.map((other) => (
                <li key={other.slug}>
                  <Link to={itemPath(other)} className={styles.moreItem}>
                    {other.image ? (
                      <img className={styles.moreThumb} src={other.image} alt="" />
                    ) : (
                      <span className={styles.moreThumbEmpty} aria-hidden="true" />
                    )}
                    <span className="ui-item-title">{other.title}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
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
