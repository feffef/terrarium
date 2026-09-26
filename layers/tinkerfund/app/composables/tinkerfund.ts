import type { Ref } from 'vue'
import type { TinkerfundCartRequest } from '../types/tinkerfund'
import type { TinkerfundListing } from '../utils/browse'
import type { TinkerfundCartCatalog, TinkerfundOverlay, TinkerfundZone } from '../utils/cart'
import type { TinkerfundBakedPledge, TinkerfundPlaceInput } from '../utils/checkout'

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
 * Promotions that browsing needs (story #1381). Totals count the visitor's
 * Pledges once mounted (issue #1364). `clock` starts at the page's "now" and,
 * in `prod`, moves once a minute so countdowns follow.
 */
export async function useTinkerfundCatalog() {
  // Every composable runs before the first await: after it, Nuxt's context is gone.
  const { space, pagesKey, collections } = useSpace('tinkerfund')
  const clockReady = useTinkerfundClock()
  const cartReady = useTinkerfundCart()
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

  const [{ now, ticking: ticks }, { data }, { pledges, baked }] = await Promise.all([clockReady, catalog, cartReady])
  clock.value = now.value
  ticking = ticks

  const promotions = computed(() => (data.value?.promotions ?? []).map((p) => ({ ...p, slug: p.stem })))
  const categories = computed(() =>
    (data.value?.categories ?? []).map((c) => ({ slug: c.stem, name: c.name, blurb: c.blurb, icon: c.icon })),
  )
  const cards = computed<TinkerfundCard[]>(() => {
    const docs = (data.value?.docs ?? []).flatMap((d) => d.campaign
      ? [{ ...d, campaign: withTinkerfundPledges(d.path.split('/').pop()!, d.campaign, pledges.value, baked.value) }]
      : [])
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

/** Money and dates follow the visitor's locale (issue #1365); the server reads
 *  it from the request and hands it to the client, so hydration agrees. */
export function useTinkerfundLocale(): Ref<string> {
  const header = import.meta.server ? useRequestHeaders(['accept-language'])['accept-language'] : undefined
  return useState('tinkerfund-locale', () => tinkerfundLocale(import.meta.server ? header : navigator.language))
}

/**
 * The visitor's Cart and Pledges in this Space (issue #1359): empty on the
 * server and on the first client render, then read from sessionStorage after
 * mount, so hydration always agrees. `change` answers why it refused, if it
 * did; `catalog` counts the visitor's Pledges into totals and stock.
 */
export async function useTinkerfundCart(zone: Ref<TinkerfundZone> = ref('domestic')) {
  const { space, pagesKey, collections } = useSpace('tinkerfund')
  const overlay = useState(`tinkerfund-overlay-${space}`, emptyTinkerfundOverlay)
  const loaded = useState(`tinkerfund-overlay-loaded-${space}`, () => false)

  // Registered before the first await, while the component is still current.
  onMounted(() => {
    if (loaded.value) return
    try {
      overlay.value = readTinkerfundOverlay(sessionStorage, space)
    } catch {
      // Storage blocked: the Cart lasts until the next page load.
    }
    loaded.value = true
  })

  const clock = useTinkerfundClock()
  const catalogData = useAsyncData(
    `tinkerfund-cart-catalog-${space}`,
    () => queryCollection(pagesKey).where('campaign', 'IS NOT NULL').select('path', 'title', 'campaign').all(),
    {
      // The Cart needs prices and limits, not figures, in every page's payload.
      transform: (docs) =>
        Object.fromEntries(docs.flatMap(({ path, title, campaign: c }) => c
          ? [[path.split('/').pop()!, { title, campaign: { launch: c.launch, end: c.end, pledged: c.pledged, backers: c.backers, rewards: c.rewards, addons: c.addons, shipping: c.shipping } }]]
          : [])),
    },
  )
  const bakedData = useAsyncData(`tinkerfund-backer-pledges-${space}`, async () =>
    (await queryCollection(collections.backer).first())?.pledges ?? [])
  const [{ now }, { data: baseline }, { data: bakedPledges }] = await Promise.all([clock, catalogData, bakedData])

  const pledges = computed(() => overlay.value.pledges)
  const baked = computed<TinkerfundBakedPledge[]>(() => bakedPledges.value ?? [])
  const catalog = computed<TinkerfundCartCatalog>(() =>
    Object.fromEntries(Object.entries(baseline.value ?? {}).map(([slug, entry]) =>
      [slug, { ...entry, campaign: withTinkerfundPledges(slug, entry.campaign, pledges.value, baked.value) }])))

  function save(next: TinkerfundOverlay) {
    overlay.value = next
    try {
      writeTinkerfundOverlay(sessionStorage, space, next)
    } catch {
      // As above.
    }
  }

  function change(request: TinkerfundCartRequest): string | undefined {
    const { cart, error } = addToTinkerfundCart(overlay.value.cart, request, catalog.value, now.value)
    if (error) return error
    save({ ...overlay.value, cart })
  }

  /** Confirms the quoted checkout; answers the new Pledges' refs, or why not. */
  function place(input: Omit<TinkerfundPlaceInput, 'overlay' | 'catalog' | 'baked' | 'now'>): { refs?: string[]; error?: string } {
    const { overlay: next, refs, error } = placeTinkerfundPledges({ ...input, overlay: overlay.value, catalog: catalog.value, baked: baked.value, now: now.value })
    if (next) save(next)
    return { refs, error }
  }

  const view = computed(() => resolveTinkerfundCart(overlay.value.cart, catalog.value, now.value, zone.value))
  return { loaded, view, change, place, pledges, baked, catalog, now }
}

export function useTinkerfundCategories(): Ref<{ slug: string; name: string }[]> {
  const { space, collections } = useSpace('tinkerfund')
  const { data } = useAsyncData(`tinkerfund-categories-${space}`, () =>
    queryCollection(collections.categories).order('order', 'ASC').all(),
  )
  return computed(() => (data.value ?? []).map((c) => ({ slug: c.stem, name: c.name })))
}
