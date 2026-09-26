import type { Ref } from 'vue'

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

export function useTinkerfundCategories(): Ref<{ slug: string; name: string }[]> {
  const { space, collections } = useSpace('tinkerfund')
  const { data } = useAsyncData(`tinkerfund-categories-${space}`, () =>
    queryCollection(collections.categories).order('order', 'ASC').all(),
  )
  return computed(() => (data.value ?? []).map((c) => ({ slug: c.stem, name: c.name })))
}
