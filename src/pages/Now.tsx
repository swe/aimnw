import { PageHeader } from '@/components/layout/PageHeader'
import { RichText } from '@/components/domain/RichText'
import { VStack } from '@/components/ui'
import { now } from '@/content/now'
import styles from './Now.module.css'

export function NowPage() {
  return (
    <VStack gap={6}>
      <PageHeader title={now.title} description={now.lede} />

      {now.sections.map((section) => (
        <section key={section.title} className={styles.section}>
          <h2 className="ui-section-title">{section.title}</h2>
          <div className={styles.stack}>
            {section.paragraphs.map((parts, index) => (
              <RichText
                key={index}
                parts={parts}
                className="ui-prose"
                linkClassName="prose-link"
              />
            ))}
          </div>
        </section>
      ))}

      <footer className={styles.footer}>
        <p className={styles.meta}>
          This is a /now page, inspired by{' '}
          <a
            href={now.inspiredBy.href}
            className="prose-link"
            target="_blank"
            rel="noreferrer"
          >
            {now.inspiredBy.label}
          </a>
        </p>
        <p className={styles.meta}>Last updated: {now.updated}</p>
      </footer>
    </VStack>
  )
}
