// Checkout (story #1384): what Promotions take off a Cart, and what confirming
// it stores — one Pledge per Campaign, feeding that Campaign's totals.
import { describe, expect, it } from 'vitest'
import { resolveTinkerfundCart } from '../../app/utils/cart.ts'
import type { TinkerfundDraft } from '../../app/utils/cart.ts'
import { placeTinkerfundPledges, quoteTinkerfundCheckout, tinkerfundReceipt, withTinkerfundPledges } from '../../app/utils/checkout.ts'

const NOW = Date.parse('2026-06-01T12:00:00Z')

const catalog = {
  lamp: {
    title: 'Lamp',
    campaign: {
      launch: '-2d',
      end: '+2d',
      rewards: [
        { id: 'lamp', title: 'One lamp', price: 20, claimed: 30, stock: 40, limit: 2, shipsTo: ['domestic' as const], delivery: '+9d' },
        { id: 'manual', title: 'Manual', price: 5, claimed: 0, digital: true as const, delivery: '+1d' },
      ],
      addons: [{ id: 'bulb', title: 'Bulb', price: 4, claimed: 0 }],
      shipping: { domestic: 5 },
    },
  },
  mug: {
    title: 'Mug',
    campaign: {
      launch: '-2d',
      end: '+2d',
      rewards: [{ id: 'mug', title: 'Mug', price: 3, claimed: 0, shipsTo: ['domestic' as const, 'europe' as const], delivery: '+9d' }],
      shipping: { domestic: 2, europe: 4 },
    },
  },
}

const cart: TinkerfundDraft[] = [
  { campaign: 'lamp', lines: [{ reward: 'lamp', options: {}, quantity: 2 }], addons: [{ id: 'bulb', quantity: 1 }], bonus: 6 },
  { campaign: 'mug', lines: [{ reward: 'mug', options: {}, quantity: 1 }], addons: [] },
]
const view = resolveTinkerfundCart(cart, catalog, NOW, 'domestic')

const promotion = (p: { title: string; code?: string; campaign?: string; discount: { percent: number } | { amount: number }; start?: string; end?: string }) =>
  ({ start: '-1d', ...p })

const quote = (promotions: ReturnType<typeof promotion>[], code?: string) => quoteTinkerfundCheckout(view, promotions, code, NOW)

describe('quoting a checkout', () => {
  it('without Promotions, charges what the Cart shows', () => {
    expect(quote([])).toMatchObject({ subtotal: 53, discount: 0, shipping: 7, total: 60, deals: [] })
    expect(quote([]).groups.map((g) => [g.campaign, g.discount, g.total])).toEqual([['lamp', 0, 55], ['mug', 0, 5]])
  })

  it('takes an Active automatic discount off the Rewards and Add-ons of the Campaign it targets, never off bonus support', () => {
    const q = quote([promotion({ title: 'Lamp tenth', campaign: 'lamp', discount: { percent: 10 } })])
    expect(q.groups.map((g) => g.discount)).toEqual([4.4, 0])
    expect(q).toMatchObject({ discount: 4.4, total: 55.6, deals: ['Lamp tenth'] })
  })

  it('ignores Scheduled and Expired Promotions', () => {
    const q = quote([
      promotion({ title: 'Soon', discount: { percent: 50 }, start: '+1d' }),
      promotion({ title: 'Over', discount: { percent: 50 }, start: '-9d', end: '-1d' }),
    ])
    expect(q).toMatchObject({ discount: 0, deals: [] })
  })

  it('takes a fixed amount off each Pledge it targets, never below nothing', () => {
    const q = quote([promotion({ title: 'Five off every Pledge', discount: { amount: 5 } })])
    expect(q.groups.map((g) => g.discount)).toEqual([5, 3])
    expect(q.discount).toBe(8)
  })

  it('adds one entered code to the automatic discounts, in any case', () => {
    const promotions = [
      promotion({ title: 'Lamp tenth', campaign: 'lamp', discount: { percent: 10 } }),
      promotion({ title: 'Ten percent off everything', code: 'TINKER10', discount: { percent: 10 } }),
    ]
    const q = quote(promotions, ' tinker10 ')
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
    expect(quote(promotions, 'NOPE')).toMatchObject({ discount: 0, codeProblem: 'That code isn’t valid' })
    expect(quote(promotions, 'SOON').codeProblem).toBe('That code isn’t active yet')
    expect(quote(promotions, 'OVER').codeProblem).toBe('That code has expired')
    expect(quote(promotions, 'KETTLE')).toMatchObject({ discount: 0, codeProblem: 'That code doesn’t apply to anything in your Cart' })
    expect(quote(promotions, '')).toMatchObject({ code: undefined, codeProblem: undefined })
  })
})

describe('confirming a checkout', () => {
  const place = (options: Partial<Parameters<typeof placeTinkerfundPledges>[0]> = {}) =>
    placeTinkerfundPledges({
      overlay: { cart, pledges: [] },
      quote: quote([promotion({ title: 'Lamp tenth', campaign: 'lamp', discount: { percent: 10 } })]),
      zone: 'domestic',
      payment: 'demo-card',
      catalog,
      baked: [],
      now: NOW,
      ...options,
    })

  it('stores one Pledge per Campaign, with what it cost, and empties the Cart', () => {
    const result = place({ baked: [{ ref: 'TF-P-0587', campaign: 'gone', placed: '-9d', zone: 'domestic', lines: [] }] })
    expect(result).toEqual({
      refs: ['TF-P-0588', 'TF-P-0589'],
      overlay: {
        cart: [],
        pledges: [
          { ref: 'TF-P-0588', campaign: 'lamp', placed: NOW, zone: 'domestic', payment: 'demo-card', lines: [{ reward: 'lamp', options: {}, quantity: 2 }], addons: [{ id: 'bulb', quantity: 1 }], bonus: 6, discount: 4.4, shipping: 5 },
          { ref: 'TF-P-0589', campaign: 'mug', placed: NOW, zone: 'domestic', payment: 'demo-card', lines: [{ reward: 'mug', options: {}, quantity: 1 }], addons: [], discount: 0, shipping: 2 },
        ],
      },
    })
  })

  it('refuses an empty Cart, a Campaign that is not Live, and a line that cannot be had', () => {
    expect(place({ quote: quoteTinkerfundCheckout(resolveTinkerfundCart([], catalog, NOW, 'domestic'), [], undefined, NOW) })).toEqual({ error: 'Your Cart is empty' })
    const late = resolveTinkerfundCart(cart, { ...catalog, lamp: { ...catalog.lamp, campaign: { ...catalog.lamp.campaign, end: '-1h' } } }, NOW, 'domestic')
    expect(place({ quote: quoteTinkerfundCheckout(late, [], undefined, NOW) })).toEqual({ error: 'Lamp: Pledging has closed' })
    const europe = resolveTinkerfundCart(cart, catalog, NOW, 'europe')
    expect(place({ quote: quoteTinkerfundCheckout(europe, [], undefined, NOW), zone: 'europe' })).toEqual({ error: 'Lamp: One lamp doesn’t ship there' })
    const sold = { ...catalog, mug: { ...catalog.mug, campaign: { ...catalog.mug.campaign, rewards: [{ ...catalog.mug.campaign.rewards[0]!, stock: 1, claimed: 1 }] } } }
    expect(place({ quote: quoteTinkerfundCheckout(resolveTinkerfundCart(cart, sold, NOW, 'domestic'), [], undefined, NOW) })).toEqual({ error: 'Mug: Mug is no longer available' })
  })

  it('adds to the Pledge a Campaign already has, keeping its reference and the per-Backer limit', () => {
    const baked = [{ ref: 'TF-P-9001', campaign: 'lamp', placed: '-5d', zone: 'domestic' as const, lines: [{ reward: 'manual', quantity: 1 }], bonus: 3 }]
    const result = place({ baked })
    expect(result.refs).toEqual(['TF-P-9001', 'TF-P-9002'])
    expect(result.overlay!.pledges[0]).toEqual({
      ref: 'TF-P-9001', campaign: 'lamp', placed: NOW - 5 * 86_400_000, zone: 'domestic', payment: 'demo-card',
      lines: [{ reward: 'manual', options: {}, quantity: 1 }, { reward: 'lamp', options: {}, quantity: 2 }],
      addons: [{ id: 'bulb', quantity: 1 }], bonus: 9, discount: 4.4, shipping: 5,
    })

    const again = place({ overlay: { cart, pledges: result.overlay!.pledges }, baked })
    expect(again).toEqual({ error: 'Lamp: Max 2 per Backer' })
  })
})

describe('a Campaign’s totals with the visitor’s Pledges', () => {
  const lamp = {
    pledged: 100,
    backers: 10,
    rewards: [{ id: 'lamp', price: 20, claimed: 30 }, { id: 'manual', price: 5, claimed: 0 }],
    addons: [{ id: 'bulb', price: 4, claimed: 0 }],
  }
  const pledge = { ref: 'TF-P-0001', campaign: 'lamp', placed: NOW, zone: 'domestic' as const, payment: 'demo-card', lines: [{ reward: 'lamp', options: {}, quantity: 2 }], addons: [{ id: 'bulb', quantity: 1 }], bonus: 6, discount: 4.4, shipping: 5 }

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
    const pledge = {
      ref: 'TF-P-0001', campaign: 'lamp', placed: NOW, zone: 'domestic' as const, payment: 'demo-card',
      lines: [{ reward: 'lamp', options: {}, quantity: 2 }, { reward: 'gone', options: {}, quantity: 1 }],
      addons: [{ id: 'bulb', quantity: 1 }], bonus: 6, discount: 4.4, shipping: 5,
    }
    const receipt = tinkerfundReceipt(pledge, catalog.lamp)
    expect(receipt.lines.map((l) => [l.title, l.quantity, l.price, l.amount])).toEqual([['One lamp', 2, 20, 40], ['Bulb', 1, 4, 4]])
    expect(receipt).toMatchObject({ ref: 'TF-P-0001', title: 'Lamp', goods: 44, bonus: 6, discount: 4.4, shipping: 5, total: 50.6 })
  })
})
