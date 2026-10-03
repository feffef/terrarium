import type { TinkerfundListing } from '../utils/browse'

export type TinkerfundCard = TinkerfundListing & { categoryName: string; inventorName: string }

/**
 * Every Campaign in the Space as a card or table row, plus the categories and
 * Promotions that browsing needs (story #1381). Totals count the Backer's
 * Pledges once mounted (issue #1364).
 */
export async function useTinkerfundCatalog() {
  // Every composable runs before the first await: after it, Nuxt's context is gone.
  const { space, pagesKey, collections } = useTinkerfundSpace()
  const categories = useTinkerfundCategories()
  const cartReady = useTinkerfundCart()
  const catalog = useAsyncData(`tinkerfund-catalog-${space}`, async () => {
    const [docs, inventors] = await Promise.all([
      queryCollection(pagesKey).where('campaign', 'IS NOT NULL').select('path', 'title', 'description', 'campaign').all(),
      queryCollection(collections.inventors).select('stem', 'name').all(),
    ])
    return { docs, inventors }
  }, {
    // Most pages' payloads carry this, so it keeps what a card reads (ADR-0028).
    transform: ({ docs, inventors }) => ({
      docs: docs.flatMap(({ campaign, ...doc }) => campaign ? [{ ...doc, campaign: tinkerfundBrowseCampaign(campaign) }] : []),
      inventors,
    }),
  })
  const [{ data }, { clock, pledges, baked, promotions }] = await Promise.all([catalog, cartReady])

  const cards = computed<TinkerfundCard[]>(() => {
    const withPledges = (data.value?.docs ?? []).map((d) =>
      ({ ...d, campaign: withTinkerfundPledges(tinkerfundSlug(d.path), d.campaign, pledges.value, baked.value) }))
    const inventors = new Map((data.value?.inventors ?? []).map((i) => [i.stem, i.name]))
    const categoryNames = new Map(categories.value.map((c) => [c.slug, c.name]))
    return tinkerfundListings(withPledges, promotions.value, clock.value.now).map((l) => ({
      ...l,
      categoryName: categoryNames.get(l.category) ?? l.category,
      inventorName: inventors.get(l.inventor) ?? l.inventor,
    }))
  })

  return { clock, cards, categories, promotions, baked }
}

export function useTinkerfundCategories() {
  const { space, collections } = useTinkerfundSpace()
  const { data } = useAsyncData(`tinkerfund-categories-${space}`, () =>
    queryCollection(collections.categories).order('order', 'ASC').all(),
  )
  return computed(() => (data.value ?? []).map((c) => ({ slug: c.stem, name: c.name, blurb: c.blurb, icon: c.icon })))
}
