import type { Ref } from 'vue'

/** A page's clock (issue #1364). */
export interface TinkerfundClock {
  /** The page's "now": Campaign and Promotion states hold still at it. */
  now: number
  /** What countdowns count from: `now`, moving on once a minute unless the Space pins its clock (`qa`). */
  countdown: number
}

/**
 * The Space's "now" (issue #1364): read once on the server and carried to the
 * client in the payload, as the Atlas's `useGlassToday` does, so hydration
 * agrees. Each later client navigation, and `refresh`, reads it afresh.
 */
export async function useTinkerfundClock(): Promise<{ now: Ref<number>; clock: Ref<TinkerfundClock>; refresh: () => void }> {
  const nuxtApp = useNuxtApp()
  const { space } = useTinkerfundSpace()
  const now = useState<number | null>(`tinkerfund-now-${space}`, () => null)
  const moved = ref(0)
  let ticking = false
  let timer: ReturnType<typeof setInterval> | undefined
  // Registered before the first await, while the component is still current.
  onMounted(() => {
    if (ticking) timer = setInterval(() => (moved.value = Date.now()), 60_000)
  })
  onUnmounted(() => clearInterval(timer))

  const { shop } = await useTinkerfundShop()
  const pinned = shop.value?.now ?? undefined
  ticking = !pinned
  const refresh = () => {
    now.value = tinkerfundNow(pinned, Date.now())
  }
  if (now.value === null || (import.meta.client && !nuxtApp.isHydrating)) refresh()
  const clock = computed(() => ({ now: now.value!, countdown: Math.max(now.value!, moved.value) }))
  return { now: now as Ref<number>, clock, refresh }
}
