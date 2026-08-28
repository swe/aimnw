type ExifLike = {
  make?: string | null
  model?: string | null
  fNumber?: number | null
  focalLength?: number | null
  latitude?: number | null
  longitude?: number | null
  city?: string | null
  state?: string | null
  country?: string | null
  description?: string | null
}

export type ViewfinderPhotoMeta = {
  title?: string
  cameraLine?: string
  dateLabel: string
  locationLabel?: string
  latitude?: number
  longitude?: number
}

function hasCoords(exif: ExifLike): exif is ExifLike & { latitude: number; longitude: number } {
  return (
    typeof exif.latitude === 'number' &&
    Number.isFinite(exif.latitude) &&
    typeof exif.longitude === 'number' &&
    Number.isFinite(exif.longitude)
  )
}

export function formatCameraLine(exif: ExifLike): string | undefined {
  const model = exif.model?.replace(/^Apple\s+/i, '').trim()
  if (!model) return undefined

  const parts = [model]
  if (typeof exif.fNumber === 'number' && Number.isFinite(exif.fNumber)) {
    parts.push(`f/${exif.fNumber}`)
  }
  return parts.join(' · ')
}

export function formatPhotoDate(iso: string): string {
  const parsed = new Date(iso)
  if (!Number.isFinite(parsed.getTime())) return iso
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(parsed)
}

export function formatLocationLabel(exif: ExifLike): string | undefined {
  const city = exif.city?.trim()
  const country = exif.country?.trim()
  if (city && country) return `${city}, ${country}`
  return city || country || undefined
}

export function buildViewfinderPhotoMeta(
  capturedAt: string,
  exif?: ExifLike | null,
): ViewfinderPhotoMeta {
  const dateLabel = formatPhotoDate(capturedAt)
  if (!exif) return { dateLabel }

  const title = exif.description?.trim() || undefined
  const cameraLine = formatCameraLine(exif)
  const locationLabel = formatLocationLabel(exif)
  const coords = hasCoords(exif) ? { latitude: exif.latitude, longitude: exif.longitude } : {}

  return {
    title,
    cameraLine,
    dateLabel,
    locationLabel,
    ...coords,
  }
}

export function hasViewfinderMetaPanel(meta: ViewfinderPhotoMeta | null | undefined): meta is ViewfinderPhotoMeta {
  if (!meta) return false
  return Boolean(meta.cameraLine || meta.dateLabel || meta.locationLabel)
}
