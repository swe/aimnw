import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Heart } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { ApiEmptyState } from '@/components/domain/ApiEmptyState'
import { EmptyState } from '@/components/domain/EmptyState'
import { FilterBar } from '@/components/domain/FilterBar'
import { ItemModal } from '@/components/domain/ItemModal'
import { ItemCardButton, ItemGrid } from '@/components/domain/ItemGrid'
import { ListPageSkeleton } from '@/components/domain/PageSkeleton'
import { ChipLabel, VStack } from '@/components/ui'
import { getDrink, getDrinks } from '@/api/drinks'
import { useAsyncResource } from '@/hooks/useAsyncResource'
import { useItemParam } from '@/hooks/useItemParam'
import { slugify } from '@/lib/format'
import type {
  CocktailDetails,
  CoffeeDetails,
  DrinkIngredient,
  DrinkItem,
  DrinkTempRange,
  NonAlcoholicDetails,
  SpiritDetails,
  WineDetails,
} from '@/types'
import styles from './Drink.module.css'

const TYPE_ORDER = ['coffee', 'wine', 'cocktail', 'spirit', 'non_alcoholic']

type TypeTone = { soft: string; fill: string; border: string }

const TYPE_TONES: Record<string, TypeTone> = {
  coffee: { soft: '#eceff2', fill: '#5c6570', border: '#9aa3ad' },
  wine: { soft: '#f5e9ec', fill: '#8a3d52', border: '#d6aab2' },
  cocktail: { soft: '#f6eee6', fill: '#8a5a2f', border: '#e0c4a4' },
  spirit: { soft: '#f3efe6', fill: '#6e5a3a', border: '#d4c4a4' },
  non_alcoholic: { soft: '#e7f2f1', fill: '#2f6b66', border: '#a6c6c2' },
}

const BASE_TYPE_TONE: TypeTone = {
  soft: 'var(--color-surface)',
  fill: 'var(--color-fg-muted)',
  border: 'var(--color-border)',
}

function typeTone(type: string): TypeTone {
  return TYPE_TONES[type] ?? BASE_TYPE_TONE
}

function filterLabel(type: string) {
  switch (type) {
    case 'cocktail':
      return 'Cocktails'
    case 'wine':
      return 'Wines'
    case 'spirit':
      return 'Spirits'
    case 'non_alcoholic':
      return 'Non-alcoholic'
    case 'coffee':
      return 'Coffee'
    default:
      return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ')
  }
}

function humanize(value: string) {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function joinFacts(parts: Array<string | null | undefined>) {
  return parts.map((part) => part?.trim()).filter(Boolean).join(' · ')
}

function formatIce(ice: boolean | string | null | undefined, iceCubes?: number | null) {
  if (ice == null) return null
  if (typeof ice === 'string') return ice
  if (!ice) return 'No ice'
  if (iceCubes === 1) return '1 large rock'
  if (iceCubes != null && iceCubes > 1) return `${iceCubes} ice cubes`
  return 'Over ice'
}

function formatTempRange(range: DrinkTempRange | null | undefined) {
  if (!range) return null
  if (range.min === range.max) return `${range.min}°C`
  return `${range.min}–${range.max}°C`
}

function formatAmount(ingredient: DrinkIngredient) {
  if (ingredient.amount == null) return null
  const unit = ingredient.unit?.trim()
  if (!unit) return String(ingredient.amount)
  return `${ingredient.amount} ${unit}`
}

function splitProse(value: string | null | undefined) {
  if (!value?.trim()) return []
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
}

export function DrinkPage() {
  const { openItem } = useItemParam()
  const [filter, setFilter] = useState('all')
  const state = useAsyncResource('drink', (signal) => getDrinks(signal))
  const loadItem = useCallback(
    (slug: string, signal: AbortSignal) => getDrink(slug, signal),
    [],
  )

  const types = useMemo(() => {
    if (state.status !== 'success') return [] as string[]
    const present = new Set(state.data.map((d) => d.drinkType))
    return TYPE_ORDER.filter((type) => present.has(type)).concat(
      [...present].filter((type) => !TYPE_ORDER.includes(type)).sort(),
    )
  }, [state])

  const visible = useMemo(() => {
    if (state.status !== 'success') return []
    const sorted = [...state.data].sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    if (filter === 'all') return sorted
    return sorted.filter((drink) => drink.drinkType === filter)
  }, [state, filter])

  return (
    <VStack gap={6}>
      <PageHeader
        title="What’s in my glass"
        description="Things I genuinely like drinking, or at least find interesting enough to remember. Coffee, wine, cocktails, and whatever else makes the cut. Not tasting notes from someone pretending to detect seventeen kinds of wet stone"
      />

      {state.status === 'loading' ? <ListPageSkeleton /> : null}
      {state.status === 'error' ? (
        <ApiEmptyState error={state.error} notConfigured={state.notConfigured} />
      ) : null}
      {state.status === 'success' ? (
        <>
          <FilterBar
            options={types}
            value={filter}
            onChange={setFilter}
            formatLabel={filterLabel}
          />
          {visible.length === 0 ? (
            <EmptyState message="Nothing in this glass yet." />
          ) : (
            <ItemGrid>
              {visible.map((drink) => (
                <ItemCardButton
                  key={drink.name}
                  title={drink.name}
                  kicker={filterLabel(drink.drinkType)}
                  imageUrl={drink.imageUrl}
                  mediaRatio="square"
                  trailing={
                    drink.isFavorite ? (
                      <Heart
                        className={styles.titleFavorite}
                        size={14}
                        strokeWidth={1.75}
                        fill="currentColor"
                        aria-hidden="true"
                      />
                    ) : null
                  }
                  onClick={() => openItem(slugify(drink.name))}
                />
              ))}
            </ItemGrid>
          )}
        </>
      ) : null}

      <ItemModal<DrinkItem>
        titleFallback="Drink"
        load={loadItem}
        getTitle={(item) => item.name}
        getTitleAside={(item) =>
          item.isFavorite ? (
            <span className={styles.titleFavorite} aria-label="favorite">
              <Heart size={15} strokeWidth={1.75} fill="currentColor" />
            </span>
          ) : null
        }
        render={(item) => <DrinkDetail drink={item} />}
      />
    </VStack>
  )
}

function DrinkDetail({ drink }: { drink: DrinkItem }) {
  const tone = typeTone(drink.drinkType)

  return (
    <div className={styles.detail}>
      <div className={styles.detailHead}>
        {drink.imageUrl ? (
          <img className={styles.detailImage} src={drink.imageUrl} alt="" />
        ) : (
          <div className={styles.detailImageEmpty} aria-hidden="true">
            {drink.name.slice(0, 1)}
          </div>
        )}
        <div className={styles.detailIntro}>
          <div className={styles.detailMeta}>
            <ChipLabel
              style={{
                background: tone.soft,
                color: tone.fill,
                borderColor: tone.border,
              }}
            >
              {filterLabel(drink.drinkType)}
            </ChipLabel>
            <DrinkSubtitle drink={drink} />
          </div>
          {drink.personalImpression ? (
            <p className={styles.impression}>{drink.personalImpression}</p>
          ) : null}
        </div>
      </div>

      <DrinkBody drink={drink} />
    </div>
  )
}

function DrinkSubtitle({ drink }: { drink: DrinkItem }) {
  const text = (() => {
    switch (drink.drinkType) {
      case 'coffee': {
        const d = drink.details as CoffeeDetails
        return joinFacts([
          d.origin?.country,
          d.origin?.region,
          d.process ? humanize(d.process) : null,
          d.roastLevel ? `${humanize(d.roastLevel)} roast` : null,
        ])
      }
      case 'cocktail': {
        const d = drink.details as CocktailDetails
        return d.style ? humanize(d.style) : null
      }
      case 'wine': {
        const d = drink.details as WineDetails
        return joinFacts([
          d.style ? humanize(d.style) : null,
          d.country,
          d.region,
          d.subregion,
          d.appellation,
          d.classification,
        ])
      }
      case 'spirit': {
        const d = drink.details as SpiritDetails
        return joinFacts([
          d.category ? humanize(d.category) : null,
          d.ageYears != null ? `${d.ageYears} years` : null,
          d.region,
        ])
      }
      case 'non_alcoholic': {
        const d = drink.details as NonAlcoholicDetails
        return joinFacts([
          d.category ? humanize(d.category) : null,
          d.flavor ? humanize(d.flavor) : null,
        ])
      }
      default:
        return null
    }
  })()

  if (!text) return null
  return <p className={styles.subtitle}>{text}</p>
}

function DrinkBody({ drink }: { drink: DrinkItem }) {
  switch (drink.drinkType) {
    case 'coffee':
      return <CoffeeBody details={drink.details as CoffeeDetails} />
    case 'cocktail':
      return <CocktailBody details={drink.details as CocktailDetails} />
    case 'wine':
      return <WineBody details={drink.details as WineDetails} />
    case 'spirit':
      return <SpiritBody details={drink.details as SpiritDetails} />
    case 'non_alcoholic':
      return <NonAlcoholicBody details={drink.details as NonAlcoholicDetails} />
    default:
      return null
  }
}

function FactRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className={styles.fact}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  )
}

function FactList({ children }: { children: ReactNode }) {
  const items = Array.isArray(children) ? children : [children]
  if (!items.some(Boolean)) return null
  return <dl className={styles.facts}>{children}</dl>
}

function Method({ text }: { text: string | null | undefined }) {
  const lines = splitProse(text)
  if (!lines.length) return null
  return (
    <section className={styles.section}>
      <h3 className="ui-kicker">Method</h3>
      {lines.length === 1 ? (
        <p className={styles.prose}>{lines[0]}</p>
      ) : (
        <ol className={styles.steps}>
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ol>
      )}
    </section>
  )
}

function CoffeeBody({ details }: { details: CoffeeDetails }) {
  const specs = [
    details.coffeeDoseGrams != null
      ? { label: 'Dose', value: `${details.coffeeDoseGrams} g` }
      : null,
    details.waterVolumeMl != null
      ? { label: 'Water', value: `${details.waterVolumeMl} ml` }
      : null,
    details.waterTemperatureC != null
      ? { label: 'Temp', value: `${details.waterTemperatureC}°C` }
      : null,
    details.grindSizeMicrons != null
      ? { label: 'Grind', value: `${details.grindSizeMicrons} µm` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[]

  return (
    <div className={styles.bodyStack}>
      {details.brewMethod ? (
        <p className={styles.brewMethod}>{details.brewMethod}</p>
      ) : null}

      {specs.length ? (
        <div className={styles.specGrid} aria-label="Brew ratios">
          {specs.map((spec) => (
            <div key={spec.label} className={styles.spec}>
              <span className={styles.specLabel}>{spec.label}</span>
              <span className={styles.specValue}>{spec.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {details.pourStages?.length ? (
        <section className={styles.section}>
          <h3 className="ui-kicker">Pour</h3>
          <ol className={styles.pours}>
            {details.pourStages.map((stage, index) => (
              <li key={`${stage.purpose}-${index}`} className={styles.pour}>
                <span className={styles.pourIndex}>{index + 1}</span>
                <span className={styles.pourPurpose}>{humanize(stage.purpose)}</span>
                <span className={styles.pourAmount}>{stage.waterMl} ml</span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <Method text={details.preparation} />
    </div>
  )
}

function CocktailBody({ details }: { details: CocktailDetails }) {
  const serve = joinFacts([
    details.glassware,
    formatIce(details.ice),
    details.garnish?.length ? details.garnish.join(', ') : null,
  ])

  return (
    <div className={styles.bodyStack}>
      {details.ingredients?.length ? (
        <section className={styles.section}>
          <h3 className="ui-kicker">Ingredients</h3>
          <ul className={styles.recipeList}>
            {details.ingredients.map((ingredient) => {
              const amount = formatAmount(ingredient)
              return (
                <li key={ingredient.name} className={styles.recipeRow}>
                  <span className={styles.recipeAmount}>
                    {amount ?? (ingredient.optional ? 'to taste' : '')}
                  </span>
                  <span className={styles.recipeName}>
                    {ingredient.name}
                    {ingredient.optional ? (
                      <span className={styles.optional}> optional</span>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {serve ? (
        <FactList>
          <FactRow label="Glass" value={details.glassware} />
          <FactRow label="Ice" value={formatIce(details.ice)} />
          <FactRow
            label="Garnish"
            value={details.garnish?.length ? details.garnish.join(', ') : null}
          />
        </FactList>
      ) : null}

      <Method text={details.preparation} />
    </div>
  )
}

function WineBody({ details }: { details: WineDetails }) {
  const place = joinFacts([
    details.country,
    details.region,
    details.subregion,
    details.appellation,
    details.classification,
  ])
  const producer = joinFacts([details.producer, details.cuvee])
  const grapes = details.grapeVarieties?.length
    ? details.grapeVarieties.join(', ')
    : null
  const vintages = details.preferredVintages?.length
    ? details.preferredVintages.join(', ')
    : details.vintage != null
      ? String(details.vintage)
      : null
  const serve = formatTempRange(details.servingTemperatureC)
  const ice = formatIce(details.ice, details.iceCubes)

  return (
    <div className={styles.bodyStack}>
      <FactList>
        <FactRow label="Place" value={place} />
        <FactRow label="Producer" value={producer} />
        <FactRow label="Grapes" value={grapes} />
        <FactRow label="Vintages" value={vintages} />
        <FactRow label="Serve" value={serve} />
        <FactRow label="Ice" value={ice} />
      </FactList>

      {details.decanting ? (
        <section className={styles.section}>
          <h3 className="ui-kicker">Decant</h3>
          <p className={styles.prose}>{details.decanting}</p>
        </section>
      ) : null}

      <Method text={details.preparation} />
    </div>
  )
}

function SpiritBody({ details }: { details: SpiritDetails }) {
  return (
    <div className={styles.bodyStack}>
      <FactList>
        <FactRow label="Brand" value={details.brand} />
        <FactRow
          label="Category"
          value={details.category ? humanize(details.category) : null}
        />
        <FactRow
          label="Origin"
          value={joinFacts([details.country, details.region])}
        />
        <FactRow
          label="Age"
          value={details.ageYears != null ? `${details.ageYears} years` : null}
        />
        <FactRow
          label="Serve"
          value={
            details.servingStyle ? humanize(details.servingStyle) : null
          }
        />
        <FactRow label="Ice" value={formatIce(details.ice, details.iceCubes)} />
      </FactList>

      <Method text={details.preparation} />
    </div>
  )
}

function NonAlcoholicBody({ details }: { details: NonAlcoholicDetails }) {
  return (
    <div className={styles.bodyStack}>
      <FactList>
        <FactRow label="Brand" value={details.brand} />
        <FactRow
          label="Category"
          value={details.category ? humanize(details.category) : null}
        />
        <FactRow
          label="Flavor"
          value={details.flavor ? humanize(details.flavor) : null}
        />
        <FactRow label="Serve" value={details.servingTemperature} />
        <FactRow label="Ice" value={formatIce(details.ice)} />
        <FactRow
          label="Garnish"
          value={details.garnish?.length ? details.garnish.join(', ') : null}
        />
      </FactList>

      <Method text={details.preparation} />
    </div>
  )
}
