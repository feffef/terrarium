// Bundle Promotions (issue #1389): which Campaigns in a checkout count, what
// each Pledge earns, and that a Pledge keeps it whatever its siblings do.
import { describe, expect, it } from 'vitest'
import type { TinkerfundAction } from '../../app/utils/backer.ts'
import { reduceTinkerfundActions } from '../../app/utils/backer.ts'
import { tinkerfundCampaignDeals } from '../../app/utils/campaign.ts'
import type { TinkerfundPromotionTerms } from '../../app/utils/campaign.ts'
import { resolveTinkerfundCart } from '../../app/utils/cart.ts'
import type { TinkerfundDraft, TinkerfundPledge } from '../../app/utils/cart.ts'
import { quoteTinkerfundCheckout, tinkerfundBundleNote, tinkerfundBundleNudge } from '../../app/utils/checkout.ts'
import { catalog, HOUR, NOW, pledge, promotion, shop } from './support.ts'

const any2 = promotion({ title: 'Any two', discount: { percent: 10 }, bundle: { min: 2 } })
const pair = promotion({ title: 'Lamp and kettle', discount: { percent: 10 }, bundle: { min: 2, campaigns: ['lamp', 'kettle'] } })
const lamp: TinkerfundDraft = { campaign: 'lamp', lines: [{ reward: 'lamp', options: { colour: 'black' }, quantity: 2 }], addons: [{ id: 'bulb', quantity: 1 }], bonus: 6 }
const mug: TinkerfundDraft = { campaign: 'mug', lines: [{ reward: 'mug', options: {}, quantity: 1 }], addons: [] }

function quote(cart: TinkerfundDraft[], promotions: TinkerfundPromotionTerms[], pledges: TinkerfundPledge[] = []) {
  const at = shop({ promotions })
  const view = resolveTinkerfundCart({ cart, pledges }, at, 'domestic')
  return { view, quote: quoteTinkerfundCheckout(view, at, undefined) }
}

describe('a bundle at checkout', () => {
  it('takes its percentage off each Campaign’s goods once enough are backed together, never off bonus support', () => {
    const { quote: q } = quote([lamp, mug], [any2])
    expect(q.groups.map((g) => [g.discount, g.promotions])).toEqual([[4.4, ['any-two']], [0.3, ['any-two']]])
    expect(q.deals).toEqual(['Any two'])
    expect(quote([lamp], [any2]).quote.discount).toBe(0)
  })

  it('adds to the other discounts, capped at the goods', () => {
    const lampAll = promotion({ title: 'Lamp all', campaign: 'lamp', discount: { percent: 95 } })
    expect(quote([lamp, mug], [any2, lampAll]).quote.groups.map((g) => g.discount)).toEqual([44, 0.3])
  })

  it('does not count a Campaign backed with bonus support alone', () => {
    expect(quote([lamp, { campaign: 'mug', lines: [], addons: [], bonus: 5 }], [any2]).quote.discount).toBe(0)
  })

  it('counts a top-up to an existing Pledge', () => {
    const held = pledge({ lines: [{ reward: 'manual', options: {}, quantity: 1 }] })
    const topUp: TinkerfundDraft = { campaign: 'lamp', lines: [], addons: [{ id: 'bulb', quantity: 1 }] }
    expect(quote([topUp, mug], [any2], [held]).quote.groups.map((g) => g.discount)).toEqual([0.9, 0.3])
  })

  it('with a list, counts and discounts only the Campaigns it names', () => {
    expect(quote([lamp, mug], [pair]).quote.discount).toBe(0)
    const lampAndMug = promotion({ title: 'Lamp and mug', discount: { percent: 10 }, bundle: { min: 2, campaigns: ['lamp', 'mug'] } })
    const clock: TinkerfundDraft = { campaign: 'clock', lines: [{ reward: 'clock', options: {}, quantity: 1 }], addons: [] }
    const at = shop({ promotions: [lampAndMug], catalog: { ...catalog, clock: { ...catalog.clock, campaign: { ...catalog.clock.campaign, launch: '-1d' } } } })
    const view = resolveTinkerfundCart({ cart: [lamp, mug, clock], pledges: [] }, at, 'domestic')
    expect(quoteTinkerfundCheckout(view, at, undefined).groups.map((g) => g.discount)).toEqual([4.4, 0.3, 0])
  })

  it('ignores a Scheduled bundle', () => {
    expect(quote([lamp, mug], [{ ...any2, start: '+1d' }]).quote.discount).toBe(0)
  })
})

describe('where a bundle shows', () => {
  const live = ['lamp', 'mug']
  const lampAndMug = promotion({ title: 'Lamp and mug', discount: { percent: 10 }, bundle: { min: 2, campaigns: ['lamp', 'mug'] } })

  it('marks only the Campaigns a bundle lists, and no Campaign for a shop-wide one', () => {
    expect(tinkerfundCampaignDeals([any2, lampAndMug], 'lamp', NOW, live)).toEqual([lampAndMug])
    expect(tinkerfundCampaignDeals([any2, lampAndMug], 'clock', NOW, live)).toEqual([])
  })

  it('promises nothing once too few of its Campaigns are Live to meet it', () => {
    expect(tinkerfundCampaignDeals([pair], 'lamp', NOW, live)).toEqual([])
    expect(tinkerfundBundleNudge([pair], quote([lamp], [pair]).view, NOW, live)).toBeUndefined()
    expect(tinkerfundBundleNudge([any2], quote([lamp], [any2]).view, NOW, ['lamp'])).toBeUndefined()
  })

  it('nudges the Cart while an Active bundle it counts toward is not yet met', () => {
    const nudge = (cart: TinkerfundDraft[], promotions = [any2]) => tinkerfundBundleNudge(promotions, quote(cart, promotions).view, NOW, [...live, 'clock'])
    expect(nudge([lamp])).toEqual({ text: 'Add a Reward from 1 more Campaign to save 10%', listed: false })
    expect(nudge([lamp], [{ ...any2, bundle: { min: 3 } }])?.text).toBe('Add a Reward from 2 more Campaigns to save 10%')
    expect(nudge([lamp, mug])).toBeUndefined()
    expect(nudge([mug], [pair])).toBeUndefined()
    expect(nudge([lamp], [{ ...any2, start: '+1d' }])).toBeUndefined()
  })
})

describe('after checkout', () => {
  const add = (draft: TinkerfundDraft): TinkerfundAction[] => draft.lines.map((l) => ({ type: 'cart', at: NOW, request: { campaign: draft.campaign, ...l } }))
  const placed: TinkerfundAction[] = [...add(lamp), ...add(mug), { type: 'place', at: NOW, zone: 'domestic', payment: 'handshake' }]
  const replay = (more: TinkerfundAction[]) => reduceTinkerfundActions([...placed, ...more], shop({ promotions: [any2] })).pledges
  const lampRef = 'TF-P-0001'
  const mugRef = 'TF-P-0002'

  it('keeps the discount on a Pledge whose sibling is cancelled, through its own later change', () => {
    const pledges = replay([
      { type: 'cancel', at: NOW + HOUR, ref: lampRef },
      { type: 'change', at: NOW + 2 * HOUR, ref: mugRef, change: { lines: [{ reward: 'mug', options: {}, quantity: 2 }], addons: [] } },
    ])
    const kept = pledges.find((p) => p.ref === mugRef)!
    expect(kept).toMatchObject({ promotions: ['any-two'], discount: 0.6 })
    expect(tinkerfundBundleNote(kept, [any2])).toBe('Bundle discount: 10% for backing 2 Campaigns together')
    expect(tinkerfundBundleNote(pledges.find((p) => p.ref === lampRef)!, [any2])).toBeUndefined()
  })

  it('keeps it on both when one is changed, and notes it only while a Pledge has goods for it', () => {
    const pledges = replay([{ type: 'change', at: NOW + HOUR, ref: lampRef, change: { lines: [{ reward: 'manual', options: {}, quantity: 1 }], addons: [] } }])
    expect(pledges.map((p) => [p.ref, p.promotions, p.discount])).toEqual([[lampRef, ['any-two'], 0.5], [mugRef, ['any-two'], 0.3]])
    expect(pledges.every((p) => tinkerfundBundleNote(p, [any2]))).toBe(true)
    const bonusOnly = replay([{ type: 'change', at: NOW + HOUR, ref: mugRef, change: { lines: [], addons: [], bonus: 5 } }]).find((p) => p.ref === mugRef)!
    expect(bonusOnly).toMatchObject({ promotions: ['any-two'], discount: 0 })
    expect(tinkerfundBundleNote(bonusOnly, [any2])).toBeUndefined()
  })

  it('keeps it on a Pledge topped up alone later, without counting it twice', () => {
    const pledges = replay([...add({ ...mug, lines: [{ ...mug.lines[0]!, quantity: 1 }] }), { type: 'place', at: NOW + HOUR, zone: 'domestic', payment: 'handshake' }])
    expect(pledges.find((p) => p.ref === mugRef)).toMatchObject({ promotions: ['any-two'], discount: 0.6 })
  })
})
