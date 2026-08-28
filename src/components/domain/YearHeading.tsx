import styles from './YearHeading.module.css'

export function YearHeading({
  id,
  label,
  count,
}: {
  id: string
  label: string | number
  count: number
}) {
  return (
    <div className={styles.head}>
      <h2 className="ui-section-title" id={id}>
        {label}
      </h2>
      <span className={styles.count}>{count}</span>
    </div>
  )
}
