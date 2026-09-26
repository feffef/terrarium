import type { Ref } from 'vue'
import type { TinkerfundListing } from '../utils/browse'

/**
 * The Space's "now" (issue #1364): read once on the server and carried to the
 * client in the payload, as the Atlas's `useGlassToday` does, so hydration
 * agrees. Each later client navigation reads it afresh. `ticking` is false
 * when the Space pins its clock (`qa`), so countdowns stay frozen there.
 */
export async function useTinkerfundClock(): Promise<{ now: Ref<number>; ticking: boolean }> {
  const nuxtApp = useNuxtApp()
  const { space, collections } = useSpace('tinkerfund')
  const now = useState<number | null>(`tinkerfund-now-${space}`, () => null)
  const { data: shop } = await useAsyncData(`tinkerfund-shop-${space}`, () => queryCollection(collections.shop).first())
  const pinned = shop.value?.now ?? undefined
  if (now.value === null || (import.meta.client && !nuxtApp.isHydrating)) now.value = tinkerfundNow(pinned, Date.now())
  return { now: now as Ref<number>, ticking: !pinned }
}

export type TinkerfundCard = TinkerfundListing & { categoryName: string; inventorName: string }

/**
 * Every Campaign in the Space as a card or table row, plus the categories and
 * Promotions that browsing needs (story #1381). `clock` starts at the page's
 * "now" and, in `prod`, moves once a minute so countdowns follow (issue #1364).
 */
export async function useTinkerfundCatalog() {
  // Every composable runs before the first await: after it, Nuxt's context is gone.
  const { space, pagesKey, collections } = useSpace('tinkerfund')
  const clockReady = useTinkerfundClock()
  const catalog = useAsyncData(`tinkerfund-catalog-${space}`, async () => {
    const [docs, promotions, categories, inventors] = await Promise.all([
      queryCollection(pagesKey).where('campaign', 'IS NOT NULL').select('path', 'title', 'description', 'campaign').all(),
      queryCollection(collections.promotions).all(),
      queryCollection(collections.categories).order('order', 'ASC').all(),
      queryCollection(collections.inventors).select('stem', 'name').all(),
    ])
    return { docs, promotions, categories, inventors }
  })
  const clock = ref(0)
  let ticking = false
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    if (ticking) timer = setInterval(() => (clock.value = Date.now()), 60_000)
  })
  onUnmounted(() => clearInterval(timer))

  const [{ now, ticking: ticks }, { data }] = await Promise.all([clockReady, catalog])
  clock.value = now.value
  ticking = ticks

  const promotions = computed(() => (data.value?.promotions ?? []).map((p) => ({ ...p, slug: p.stem })))
  const categories = computed(() =>
    (data.value?.categories ?? []).map((c) => ({ slug: c.stem, name: c.name, blurb: c.blurb, icon: c.icon })),
  )
  const cards = computed<TinkerfundCard[]>(() => {
    const docs = (data.value?.docs ?? []).flatMap((d) => (d.campaign ? [{ ...d, campaign: d.campaign }] : []))
    const inventors = new Map((data.value?.inventors ?? []).map((i) => [i.stem, i.name]))
    const categoryNames = new Map(categories.value.map((c) => [c.slug, c.name]))
    return tinkerfundListings(docs, promotions.value, now.value).map((l) => ({
      ...l,
      categoryName: categoryNames.get(l.category) ?? l.category,
      inventorName: inventors.get(l.inventor) ?? l.inventor,
    }))
  })

  return { space, now, clock, cards, categories, promotions }
}

export function useTinkerfundCategories(): Ref<{ slug: string; name: string }[]> {
  const { space, collections } = useSpace('tinkerfund')
  const { data } = useAsyncData(`tinkerfund-categories-${space}`, () =>
    queryCollection(collections.categories).order('order', 'ASC').all(),
  )
  return computed(() => (data.value ?? []).map((c) => ({ slug: c.stem, name: c.name })))
}
