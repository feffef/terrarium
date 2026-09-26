// Checkout (story #1384): what Promotions take off a Cart, and what confirming
// it stores — one Pledge per Campaign, feeding that Campaign's totals.
import { describe, expect, it } from 'vitest'
import { resolveTinkerfundCart, withTinkerfundPledges } from '../../app/utils/cart.ts'
import type { TinkerfundBackerState, TinkerfundDraft, TinkerfundPledge, TinkerfundShop, TinkerfundZone } from '../../app/utils/cart.ts'
import { placeTinkerfundPledges, quoteTinkerfundCheckout, tinkerfundReceipt } from '../../app/utils/checkout.ts'
import { catalog, NOW, promotion, shop } from './support.ts'

const black = { colour: 'black' }
const cart: TinkerfundDraft[] = [
  { campaign: 'lamp', lines: [{ reward: 'lamp', options: black, quantity: 2 }], addons: [{ id: 'bulb', quantity: 1 }], bonus: 6 },
  { campaign: 'mug', lines: [{ reward: 'mug', options: {}, quantity: 1 }], addons: [] },
]
const lampTenth = promotion({ title: 'Lamp tenth', campaign: 'lamp', discount: { percent: 10 } })

function quote(options: { cart?: TinkerfundDraft[]; pledges?: TinkerfundPledge[]; zone?: TinkerfundZone; code?: string; at?: Partial<TinkerfundShop> } = {}) {
  const at = shop(options.at)
  const state = { cart: options.cart ?? cart, pledges: options.pledges ?? [] }
  return quoteTinkerfundCheckout(resolveTinkerfundCart(state, at, options.zone ?? 'domestic'), at, options.code)
}

describe('quoting a checkout', () => {
  it('without Promotions, charges what the Cart shows', () => {
    expect(quote()).toMatchObject({ subtotal: 53, discount: 0, shipping: 7, total: 60, deals: [] })
    expect(quote().groups.map((g) => [g.campaign, g.discount, g.total])).toEqual([['lamp', 0, 55], ['mug', 0, 5]])
  })

  it('takes an Active automatic discount off the Rewards and Add-ons of the Campaign it targets, never off bonus support', () => {
    const q = quote({ at: { promotions: [lampTenth] } })
    expect(q.groups.map((g) => g.discount)).toEqual([4.4, 0])
    expect(q).toMatchObject({ discount: 4.4, total: 55.6, deals: ['Lamp tenth'] })
  })

  it('ignores Scheduled and Expired Promotions', () => {
    const q = quote({ at: { promotions: [
      promotion({ title: 'Soon', discount: { percent: 50 }, start: '+1d' }),
      promotion({ title: 'Over', discount: { percent: 50 }, start: '-9d', end: '-1d' }),
    ] } })
    expect(q).toMatchObject({ discount: 0, deals: [] })
  })

  it('takes a fixed amount off each Pledge it targets, never below nothing', () => {
    const q = quote({ at: { promotions: [promotion({ title: 'Five off every Pledge', discount: { amount: 5 } })] } })
    expect(q.groups.map((g) => g.discount)).toEqual([5, 3])
    expect(q.discount).toBe(8)
  })

  it('adds one entered code to the automatic discounts, in any case', () => {
    const promotions = [lampTenth, promotion({ title: 'Ten percent off everything', code: 'TINKER10', discount: { percent: 10 } })]
    const q = quote({ at: { promotions }, code: ' tinker10 ' })
    expect(q.groups.map((g) => g.discount)).toEqual([8.8, 0.3])
    expect(q).toMatchObject({ code: 'TINKER10', deals: ['Lamp tenth', 'Ten percent off everything'] })
    expect(q.codeProblem).toBeUndefined()
  })

  it('says why a code does not apply, and applies nothing for it', () => {
    const promotions = [
      promotion({ title: 'Soon', code: 'SOON', discount: { percent: 10 }, start: '+1d' }),
      promotion({ title: 'Over', code: 'OVER', discount: { percent: 10 }, start: '-9d', end: '-1d' }),
      promotion({ title: 'Kettle', code: 'KETTLE', campaign: 'kettle', discount: { percent: 10 } }),
    ]
    const withCode = (code: string) => quote({ at: { promotions }, code })
    expect(withCode('NOPE')).toMatchObject({ discount: 0, codeProblem: 'That code isn’t valid' })
    expect(withCode('SOON').codeProblem).toBe('That code isn’t active yet')
    expect(withCode('OVER').codeProblem).toBe('That code has expired')
    expect(withCode('KETTLE')).toMatchObject({ discount: 0, codeProblem: 'That code doesn’t apply to anything in your Cart' })
    expect(withCode('')).toMatchObject({ code: undefined, codeProblem: undefined })
  })

  it('charges a Pledge’s shipping once: adding to one that already ships quotes only the difference', () => {
    const mugs: TinkerfundPledge = {
      ref: 'TF-P-9001', campaign: 'mug', placed: NOW, zone: 'domestic', payment: 'demo-card',
      lines: [{ reward: 'mug', options: {}, quantity: 1 }], addons: [], promotions: [], discount: 0, shipping: 2,
    }
    const more = [{ campaign: 'mug', lines: [{ reward: 'mug', options: {}, quantity: 1 }], addons: [] }]
    expect(quote({ cart: more, pledges: [mugs] })).toMatchObject({ subtotal: 3, shipping: 0, total: 3 })
    // Moving it to Europe re-rates the whole Pledge: €4 instead of the €2 it paid.
    expect(quote({ cart: more, pledges: [mugs], zone: 'europe' })).toMatchObject({ subtotal: 3, shipping: 2, total: 5 })
  })

  describe('adding to a Pledge that earned a Promotion', () => {
    const lamp: TinkerfundPledge = {
      ref: 'TF-P-9001', campaign: 'lamp', placed: NOW, zone: 'domestic', payment: 'demo-card',
      lines: [{ reward: 'lamp', options: black, quantity: 1 }], addons: [], promotions: [], discount: 0, shipping: 5,
    }
    const oneMore = [{ campaign: 'lamp', lines: [{ reward: 'lamp', options: { colour: 'white' }, quantity: 1 }], addons: [] }]

    it('takes a fixed amount off once per Pledge, never again on a merge', () => {
      const fiveOff = promotion({ title: 'Five off every Pledge', discount: { amount: 5 } })
      const earned = { ...lamp, promotions: [fiveOff.id], discount: 5 }
      const q = quote({ cart: oneMore, pledges: [earned], at: { promotions: [fiveOff] } })
      expect(q).toMatchObject({ subtotal: 20, discount: 0, shipping: 0, total: 20 })
      const placed = placeTinkerfundPledges({ state: { cart: oneMore, pledges: [earned] }, quote: q, zone: 'domestic', payment: 'demo-card', shop: shop({ promotions: [fiveOff] }) })
      expect(placed.state.pledges[0]).toMatchObject({ promotions: [fiveOff.id], discount: 5 })
    })

    it('keeps a percentage it earned on what it adds, though that Promotion has since expired', () => {
      const expired = promotion({ title: 'Lamp tenth', campaign: 'lamp', discount: { percent: 10 }, end: '-1h' })
      const earned = { ...lamp, promotions: [expired.id], discount: 2 }
      expect(quote({ cart: oneMore, pledges: [earned], at: { promotions: [expired] } })).toMatchObject({ discount: 2, total: 18 })
    })
  })

  it('does not apply a code to a Campaign backed with bonus support only', () => {
    const q = quote({
      cart: [{ campaign: 'lamp', lines: [], addons: [], bonus: 6 }],
      at: { promotions: [promotion({ title: 'Lamp tenth', code: 'LAMP', campaign: 'lamp', discount: { percent: 10 } })] },
      code: 'LAMP',
    })
    expect(q).toMatchObject({ discount: 0, code: undefined, codeProblem: 'That code doesn’t apply to anything in your Cart' })
  })
})

describe('confirming a checkout', () => {
  const place = (options: { state?: TinkerfundBackerState; zone?: TinkerfundZone; payment?: string; at?: Partial<TinkerfundShop> } = {}) => {
    const at = shop({ promotions: [lampTenth], ...options.at })
    const state = options.state ?? { cart, pledges: [] }
    const zone = options.zone ?? 'domestic'
    const q = quoteTinkerfundCheckout(resolveTinkerfundCart(state, at, zone), at, undefined)
    return placeTinkerfundPledges({ state, quote: q, zone, payment: options.payment ?? 'demo-card', shop: at })
  }

  it('stores one Pledge per Campaign, with what it cost, and empties the Cart', () => {
    const result = place({ at: { baked: [{ ref: 'TF-P-0587', campaign: 'gone', placed: '-9d', zone: 'domestic', lines: [] }] } })
    expect(result).toEqual({
      refs: ['TF-P-0588', 'TF-P-0589'],
      state: {
        cart: [],
        pledges: [
          { ref: 'TF-P-0588', campaign: 'lamp', placed: NOW, zone: 'domestic', payment: 'demo-card', lines: [{ reward: 'lamp', options: black, quantity: 2 }], addons: [{ id: 'bulb', quantity: 1 }], bonus: 6, promotions: ['lamp-tenth'], discount: 4.4, shipping: 5 },
          { ref: 'TF-P-0589', campaign: 'mug', placed: NOW, zone: 'domestic', payment: 'demo-card', lines: [{ reward: 'mug', options: {}, quantity: 1 }], addons: [], promotions: [], discount: 0, shipping: 2 },
        ],
      },
    })
  })

  it('refuses an empty Cart, a Campaign that is not Live, and a line that cannot be had', () => {
    expect(place({ state: { cart: [], pledges: [] } }).error).toBe('Your Cart is empty')
    const late = { ...catalog, lamp: { ...catalog.lamp, campaign: { ...catalog.lamp.campaign, end: '-1h' } } }
    expect(place({ at: { catalog: late } }).error).toBe('Lamp: Pledging has closed')
    expect(place({ zone: 'europe' }).error).toBe('Lamp: One lamp doesn’t ship there')
    const sold = { ...catalog, mug: { ...catalog.mug, campaign: { ...catalog.mug.campaign, rewards: [{ ...catalog.mug.campaign.rewards[0]!, stock: 1, claimed: 1 }] } } }
    expect(place({ at: { catalog: sold } }).error).toBe('Mug: Mug is no longer available')
  })

  it('refuses a checkout with no payment method', () => {
    expect(place({ payment: '' }).error).toBe('Choose how to pay')
  })

  const existing: TinkerfundPledge = {
    ref: 'TF-P-9001', campaign: 'lamp', placed: NOW - 5 * 86_400_000, zone: 'domestic', payment: 'handshake',
    lines: [{ reward: 'manual', options: {}, quantity: 1 }], addons: [], bonus: 3, promotions: [], discount: 0, shipping: 0,
  }

  it('refuses to move a Pledge to a zone its earlier Rewards don’t ship to', () => {
    const lamps = { ...existing, lines: [{ reward: 'lamp', options: black, quantity: 1 }], shipping: 5 }
    const manual: TinkerfundDraft[] = [{ campaign: 'lamp', lines: [{ reward: 'manual', options: {}, quantity: 1 }], addons: [] }]
    expect(place({ state: { cart: manual, pledges: [lamps] }, zone: 'europe' }).error).toBe('Lamp: One lamp doesn’t ship there')
  })

  it('adds to the Pledge a Campaign already has, keeping its reference, up to the per-Backer limit', () => {
    const result = place({ state: { cart, pledges: [existing] } })
    expect(result.refs).toEqual(['TF-P-9001', 'TF-P-9002'])
    expect(result.state.pledges[0]).toEqual({
      ...existing,
      payment: 'demo-card',
      lines: [{ reward: 'manual', options: {}, quantity: 1 }, { reward: 'lamp', options: black, quantity: 2 }],
      addons: [{ id: 'bulb', quantity: 1 }], bonus: 9, promotions: ['lamp-tenth'], discount: 4.9, shipping: 5,
    })

    const again = place({ state: { cart, pledges: result.state.pledges } })
    expect(again.state.pledges[0]!.lines).toEqual([{ reward: 'manual', options: {}, quantity: 1 }, { reward: 'lamp', options: black, quantity: 3 }])
    const bothColours = [{ campaign: 'lamp', lines: [{ reward: 'lamp', options: black, quantity: 1 }, { reward: 'lamp', options: { colour: 'white' }, quantity: 1 }], addons: [] }]
    expect(place({ state: { cart: bothColours, pledges: result.state.pledges } }).error).toBe('Lamp: Max 3 per Backer')
  })
})

describe('a Campaign’s totals with the Backer’s Pledges', () => {
  const lamp = {
    pledged: 100,
    backers: 10,
    rewards: [{ id: 'lamp', price: 20, claimed: 30 }, { id: 'manual', price: 5, claimed: 0 }],
    addons: [{ id: 'bulb', price: 4, claimed: 0 }],
  }
  const pledge: TinkerfundPledge = { ref: 'TF-P-0001', campaign: 'lamp', placed: NOW, zone: 'domestic', payment: 'demo-card', lines: [{ reward: 'lamp', options: {}, quantity: 2 }], addons: [{ id: 'bulb', quantity: 1 }], bonus: 6, promotions: [], discount: 4.4, shipping: 5 }

  it('adds a new Pledge’s amount after discount, without shipping, one Backer, and the stock it took', () => {
    const other = { ...pledge, ref: 'TF-P-0002', campaign: 'mug' }
    expect(withTinkerfundPledges('lamp', lamp, [pledge, other], [])).toEqual({
      pledged: 145.6,
      backers: 11,
      rewards: [{ id: 'lamp', price: 20, claimed: 32 }, { id: 'manual', price: 5, claimed: 0 }],
      addons: [{ id: 'bulb', price: 4, claimed: 1 }],
    })
  })

  it('counts only the difference when the Pledge replaces a baked one', () => {
    const baked = [{ ref: 'TF-P-0001', campaign: 'lamp', placed: '-5d', zone: 'domestic' as const, lines: [{ reward: 'manual', quantity: 1 }], bonus: 3 }]
    const grown = { ...pledge, lines: [...pledge.lines, { reward: 'manual', options: {}, quantity: 1 }], bonus: 9 }
    expect(withTinkerfundPledges('lamp', lamp, [grown], baked)).toMatchObject({
      pledged: 145.6,
      backers: 10,
      rewards: [{ id: 'lamp', claimed: 32 }, { id: 'manual', claimed: 0 }],
    })
  })
})

describe('reading a Pledge back as a receipt', () => {
  it('prices each line from the catalog and settles the total, dropping ids it no longer knows', () => {
    const pledge: TinkerfundPledge = {
      ref: 'TF-P-0001', campaign: 'lamp', placed: NOW, zone: 'domestic', payment: 'demo-card',
      lines: [{ reward: 'lamp', options: black, quantity: 2 }, { reward: 'gone-for-good', options: {}, quantity: 1 }],
      addons: [{ id: 'bulb', quantity: 1 }], bonus: 6, promotions: [], discount: 4.4, shipping: 5,
    }
    const receipt = tinkerfundReceipt(pledge, catalog.lamp)
    expect(receipt.lines.map((l) => [l.title, l.quantity, l.price, l.amount])).toEqual([['One lamp', 2, 20, 40], ['Bulb', 1, 4, 4]])
    expect(receipt).toMatchObject({ ref: 'TF-P-0001', title: 'Lamp', goods: 44, bonus: 6, discount: 4.4, shipping: 5, total: 50.6 })
  })
})
