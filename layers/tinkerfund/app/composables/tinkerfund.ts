import type { Ref } from 'vue'
import type { TinkerfundCartRequest } from '../types/tinkerfund'
import type { TinkerfundCartCatalog, TinkerfundZone } from '../utils/cart'

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

/** Money and dates follow the visitor's locale (issue #1365); the server reads
 *  it from the request and hands it to the client, so hydration agrees. */
export function useTinkerfundLocale(): Ref<string> {
  const header = import.meta.server ? useRequestHeaders(['accept-language'])['accept-language'] : undefined
  return useState('tinkerfund-locale', () => tinkerfundLocale(import.meta.server ? header : navigator.language))
}

/**
 * The visitor's Cart in this Space (issue #1359): empty on the server and on
 * the first client render, then read from sessionStorage after mount, so
 * hydration always agrees. `change` answers why it refused, if it did.
 */
export async function useTinkerfundCart(zone: Ref<TinkerfundZone> = ref('domestic')) {
  const { space, pagesKey } = useSpace('tinkerfund')
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
      transform: (docs): TinkerfundCartCatalog =>
        Object.fromEntries(docs.flatMap(({ path, title, campaign: c }) => c
          ? [[path.split('/').pop()!, { title, campaign: { launch: c.launch, end: c.end, rewards: c.rewards, addons: c.addons, shipping: c.shipping } }]]
          : [])),
    },
  )
  const [{ now }, { data: catalog }] = await Promise.all([clock, catalogData])

  function change(request: TinkerfundCartRequest): string | undefined {
    const { cart, error } = addToTinkerfundCart(overlay.value.cart, request, catalog.value ?? {}, now.value)
    if (error) return error
    overlay.value = { ...overlay.value, cart }
    try {
      writeTinkerfundOverlay(sessionStorage, space, overlay.value)
    } catch {
      // As above.
    }
  }

  const view = computed(() => resolveTinkerfundCart(overlay.value.cart, catalog.value ?? {}, now.value, zone.value))
  return { loaded, view, change, now }
}

export function useTinkerfundCategories(): Ref<{ slug: string; name: string }[]> {
  const { space, collections } = useSpace('tinkerfund')
  const { data } = useAsyncData(`tinkerfund-categories-${space}`, () =>
    queryCollection(collections.categories).order('order', 'ASC').all(),
  )
  return computed(() => (data.value ?? []).map((c) => ({ slug: c.stem, name: c.name })))
}
