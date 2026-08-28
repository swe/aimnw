import { ApiError, apiGet, requireEnv } from './client'
import { mapWithConcurrency } from '@/lib/concurrency'
import { buildViewfinderPhotoMeta, type ViewfinderPhotoMeta } from '@/lib/photoMeta'

export type CameraPhoto = {
  id: string
  imageUrl: string
  createdAt: string
}

export type ViewfinderPhoto = CameraPhoto & {
  meta: ViewfinderPhotoMeta | null
}

type ImmichExifInfo = {
  make?: string | null
  model?: string | null
  lensModel?: string | null
  fNumber?: number | null
  focalLength?: number | null
  iso?: number | null
  exposureTime?: string | null
  latitude?: number | null
  longitude?: number | null
  city?: string | null
  state?: string | null
  country?: string | null
  description?: string | null
}

type ImmichAssetResponse = {
  id: string
  localDateTime?: string
  exifInfo?: ImmichExifInfo | null
}

type SharedLinkResponse = {
  key: string
  slug: string | null
  album?: {
    id: string
    assetCount?: number
  }
}

type TimelineBucket = {
  timeBucket: string
  count: number
}

type TimelineBucketAssets = {
  id: string[]
  isImage: boolean[]
  fileCreatedAt: string[]
}

const CAMERA_ROLL_COUNT = 5
/** Parallel bucket reads for the full album; the home roll stops after one bucket. */
const BUCKET_CONCURRENCY = 6
const ASSET_CONCURRENCY = 6

function photosShareUrl() {
  return requireEnv(import.meta.env.API_PHOTOS, 'API_PHOTOS')
}

/** JSON calls go through same-origin `/immich` proxy (Vite + production server). */
function apiOrigin() {
  return '/immich'
}

function publicOrigin(shareUrl: string) {
  return new URL(shareUrl).origin
}

function shareSlug(shareUrl: string) {
  const path = new URL(shareUrl).pathname.replace(/\/+$/, '')
  const slug = path.split('/').filter(Boolean).pop()
  if (!slug) throw new ApiError('API_PHOTOS must look like https://host/s/slug', 500)
  return slug
}

function thumbnailUrl(origin: string, assetId: string, slug: string) {
  return `${origin}/api/assets/${assetId}/thumbnail?size=preview&slug=${encodeURIComponent(slug)}`
}

async function getBucketAssets(
  origin: string,
  albumId: string,
  timeBucket: string,
  slug: string,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    albumId,
    timeBucket,
    slug,
  })
  return apiGet<TimelineBucketAssets>(
    origin,
    `/api/timeline/bucket?${query.toString()}`,
    { signal },
  )
}

async function getAssetMeta(
  origin: string,
  assetId: string,
  slug: string,
  fallbackCreatedAt: string,
  signal?: AbortSignal,
): Promise<ViewfinderPhotoMeta | null> {
  try {
    const asset = await apiGet<ImmichAssetResponse>(
      origin,
      `/api/assets/${assetId}?slug=${encodeURIComponent(slug)}`,
      { signal },
    )
    const capturedAt = asset.localDateTime || fallbackCreatedAt
    return buildViewfinderPhotoMeta(capturedAt, asset.exifInfo)
  } catch {
    return buildViewfinderPhotoMeta(fallbackCreatedAt)
  }
}

async function getAlbumPhotos(
  options: { limit?: number; signal?: AbortSignal; withMetadata?: boolean } = {},
): Promise<CameraPhoto[] | ViewfinderPhoto[]> {
  const { limit, signal, withMetadata = false } = options
  const shareUrl = photosShareUrl()
  const slug = shareSlug(shareUrl)
  const origin = apiOrigin()
  const mediaOrigin = publicOrigin(shareUrl)

  const shared = await apiGet<SharedLinkResponse>(
    origin,
    `/api/shared-links/me?slug=${encodeURIComponent(slug)}`,
    { signal },
  )

  const albumId = shared.album?.id
  if (!albumId) throw new ApiError('Shared link has no album', 404)

  const buckets = await apiGet<TimelineBucket[]>(
    origin,
    `/api/timeline/buckets?albumId=${encodeURIComponent(albumId)}&slug=${encodeURIComponent(slug)}`,
    { signal },
  )

  // Newest buckets first; each bucket lists assets newest-first.
  const orderedBuckets = [...buckets].sort((a, b) =>
    b.timeBucket.localeCompare(a.timeBucket),
  )

  const selected: { id: string; fileCreatedAt: string }[] = []

  const collect = (assets: TimelineBucketAssets) => {
    for (let i = 0; i < assets.id.length; i += 1) {
      if (!assets.isImage[i]) continue
      selected.push({
        id: assets.id[i],
        fileCreatedAt: assets.fileCreatedAt[i],
      })
      if (limit !== undefined && selected.length >= limit) return true
    }
    return false
  }

  if (limit !== undefined) {
    // Newest bucket usually satisfies the home roll, so stop as soon as it does.
    for (const bucket of orderedBuckets) {
      const assets = await getBucketAssets(origin, albumId, bucket.timeBucket, slug, signal)
      if (collect(assets)) break
    }
  } else {
    const bucketAssets = await mapWithConcurrency(
      orderedBuckets,
      BUCKET_CONCURRENCY,
      (bucket) => getBucketAssets(origin, albumId, bucket.timeBucket, slug, signal),
    )
    for (const assets of bucketAssets) collect(assets)
  }

  const slice = limit !== undefined ? selected.slice(0, limit) : selected

  if (!withMetadata) {
    return slice.map((asset) => ({
      id: asset.id,
      createdAt: asset.fileCreatedAt,
      imageUrl: thumbnailUrl(mediaOrigin, asset.id, slug),
    }))
  }

  const meta = await mapWithConcurrency(
    slice,
    ASSET_CONCURRENCY,
    (asset) => getAssetMeta(origin, asset.id, slug, asset.fileCreatedAt, signal),
  )

  return slice.map((asset, index) => ({
    id: asset.id,
    createdAt: asset.fileCreatedAt,
    imageUrl: thumbnailUrl(mediaOrigin, asset.id, slug),
    meta: meta[index],
  }))
}

export async function getCameraRollPhotos(signal?: AbortSignal): Promise<CameraPhoto[]> {
  return getAlbumPhotos({ limit: CAMERA_ROLL_COUNT, signal })
}

/** Full shared-album archive for /viewfinder. */
export async function getViewfinderPhotos(signal?: AbortSignal): Promise<ViewfinderPhoto[]> {
  return getAlbumPhotos({ signal, withMetadata: true }) as Promise<ViewfinderPhoto[]>
}
