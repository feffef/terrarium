import type { Ref } from 'vue'
import type { TinkerfundAction, TinkerfundUntimedAction } from '../utils/backer'
import type { TinkerfundCartRequest, TinkerfundPledgeContents, TinkerfundShop, TinkerfundStep, TinkerfundZone } from '../utils/cart'
import type { CampaignState } from '../utils/status'

/** What a Campaign's Reward, Add-on and bonus-support controls share. */
export interface TinkerfundBacking {
  slug: string
  state: CampaignState
  /** Why the Cart turned the last add away, keyed `reward:<id>`, `addon:<id>` or `bonus`. */
  refusals: Record<string, string>
  add: (request: TinkerfundCartRequest) => void
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
  const { space, pagesKey, collections } = useTinkerfundSpace()
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
        Object.fromEntries(docs.flatMap(({ path, title, campaign }) => campaign
          ? [[tinkerfundSlug(path), { title, campaign: tinkerfundCatalogCampaign(campaign) }]]
          : [])),
    },
  )
  const backerData = useAsyncData(`tinkerfund-backer-${space}`, () => queryCollection(collections.backer).first())
  const promotionsData = useAsyncData(`tinkerfund-promotions-${space}`, () => queryCollection(collections.promotions).all())
  const [{ now, clock, refresh }, { shop: shopDoc }, { data: baseline }, { data: backer }, { data: promotionDocs }] =
    await Promise.all([clockReady, shopReady, catalogData, backerData, promotionsData])

  const promotions = computed(() => promotionDocs.value ?? [])
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
  const revise = (ref: string, change: TinkerfundPledgeContents) => act({ type: 'change', ref, change }).error
  const cancel = (ref: string) => act({ type: 'cancel', ref }).error

  return { loaded, zone, view, quote, account, change, place, revise, cancel, preview, pledges, baked, catalog, promotions, backer, clock }
}
