import type { ViewfinderPhotoMeta as ViewfinderPhotoMetaType } from '@/lib/photoMeta'
import { PhotoLocationMap } from './PhotoLocationMap'
import styles from './ViewfinderPhotoMeta.module.css'

type Props = {
  meta: ViewfinderPhotoMetaType
}

export function ViewfinderPhotoMeta({ meta }: Props) {
  const hasMap =
    typeof meta.latitude === 'number' &&
    Number.isFinite(meta.latitude) &&
    typeof meta.longitude === 'number' &&
    Number.isFinite(meta.longitude)

  return (
    <aside
      className={styles.card}
      aria-label="Photo details"
    >
      <div className={styles.copy}>
        {meta.cameraLine ? (
          <p className={styles.camera}>{meta.cameraLine}</p>
        ) : null}
        <p className={styles.date}>{meta.dateLabel}</p>
      </div>

      {hasMap ? (
        <div className={styles.mapBlock}>
          <PhotoLocationMap latitude={meta.latitude!} longitude={meta.longitude!} />
          {meta.locationLabel ? (
            <p className={styles.location}>{meta.locationLabel}</p>
          ) : null}
        </div>
      ) : null}
    </aside>
  )
}
