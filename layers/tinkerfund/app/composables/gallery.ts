import type { TinkerfundBacking } from './cart'
import type { TinkerfundShop } from '../utils/cart'
import { TINKERFUND_GALLERY_FIXTURE as FIXTURE } from '../utils/gallery'
import type { CampaignState } from '../utils/status'

export async function useTinkerfundGallery() {
  // Every composable runs before the first await: after it, Nuxt's context is gone.
  const { space, collections } = useTinkerfundSpace()
  const ready = Promise.all([useTinkerfundCatalog(), useTinkerfundShop()])
  const extraData = useAsyncData(`tinkerfund-gallery-extra-${space}`, async () => {
    const [threads, logs, inventors] = await Promise.all([
      queryCollection(collections.comments).all(),
      queryCollection(collections.updates).all(),
      queryCollection(collections.inventors).all(),
    ])
    return { threads, logs, inventors }
  })
  const [[catalog, { zoneName }], { data: extra }] = await Promise.all([ready, extraData])
  const { clock, promotions, baked } = catalog
  const now = computed(() => clock.value.now)

  const campaigns = computed(() =>
    catalog.docs.value
      .flatMap((doc) => {
        if (!doc.campaign) return []
        const slug = tinkerfundSlug(doc.path)
        return [{
          ...doc,
          slug,
          campaign: doc.campaign,
          state: deriveCampaignState(doc.campaign, now.value),
          deals: tinkerfundCampaignDeals(promotions.value, slug, now.value),
        }]
      })
      .sort((a, b) => a.campaign.registry.localeCompare(b.campaign.registry)),
  )
  const backing = (slug: string, state: CampaignState, refusals: Record<string, string> = {}): TinkerfundBacking =>
    ({ slug, state, refusals, add: () => {} })

  const specimenShop = computed<TinkerfundShop>(() => ({
    catalog: Object.fromEntries(campaigns.value.map((doc) => [doc.slug, { title: doc.title, campaign: doc.campaign }])),
    baked: baked.value,
    promotions: promotions.value,
    payment: FIXTURE.payment,
    now: now.value,
  }))

  // A Cart that hits every notice at once.
  const cart = computed(() => resolveTinkerfundCart(
    { cart: [
      { campaign: FIXTURE.lamp.slug, lines: [{ reward: FIXTURE.lamp.reward, options: { colour: 'white' }, quantity: 1 }], addons: [{ id: FIXTURE.lamp.addon, quantity: 1 }], bonus: 3 },
      { campaign: FIXTURE.stapler.slug, lines: FIXTURE.stapler.rewards.map((reward, i) => ({ reward, options: {}, quantity: i + 1 })), addons: [{ id: FIXTURE.stapler.addon, quantity: 3 }] },
      { campaign: FIXTURE.hammock.slug, lines: [{ reward: FIXTURE.hammock.reward, options: {}, quantity: 1 }], addons: [] },
      { campaign: FIXTURE.workbench, lines: [], addons: [], bonus: 25 },
    ], pledges: [] },
    specimenShop.value,
    FIXTURE.zone,
  ))
  const quote = computed(() => quoteTinkerfundCheckout(cart.value, specimenShop.value, FIXTURE.code))
  const receipt = computed(() => {
    const stapler = specimenShop.value.catalog[FIXTURE.stapler.slug]
    return stapler && tinkerfundReceipt(
      { ref: FIXTURE.receipt, campaign: FIXTURE.stapler.slug, placed: now.value, zone: FIXTURE.zone, payment: FIXTURE.payment, lines: [{ reward: FIXTURE.stapler.rewards[1], options: {}, quantity: 2 }], addons: [{ id: FIXTURE.stapler.addon, quantity: 3 }], bonus: 5, promotions: [], discount: 10.6, shipping: 8 },
      stapler,
    )
  })

  // qa's baked Pledges in every state they reach, plus the Lamp's cancelled.
  const account = computed(() => {
    const { pledges } = reduceTinkerfundActions([], specimenShop.value)
    const lamp = pledges.find((p) => p.campaign === FIXTURE.lamp.slug)
    const cancelled = lamp ? [{ ...lamp, ref: FIXTURE.cancelled, cancelled: now.value }] : []
    const rows = tinkerfundAccountPledges({ cart: [], pledges: [...pledges, ...cancelled] }, specimenShop.value)
    return { rows, lamp, entry: specimenShop.value.catalog[FIXTURE.lamp.slug] }
  })

  return {
    ...catalog,
    zoneName,
    now,
    campaigns,
    backing,
    cart,
    quote,
    receipt,
    account,
    thread: computed(() => {
      const thread = extra.value?.threads[0]
      return thread && { ...thread, inventor: campaigns.value.find((c) => c.slug === thread.campaign)?.campaign.inventor }
    }),
    log: computed(() => extra.value?.logs[0]),
    inventors: computed(() => extra.value?.inventors ?? []),
  }
}
