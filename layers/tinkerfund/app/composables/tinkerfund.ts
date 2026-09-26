import type { Ref } from 'vue'
import type { TinkerfundCartRequest } from '../types/tinkerfund'

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

/** The Cart story (#1383) fills this in. */
export function useTinkerfundAddToCart(): (request: TinkerfundCartRequest) => void {
  return () => {}
}

export function useTinkerfundCategories(): Ref<{ slug: string; name: string }[]> {
  const { space, collections } = useSpace('tinkerfund')
  const { data } = useAsyncData(`tinkerfund-categories-${space}`, () =>
    queryCollection(collections.categories).order('order', 'ASC').all(),
  )
  return computed(() => (data.value ?? []).map((c) => ({ slug: c.stem, name: c.name })))
}
