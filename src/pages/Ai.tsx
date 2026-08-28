import { PageHeader } from '@/components/layout/PageHeader'
import { RichText } from '@/components/domain/RichText'
import { VStack } from '@/components/ui'
import { ai } from '@/content/ai'
import styles from './Ai.module.css'

export function AiPage() {
  return (
    <VStack gap={6}>
      <PageHeader title={ai.title} description={ai.lede} />

      {ai.sections.map((section) => (
        <section key={section.title} className={styles.section}>
          <h2 className="ui-section-title">{section.title}</h2>
          <div className={styles.stack}>
            {section.blocks.map((block, index) => {
              if (block.kind === 'quotes') {
                return (
                  <div key={index} className={styles.quotes}>
                    {block.items.map((item) => (
                      <blockquote key={item} className={styles.quote}>
                        {item}
                      </blockquote>
                    ))}
                  </div>
                )
              }

              return (
                <RichText
                  key={index}
                  parts={block.parts}
                  className="ui-prose"
                  linkClassName="prose-link"
                />
              )
            })}
          </div>
        </section>
      ))}
    </VStack>
  )
}
