import type { Ref } from 'vue'
import type { TinkerfundPledgeChange } from '../utils/account'
import type { TinkerfundAction, TinkerfundUntimedAction } from '../utils/backer'
import type { TinkerfundListing } from '../utils/browse'
import type { TinkerfundCartRequest, TinkerfundShop, TinkerfundStep, TinkerfundZone } from '../utils/cart'
import type { TinkerfundHit } from '../utils/search'

/** The Space's `shop` document, and its zones' and payment methods' names. */
export async function useTinkerfundShop() {
  const { space, collections } = useSpace('tinkerfund')
  const { data: shop, status, error } = await useAsyncData(`tinkerfund-shop-${space}`, () => queryCollection(collections.shop).first())
  return {
    shop,
    status,
    error,
    zoneName: (id: string | undefined) => shop.value?.zones.find((z) => z.id === id)?.name ?? id ?? '',
    paymentLabel: (id: string | undefined) => shop.value?.payments.find((p) => p.id === id)?.label ?? id ?? '',
  }
}

/**
 * The Space's "now" (issue #1364): read once on the server and carried to the
 * client in the payload, as the Atlas's `useGlassToday` does, so hydration
 * agrees. Each later client navigation, and `refresh`, reads it afresh.
 * `ticking` is false when the Space pins its clock (`qa`), so countdowns stay
 * frozen there.
 */
export async function useTinkerfundClock(): Promise<{ now: Ref<number>; ticking: boolean; refresh: () => void }> {
  const nuxtApp = useNuxtApp()
  const { space } = useSpace('tinkerfund')
  const now = useState<number | null>(`tinkerfund-now-${space}`, () => null)
  const { shop } = await useTinkerfundShop()
  const pinned = shop.value?.now ?? undefined
  const refresh = () => {
    now.value = tinkerfundNow(pinned, Date.now())
  }
  if (now.value === null || (import.meta.client && !nuxtApp.isHydrating)) refresh()
  return { now: now as Ref<number>, ticking: !pinned, refresh }
}

/** Money follows the visitor's locale (issue #1365). */
export function useTinkerfundMoney(): (amount: number) => string {
  const locale = useTinkerfundLocale()
  return (amount) => formatTinkerfundMoney(amount, locale.value)
}

export type TinkerfundCard = TinkerfundListing & { categoryName: string; inventorName: string }

/**
 * Every Campaign in the Space as a card or table row, plus the categories and
 * Promotions that browsing needs (story #1381). Totals count the Backer's
 * Pledges once mounted (issue #1364). `clock` starts at the page's "now" and,
 * in `prod`, moves once a minute so countdowns follow.
 */
export async function useTinkerfundCatalog() {
  // Every composable runs before the first await: after it, Nuxt's context is gone.
  const { space, pagesKey, collections } = useSpace('tinkerfund')
  const categories = useTinkerfundCategories()
  const cartReady = useTinkerfundCart()
  const catalog = useAsyncData(`tinkerfund-catalog-${space}`, async () => {
    const [docs, inventors] = await Promise.all([
      queryCollection(pagesKey).where('campaign', 'IS NOT NULL').select('path', 'title', 'description', 'campaign').all(),
      queryCollection(collections.inventors).select('stem', 'name').all(),
    ])
    return { docs, inventors }
  })
  const clock = ref(0)
  let ticking = false
  let timer: ReturnType<typeof setInterval> | undefined
  onMounted(() => {
    if (ticking) timer = setInterval(() => (clock.value = Date.now()), 60_000)
  })
  onUnmounted(() => clearInterval(timer))

  const [{ data }, { now, ticking: ticks, pledges, baked, promotions: terms }] = await Promise.all([catalog, cartReady])
  clock.value = now.value
  ticking = ticks

  const promotions = computed(() => terms.value.map((p) => ({ ...p, slug: p.id })))
  const cards = computed<TinkerfundCard[]>(() => {
    const docs = (data.value?.docs ?? []).flatMap((d) => d.campaign
      ? [{ ...d, campaign: withTinkerfundPledges(tinkerfundSlug(d.path), d.campaign, pledges.value, baked.value) }]
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
 * The demo Backer in this Space (issue #1359): their stored actions, replayed
 * over the baked shop into a Cart, Pledges and totals. Empty on the server and
 * on the first client render, then read from sessionStorage after mount, so
 * hydration always agrees. An action is taken at a freshly read "now"; one
 * the rules refuse is not stored, and answers why. The Cart ships to the
 * `chosen` zone, else to the demo Backer's own address.
 */
export async function useTinkerfundCart(chosen: Readonly<Ref<TinkerfundZone | undefined>> = ref()) {
  const { space, pagesKey, collections } = useSpace('tinkerfund')
  const actions = useState<TinkerfundAction[]>(`tinkerfund-actions-${space}`, () => [])
  const loaded = useState(`tinkerfund-actions-loaded-${space}`, () => false)

  // Registered before the first await, while the component is still current.
  onMounted(() => {
    if (loaded.value) return
    try {
      actions.value = readTinkerfundActions(sessionStorage, space)
    } catch {
      // Storage blocked: the actions last until the next page load.
    }
    loaded.value = true
  })

  const clockReady = useTinkerfundClock()
  const shopReady = useTinkerfundShop()
  const catalogData = useAsyncData(
    `tinkerfund-cart-catalog-${space}`,
    () => queryCollection(pagesKey).where('campaign', 'IS NOT NULL').select('path', 'title', 'campaign').all(),
    {
      // Every page's payload carries this, so it keeps what the Backer's steps read and drops the figures.
      transform: (docs) =>
        Object.fromEntries(docs.flatMap(({ path, title, campaign: c }) => c
          ? [[tinkerfundSlug(path), { title, campaign: { launch: c.launch, end: c.end, goal: c.goal, pledged: c.pledged, backers: c.backers, rewards: c.rewards, addons: c.addons, shipping: c.shipping } }]]
          : [])),
    },
  )
  const backerData = useAsyncData(`tinkerfund-backer-${space}`, () => queryCollection(collections.backer).first())
  const promotionsData = useAsyncData(`tinkerfund-promotions-${space}`, () => queryCollection(collections.promotions).all())
  const [{ now, ticking, refresh }, { shop: shopDoc }, { data: baseline }, { data: backer }, { data: promotionDocs }] =
    await Promise.all([clockReady, shopReady, catalogData, backerData, promotionsData])

  const promotions = computed(() => (promotionDocs.value ?? []).map((p) => ({ ...p, id: p.stem })))
  const baked = computed(() => backer.value?.pledges ?? [])
  const shop = computed<TinkerfundShop>(() => ({
    catalog: baseline.value ?? {},
    baked: baked.value,
    promotions: promotions.value,
    payment: shopDoc.value?.payments[0]?.id ?? '',
    now: now.value,
  }))
  const state = computed(() => reduceTinkerfundActions(actions.value, shop.value))
  const pledges = computed(() => state.value.pledges)
  const catalog = computed(() => tinkerfundCountedCatalog(shop.value, pledges.value))
  const zone = computed(() => chosen.value ?? backer.value?.address.zone ?? 'domestic')
  const view = computed(() => resolveTinkerfundCart(state.value, shop.value, zone.value))
  const account = computed(() => tinkerfundAccountPledges(state.value, shop.value))
  const quote = (code: string | undefined) => quoteTinkerfundCheckout(view.value, shop.value, code)

  /** What `action` would do now, without taking it. */
  const preview = (action: TinkerfundUntimedAction): TinkerfundStep =>
    applyTinkerfundAction(state.value, { ...action, at: now.value }, shop.value)

  function act(action: TinkerfundUntimedAction): TinkerfundStep {
    refresh()
    const taken: TinkerfundAction = { ...action, at: now.value }
    const step = applyTinkerfundAction(state.value, taken, shop.value)
    if (step.error) return step
    actions.value = [...actions.value, taken]
    try {
      writeTinkerfundActions(sessionStorage, space, actions.value)
    } catch {
      // Storage blocked: the actions last until the next page load.
    }
    return step
  }

  const change = (request: TinkerfundCartRequest) => act({ type: 'cart', request }).error
  const place = (choices: { zone: TinkerfundZone; payment: string; code?: string }) => {
    const { refs, error } = act({ type: 'place', ...choices })
    return { refs, error }
  }
  const revise = (ref: string, change: TinkerfundPledgeChange) => act({ type: 'change', ref, change }).error
  const cancel = (ref: string) => act({ type: 'cancel', ref }).error

  return { loaded, zone, view, quote, account, change, place, revise, cancel, preview, pledges, baked, catalog, promotions, backer, now, ticking }
}

export function useTinkerfundCategories() {
  const { space, collections } = useSpace('tinkerfund')
  const { data } = useAsyncData(`tinkerfund-categories-${space}`, () =>
    queryCollection(collections.categories).order('order', 'ASC').all(),
  )
  return computed(() => (data.value ?? []).map((c) => ({ slug: c.stem, name: c.name, blurb: c.blurb, icon: c.icon })))
}

/**
 * Searches this Space's Campaigns by title, description and Inventor name
 * (story #1382). The keys come from the route, so a search never leaves its
 * Space; the query runs in the browser once hydrated (issue #1370).
 */
export function useTinkerfundSearch() {
  const { pagesKey, collections } = useSpace('tinkerfund')
  return async (raw: string, limit?: number): Promise<TinkerfundHit[]> => {
    const term = tinkerfundSearchTerm(raw)
    if (!term) return []
    const like = `%${term}%`
    const inventors = await queryCollection(collections.inventors).where('name', 'LIKE', like).select('stem').all()
    const hits = await queryCollection(pagesKey)
      .where('campaign', 'IS NOT NULL')
      .orWhere((q) => {
        q.where('title', 'LIKE', like).where('description', 'LIKE', like)
        // Frontmatter is stored as JSON text, and a stem is a validated slug.
        for (const { stem } of inventors) q.where('campaign', 'LIKE', `%"inventor":"${stem}"%`)
        return q
      })
      .select('path', 'title', 'description')
      .all()
    return rankTinkerfundHits(hits, term).slice(0, limit)
  }
}
