import type { ReactNode } from 'react'
import { Heading, Text, VStack } from '@/components/ui'
import { BackButton, usePageBack } from './BackButton'
import styles from './PageHeader.module.css'

type PageHeaderProps = {
  title: string
  description?: ReactNode
  kicker?: ReactNode
  end?: ReactNode
  children?: ReactNode
}

export function PageHeader({
  title,
  description,
  kicker,
  end,
  children,
}: PageHeaderProps) {
  const back = usePageBack()

  const heading = (
    <Heading as="h1" size="2xl">
      {title}
    </Heading>
  )

  const titleBlock = back ? (
    <div className={styles.titleCluster}>
      <div className={styles.back}>
        <BackButton fallback={back.fallback} />
      </div>
      {heading}
    </div>
  ) : (
    heading
  )

  return (
    <header className={styles.header}>
      <VStack gap={4}>
        {kicker ? <div className={`ui-kicker ${styles.kicker}`}>{kicker}</div> : null}
        {end ? (
          <div className={styles.titleRow}>
            {titleBlock}
            {end}
          </div>
        ) : (
          titleBlock
        )}
        {description ? (
          typeof description === 'string' ? (
            <Text className={styles.description}>{description}</Text>
          ) : (
            description
          )
        ) : null}
        {children}
      </VStack>
    </header>
  )
}
