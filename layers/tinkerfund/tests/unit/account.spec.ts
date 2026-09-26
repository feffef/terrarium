// The Backer account (story #1385): every Pledge the demo Backer holds, and
// changing or cancelling one while its Campaign is Live (issue #1365).
import { describe, expect, it } from 'vitest'
import { cancelTinkerfundPledge, reviseTinkerfundPledge, tinkerfundAccountPledges } from '../../app/utils/account.ts'
import { tinkerfundPledgeFor, withTinkerfundPledges } from '../../app/utils/checkout.ts'
import type { TinkerfundBakedPledge } from '../../app/utils/checkout.ts'
import type { TinkerfundPledge } from '../../app/utils/cart.ts'

const NOW = Date.parse('2026-06-01T12:00:00Z')
const DAY = 86_400_000

const lamp = {
  title: 'Lamp',
  campaign: {
    goal: 100,
    pledged: 150,
    launch: '-2d',
    end: '+2d',
    rewards: [
      {
        id: 'lamp', title: 'One lamp', price: 20, claimed: 30, stock: 33, limit: 3, shipsTo: ['domestic' as const], delivery: '+9d',
        options: [{ id: 'colour', name: 'Colour', choices: [{ id: 'black', label: 'Black' }, { id: 'white', label: 'White' }] }],
      },
      { id: 'manual', title: 'Manual', price: 5, claimed: 0, digital: true as const, delivery: '+1d' },
    ],
    addons: [{ id: 'bulb', title: 'Bulb', price: 4, claimed: 1, stock: 2 }],
    shipping: { domestic: 5 },
  },
}
const catalog = {
  lamp,
  ruler: {
    title: 'Ruler',
    campaign: {
      goal: 100, pledged: 900, launch: '-60d', end: '-30d',
      rewards: [{ id: 'ruler', title: 'One ruler', price: 30, claimed: 30, shipsTo: ['domestic' as const], delivery: '-5d' }],
      shipping: { domestic: 3 },
    },
  },
  hammock: {
    title: 'Hammock',
    campaign: {
      goal: 1000, pledged: 50, launch: '-30d', end: '-1h',
      rewards: [{ id: 'hammock', title: 'One hammock', price: 50, claimed: 1, shipsTo: ['domestic' as const], delivery: '+90d' }],
      shipping: { domestic: 7 },
    },
  },
  mug: {
    title: 'Mug',
    campaign: {
      goal: 100, pledged: 900, launch: '-60d', end: '-30d',
      rewards: [{ id: 'mug', title: 'Mug', price: 9, claimed: 9, shipsTo: ['domestic' as const], delivery: '+30d' }],
      shipping: { domestic: 2 },
    },
  },
}

const baked: TinkerfundBakedPledge[] = [
  { ref: 'TF-P-0001', campaign: 'ruler', placed: '-45d', zone: 'domestic', lines: [{ reward: 'ruler', quantity: 1 }] },
  { ref: 'TF-P-0002', campaign: 'hammock', placed: '-20d', zone: 'domestic', lines: [{ reward: 'hammock', quantity: 1 }], bonus: 5 },
  { ref: 'TF-P-0003', campaign: 'lamp', placed: '-1d', zone: 'domestic', lines: [{ reward: 'manual', quantity: 1 }] },
  { ref: 'TF-P-0004', campaign: 'mug', placed: '-50d', zone: 'domestic', lines: [{ reward: 'mug', quantity: 1 }] },
  { ref: 'TF-P-0005', campaign: 'gone', placed: '-9d', zone: 'domestic', lines: [] },
]

const mine: TinkerfundPledge = {
  ref: 'TF-P-0006', campaign: 'lamp', placed: NOW - DAY / 2, zone: 'domestic', payment: 'handshake',
  lines: [{ reward: 'lamp', options: { colour: 'black' }, quantity: 2 }], addons: [{ id: 'bulb', quantity: 1 }], bonus: 3, discount: 4, shipping: 5,
}

describe('the account’s Pledges', () => {
  const list = (pledges: TinkerfundPledge[] = []) => tinkerfundAccountPledges(pledges, baked, catalog, NOW, 'demo-card')

  it('lists the baked Pledges, newest first, each with its state, dropping a Campaign it no longer knows', () => {
    expect(list().map((p) => [p.pledge.ref, p.state, p.locked])).toEqual([
      ['TF-P-0003', 'pending', false],
      ['TF-P-0002', 'unfunded', true],
      ['TF-P-0001', 'delivered', true],
      ['TF-P-0004', 'charged', true],
    ])
  })

  it('reads a baked Pledge as a stored one: placed, paid with the first demo method, shipped at its zone’s rate', () => {
    const hammock = list().find((p) => p.pledge.ref === 'TF-P-0002')!
    expect(hammock.pledge).toEqual({
      ref: 'TF-P-0002', campaign: 'hammock', placed: NOW - 20 * DAY, zone: 'domestic', payment: 'demo-card',
      lines: [{ reward: 'hammock', options: {}, quantity: 1 }], addons: [], bonus: 5, discount: 0, shipping: 7,
    })
    expect(hammock.endsAt).toBe(NOW - 3_600_000)
    expect(list().find((p) => p.pledge.ref === 'TF-P-0003')!.pledge.shipping).toBe(0)
  })

  it('puts the visitor’s own Pledges in, replacing a baked one with the same ref', () => {
    const replaced = { ...mine, ref: 'TF-P-0003' }
    expect(list([mine]).map((p) => p.pledge.ref)).toEqual(['TF-P-0006', 'TF-P-0003', 'TF-P-0002', 'TF-P-0001', 'TF-P-0004'])
    expect(list([replaced]).filter((p) => p.pledge.ref === 'TF-P-0003').map((p) => p.pledge)).toEqual([replaced])
  })

  it('shows a cancelled Pledge as cancelled and locked', () => {
    expect(list([{ ...mine, cancelled: NOW }])[0]).toMatchObject({ state: 'cancelled', locked: true })
  })
})

describe('changing a Pledge', () => {
  const black = { colour: 'black' }
  const white = { colour: 'white' }
  const revise = (change: Parameters<typeof reviseTinkerfundPledge>[1], pledge = mine, entry = lamp) =>
    reviseTinkerfundPledge(pledge, change, entry, NOW)

  it('takes new lines, options, Add-ons and bonus, merging lines that match, and keeps the rest of the Pledge', () => {
    const { pledge } = revise({
      lines: [
        { reward: 'lamp', options: white, quantity: 1 },
        { reward: 'lamp', options: black, quantity: 1 },
        { reward: 'lamp', options: white, quantity: 1 },
        { reward: 'manual', options: {}, quantity: 1 },
        { reward: 'lamp', options: black, quantity: 0 },
      ],
      addons: [{ id: 'bulb', quantity: 2 }],
      bonus: 7.5,
    })
    expect(pledge).toEqual({
      ...mine,
      lines: [{ reward: 'lamp', options: white, quantity: 2 }, { reward: 'lamp', options: black, quantity: 1 }, { reward: 'manual', options: {}, quantity: 1 }],
      addons: [{ id: 'bulb', quantity: 2 }],
      bonus: 7.5,
    })
  })

  it('stops shipping a Pledge left with digital Rewards only, and keeps its discount no bigger than its goods', () => {
    expect(revise({ lines: [{ reward: 'manual', options: {}, quantity: 1 }], addons: [], bonus: 0 }).pledge).toEqual({
      ...mine, lines: [{ reward: 'manual', options: {}, quantity: 1 }], addons: [], bonus: undefined, discount: 4, shipping: 0,
    })
    expect(revise({ lines: [], addons: [], bonus: 10 }).pledge).toMatchObject({ lines: [], addons: [], bonus: 10, discount: 0, shipping: 0 })
  })

  it('lets the Backer keep what this Pledge already holds, but no more than the limit or what is left', () => {
    expect(revise({ lines: [{ reward: 'lamp', options: black, quantity: 3 }], addons: [] }).error).toBeUndefined()
    expect(revise({ lines: [{ reward: 'lamp', options: black, quantity: 2 }, { reward: 'lamp', options: white, quantity: 2 }], addons: [] }))
      .toEqual({ error: 'One lamp: Max 3 per Backer' })
    expect(revise({ lines: [{ reward: 'lamp', options: black, quantity: 1 }], addons: [{ id: 'bulb', quantity: 2 }] }).error).toBeUndefined()
    expect(revise({ lines: [{ reward: 'lamp', options: black, quantity: 1 }], addons: [{ id: 'bulb', quantity: 3 }] }))
      .toEqual({ error: 'Bulb: Only 2 left' })
  })

  it('refuses Add-ons without a Reward, an empty Pledge, an unknown choice and a zone the Reward doesn’t ship to', () => {
    expect(revise({ lines: [], addons: [{ id: 'bulb', quantity: 1 }] })).toEqual({ error: 'Add-ons need a Reward from this Campaign' })
    expect(revise({ lines: [], addons: [] })).toEqual({ error: 'Nothing is left in this Pledge. To withdraw it, cancel it instead.' })
    expect(revise({ lines: [{ reward: 'lamp', options: { colour: 'red' }, quantity: 1 }], addons: [] })).toEqual({ error: 'No longer available' })
    expect(revise({ lines: [{ reward: 'lamp', options: black, quantity: 1 }], addons: [] }, { ...mine, zone: 'europe' }))
      .toEqual({ error: 'One lamp doesn’t ship there' })
  })

  it('refuses once the Campaign has ended', () => {
    const ended = { ...lamp, campaign: { ...lamp.campaign, end: '-1h' } }
    expect(revise({ lines: mine.lines, addons: [] }, mine, ended)).toEqual({ error: 'This Pledge is locked: its Campaign has ended' })
  })
})

describe('cancelling a Pledge', () => {
  it('marks a Live Campaign’s Pledge cancelled, keeping everything else', () => {
    expect(cancelTinkerfundPledge(mine, lamp, NOW)).toEqual({ pledge: { ...mine, cancelled: NOW } })
  })

  it('refuses once the Campaign has ended, or when already cancelled', () => {
    const ruler = tinkerfundAccountPledges([], baked, catalog, NOW, 'demo-card').find((p) => p.pledge.campaign === 'ruler')!.pledge
    expect(cancelTinkerfundPledge(ruler, catalog.ruler, NOW)).toEqual({ error: 'This Pledge is locked: its Campaign has ended' })
    expect(cancelTinkerfundPledge({ ...mine, cancelled: NOW }, lamp, NOW)).toEqual({ error: 'This Pledge was cancelled' })
  })

  const totals = { pledged: 150, backers: 10, rewards: [{ id: 'lamp', price: 20, claimed: 30 }, { id: 'manual', price: 5, claimed: 1 }], addons: [{ id: 'bulb', price: 4, claimed: 1 }] }

  it('takes a cancelled baked Pledge back out of its Campaign’s totals, Backer and stock too', () => {
    const cancelled = { ...tinkerfundAccountPledges([], baked, catalog, NOW, 'demo-card')[0]!.pledge, cancelled: NOW }
    expect(withTinkerfundPledges('lamp', totals, [cancelled], baked)).toEqual({
      ...totals, pledged: 145, backers: 9, rewards: [totals.rewards[0], { ...totals.rewards[1], claimed: 0 }],
    })
  })

  it('counts nothing for a cancelled Pledge the visitor made', () => {
    expect(withTinkerfundPledges('lamp', totals, [{ ...mine, cancelled: NOW }], [])).toEqual(totals)
  })

  it('lets the Backer pledge again, under a new ref, once the old Pledge is cancelled', () => {
    const cancelled = { ...mine, ref: 'TF-P-0003', cancelled: NOW }
    expect(tinkerfundPledgeFor('lamp', [cancelled], baked)).toBeUndefined()
    const again = { ...mine, ref: 'TF-P-0007' }
    expect(tinkerfundPledgeFor('lamp', [cancelled, again], baked)).toBe(again)
    expect(withTinkerfundPledges('lamp', totals, [cancelled, again], baked)).toMatchObject({ pledged: 188, backers: 10 })
  })
})
