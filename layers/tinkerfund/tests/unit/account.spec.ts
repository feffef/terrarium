// The Backer account (story #1385): every Pledge the demo Backer holds, and
// changing or cancelling one while its Campaign is Live (issue #1365).
import { describe, expect, it } from 'vitest'
import { cancelTinkerfundPledge, reviseTinkerfundPledge, tinkerfundAccountPledges } from '../../app/utils/account.ts'
import { reduceTinkerfundActions } from '../../app/utils/backer.ts'
import { tinkerfundPledgeFor, withTinkerfundPledges } from '../../app/utils/cart.ts'
import type { TinkerfundBackerState, TinkerfundPledge, TinkerfundShop } from '../../app/utils/cart.ts'
import { baked, catalog, DAY, HOUR, NOW, shop } from './support.ts'

const bakedShop = shop({ baked })
const start = reduceTinkerfundActions([], bakedShop)

const mine: TinkerfundPledge = {
  ref: 'TF-P-0006', campaign: 'mug', placed: NOW - DAY / 2, zone: 'domestic', payment: 'handshake',
  lines: [{ reward: 'mug', options: {}, quantity: 2 }], addons: [], bonus: 3, discount: 0, shipping: 2,
}
const withMine = (pledges: TinkerfundPledge[]): TinkerfundBackerState => ({ cart: [], pledges: [...start.pledges, ...pledges] })

describe('the account’s Pledges', () => {
  const list = (pledges: TinkerfundPledge[] = []) => tinkerfundAccountPledges(withMine(pledges), bakedShop)

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
    expect(hammock.endsAt).toBe(NOW - HOUR)
    expect(list().find((p) => p.pledge.ref === 'TF-P-0003')!.pledge.shipping).toBe(0)
  })

  it('puts the Backer’s own Pledges in', () => {
    expect(list([mine]).map((p) => p.pledge.ref)).toEqual(['TF-P-0006', 'TF-P-0003', 'TF-P-0002', 'TF-P-0001', 'TF-P-0004'])
  })

  it('shows a cancelled Pledge as cancelled and locked', () => {
    expect(list([{ ...mine, cancelled: NOW }])[0]).toMatchObject({ state: 'cancelled', locked: true })
  })
})

describe('changing a Pledge', () => {
  const black = { colour: 'black' }
  const white = { colour: 'white' }
  const lamps: TinkerfundPledge = {
    ref: 'TF-P-0007', campaign: 'lamp', placed: NOW - DAY / 2, zone: 'domestic', payment: 'handshake',
    lines: [{ reward: 'lamp', options: black, quantity: 2 }], addons: [{ id: 'bulb', quantity: 1 }], bonus: 3, discount: 4, shipping: 5,
  }
  const revise = (change: Parameters<typeof reviseTinkerfundPledge>[2], pledge = lamps, at: TinkerfundShop = shop()) => {
    const { state, error } = reviseTinkerfundPledge({ cart: [], pledges: [pledge] }, pledge.ref, change, at)
    return { pledge: error ? undefined : state.pledges[0], error }
  }

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
      ...lamps,
      lines: [{ reward: 'lamp', options: white, quantity: 2 }, { reward: 'lamp', options: black, quantity: 1 }, { reward: 'manual', options: {}, quantity: 1 }],
      addons: [{ id: 'bulb', quantity: 2 }],
      bonus: 7.5,
    })
  })

  it('stops shipping a Pledge left with digital Rewards only', () => {
    expect(revise({ lines: [{ reward: 'manual', options: {}, quantity: 1 }], addons: [] }).pledge).toMatchObject({ lines: [{ reward: 'manual', options: {}, quantity: 1 }], addons: [], shipping: 0 })
    expect(revise({ lines: [], addons: [], bonus: 10 }).pledge).toMatchObject({ lines: [], addons: [], bonus: 10, discount: 0, shipping: 0 })
  })

  it('lets the Backer keep what this Pledge already holds, but no more than the limit or what is left', () => {
    expect(revise({ lines: [{ reward: 'lamp', options: black, quantity: 3 }], addons: [] }).error).toBeUndefined()
    expect(revise({ lines: [{ reward: 'lamp', options: black, quantity: 2 }, { reward: 'lamp', options: white, quantity: 2 }], addons: [] }).error)
      .toBe('One lamp: Max 3 per Backer')
    expect(revise({ lines: [{ reward: 'lamp', options: black, quantity: 1 }], addons: [{ id: 'bulb', quantity: 2 }] }).error).toBeUndefined()
    expect(revise({ lines: [{ reward: 'lamp', options: black, quantity: 1 }], addons: [{ id: 'bulb', quantity: 3 }] }).error)
      .toBe('Bulb: Only 2 left')
  })

  it('refuses Add-ons without a Reward, an empty Pledge, an unknown choice and a zone the Reward doesn’t ship to', () => {
    expect(revise({ lines: [], addons: [{ id: 'bulb', quantity: 1 }] }).error).toBe('Add-ons need a Reward from this Campaign')
    expect(revise({ lines: [], addons: [] }).error).toBe('Nothing is left in this Pledge. To withdraw it, cancel it instead.')
    expect(revise({ lines: [{ reward: 'lamp', options: { colour: 'red' }, quantity: 1 }], addons: [] }).error).toBe('No longer available')
    expect(revise({ lines: [{ reward: 'lamp', options: black, quantity: 1 }], addons: [] }, { ...lamps, zone: 'europe' }).error)
      .toBe('One lamp doesn’t ship there')
  })

  it('refuses once the Campaign has ended', () => {
    const ended = { ...catalog, lamp: { ...catalog.lamp, campaign: { ...catalog.lamp.campaign, end: '-1h' } } }
    expect(revise({ lines: lamps.lines, addons: [] }, lamps, shop({ catalog: ended })).error).toBe('This Pledge is locked: its Campaign has ended')
  })
})

describe('cancelling a Pledge', () => {
  it('marks a Live Campaign’s Pledge cancelled, keeping everything else', () => {
    expect(cancelTinkerfundPledge(withMine([mine]), mine.ref, bakedShop).state.pledges.at(-1)).toEqual({ ...mine, cancelled: NOW })
  })

  it('refuses once the Campaign has ended, or when already cancelled', () => {
    expect(cancelTinkerfundPledge(start, 'TF-P-0001', bakedShop).error).toBe('This Pledge is locked: its Campaign has ended')
    expect(cancelTinkerfundPledge(withMine([{ ...mine, cancelled: NOW }]), mine.ref, bakedShop).error).toBe('This Pledge was cancelled')
  })

  const totals = { pledged: 150, backers: 10, rewards: [{ id: 'lamp', price: 20, claimed: 30 }, { id: 'manual', price: 5, claimed: 1 }], addons: [{ id: 'bulb', price: 4, claimed: 1 }] }

  it('takes a cancelled baked Pledge back out of its Campaign’s totals, Backer and stock too', () => {
    const { state } = cancelTinkerfundPledge(start, 'TF-P-0003', bakedShop)
    expect(withTinkerfundPledges('lamp', totals, state.pledges, baked)).toEqual({
      ...totals, pledged: 145, backers: 9, rewards: [totals.rewards[0], { ...totals.rewards[1], claimed: 0 }],
    })
  })

  it('counts nothing for a cancelled Pledge the Backer made', () => {
    expect(withTinkerfundPledges('mug', catalog.mug.campaign, [{ ...mine, cancelled: NOW }], [])).toEqual(catalog.mug.campaign)
  })

  it('lets the Backer pledge again, under a new ref, once the old Pledge is cancelled', () => {
    const { state } = cancelTinkerfundPledge(start, 'TF-P-0003', bakedShop)
    expect(tinkerfundPledgeFor(state.pledges, 'lamp')).toBeUndefined()
    const again = { ...mine, ref: 'TF-P-0007', campaign: 'lamp', lines: [{ reward: 'lamp', options: { colour: 'black' }, quantity: 2 }], discount: 4 }
    expect(tinkerfundPledgeFor([...state.pledges, again], 'lamp')).toBe(again)
    expect(withTinkerfundPledges('lamp', totals, [...state.pledges, again], baked)).toMatchObject({ pledged: 184, backers: 10 })
  })
})
