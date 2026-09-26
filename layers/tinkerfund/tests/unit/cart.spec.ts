// The Cart (story #1383): what an add may do, and how a Cart reads against
// the baked catalog.
import { describe, expect, it } from 'vitest'
import { addToTinkerfundCart, resolveTinkerfundCart, setTinkerfundLine } from '../../app/utils/cart.ts'
import type { TinkerfundBackerState, TinkerfundCartRequest, TinkerfundDraft, TinkerfundPledge, TinkerfundZone } from '../../app/utils/cart.ts'
import { NOW, shop } from './support.ts'

const black = { campaign: 'lamp', reward: 'lamp', options: { colour: 'black' } }
const empty: TinkerfundBackerState = { cart: [], pledges: [] }
const pledgedLamps = (quantity: number): TinkerfundPledge => ({
  ref: 'TF-P-9001', campaign: 'lamp', placed: NOW, zone: 'domestic', payment: 'demo-card',
  lines: [{ reward: 'lamp', options: { colour: 'black' }, quantity }], addons: [], promotions: [], discount: 0, shipping: 5,
})

function add(cart: TinkerfundDraft[], request: TinkerfundCartRequest) {
  const { state, error } = addToTinkerfundCart({ ...empty, cart }, request, shop())
  return { cart: state.cart, error }
}

describe('adding to the Cart', () => {
  it('merges a Reward with the same options into one line, and keeps other options apart', () => {
    let { cart } = add([], { ...black, quantity: 1 })
    ;({ cart } = add(cart, { ...black, quantity: 1 }))
    ;({ cart } = add(cart, { ...black, options: { colour: 'white' }, quantity: 1 }))
    expect(cart).toEqual([{
      campaign: 'lamp',
      lines: [{ reward: 'lamp', options: { colour: 'black' }, quantity: 2 }, { reward: 'lamp', options: { colour: 'white' }, quantity: 1 }],
      addons: [],
    }])
  })

  it('holds a Reward to its per-Backer limit across every option', () => {
    const { cart } = add([], { ...black, quantity: 2 })
    expect(add(cart, { ...black, options: { colour: 'white' }, quantity: 2 })).toEqual({ cart, error: 'Max 3 per Backer' })
  })

  it('counts what the Backer already pledged towards the per-Backer limit', () => {
    const state = { cart: [], pledges: [pledgedLamps(2)] }
    expect(addToTinkerfundCart(state, { ...black, options: { colour: 'white' }, quantity: 2 }, shop()).error).toBe('Max 3 per Backer: your Pledge already holds 2')
    expect(addToTinkerfundCart(state, { ...black, quantity: 1 }, shop()).error).toBeUndefined()
  })

  it('holds a Reward to the stock that is left', () => {
    expect(add([], { ...black, quantity: 3 }).error).toBeUndefined()
    const scarce = shop()
    scarce.catalog = { ...scarce.catalog, lamp: { ...scarce.catalog.lamp!, campaign: { ...scarce.catalog.lamp!.campaign, rewards: scarce.catalog.lamp!.campaign.rewards.map((r) => ({ ...r, claimed: 38, limit: undefined })) } } }
    expect(addToTinkerfundCart(empty, { ...black, quantity: 3 }, scarce).error).toBe('Only 2 left')
    expect(add([], { campaign: 'lamp', reward: 'gone', options: {}, quantity: 1 }).error).toBe('Sold out')
    const { cart } = add([], { ...black, quantity: 1 })
    expect(add(cart, { campaign: 'lamp', addon: 'shade', quantity: 1 }).error).toBe('Sold out')
  })

  it('takes an Add-on only alongside a Reward from the same Campaign', () => {
    expect(add([], { campaign: 'lamp', addon: 'bulb', quantity: 1 }).error).toBe('Add-ons need a Reward from this Campaign')
    const { cart } = add([], { campaign: 'lamp', reward: 'manual', options: {}, quantity: 1 })
    expect(add(cart, { campaign: 'lamp', addon: 'bulb', quantity: 1 }).cart[0]!.addons).toEqual([{ id: 'bulb', quantity: 1 }])
  })

  it('takes an Add-on alone once the Campaign’s Pledge already holds a Reward', () => {
    const state = { cart: [], pledges: [pledgedLamps(1)] }
    const { state: next, error } = addToTinkerfundCart(state, { campaign: 'lamp', addon: 'bulb', quantity: 1 }, shop())
    expect(error).toBeUndefined()
    const line = resolveTinkerfundCart(next, shop(), 'domestic').groups[0]!.lines[0]!
    expect(line).toMatchObject({ title: 'Bulb', amount: 4 })
    expect(line.unavailable).toBeUndefined()
  })

  it('refuses a Campaign that is not Live, and anything it does not offer', () => {
    expect(add([], { campaign: 'ruler', reward: 'ruler', options: {}, quantity: 1 }).error).toBe('Pledging has closed')
    expect(add([], { campaign: 'clock', reward: 'clock', options: {}, quantity: 1 }).error).toBe('Opens at launch')
    expect(add([], { campaign: 'nope', reward: 'ruler', options: {}, quantity: 1 }).error).toBe('No longer available')
    expect(add([], { campaign: 'lamp', reward: 'lamp', options: { colour: 'pink' }, quantity: 1 }).error).toBe('No longer available')
    expect(add([], { campaign: 'lamp', reward: 'lamp', options: {}, quantity: 1 }).error).toBe('No longer available')
  })

  it('adds bonus support, with or without a Reward', () => {
    let { cart } = add([], { campaign: 'lamp', bonus: 2.5 })
    ;({ cart } = add(cart, { campaign: 'lamp', bonus: 5 }))
    expect(cart).toEqual([{ campaign: 'lamp', lines: [], addons: [], bonus: 7.5 }])
  })

  it('lowers and removes with a negative quantity, dropping a draft left empty', () => {
    let { cart } = add([], { ...black, quantity: 2 })
    ;({ cart } = add(cart, { ...black, quantity: -1 }))
    expect(cart[0]!.lines[0]!.quantity).toBe(1)
    ;({ cart } = add(cart, { ...black, quantity: -1 }))
    expect(cart).toEqual([])
    ;({ cart } = add([], { campaign: 'lamp', bonus: 5 }))
    expect(add(cart, { campaign: 'lamp', bonus: -5 }).cart).toEqual([])
  })

  it('lets a Cart shrink even once its Campaign has closed', () => {
    const cart = [{ campaign: 'ruler', lines: [{ reward: 'ruler', options: {}, quantity: 1 }], addons: [] }]
    expect(add(cart, { campaign: 'ruler', reward: 'ruler', options: {}, quantity: -1 })).toEqual({ cart: [] })
  })
})

describe('reading the Cart against the catalog', () => {
  const read = (cart: TinkerfundDraft[], zone: TinkerfundZone = 'domestic') => resolveTinkerfundCart({ ...empty, cart }, shop(), zone)

  it('prices each line, groups by Campaign and adds flat shipping once per Campaign', () => {
    const view = read([{
      campaign: 'lamp',
      lines: [{ reward: 'lamp', options: { colour: 'white' }, quantity: 2 }, { reward: 'manual', options: {}, quantity: 1 }],
      addons: [{ id: 'bulb', quantity: 2 }],
      bonus: 1.5,
    }])
    expect(view.groups).toHaveLength(1)
    expect(view.groups[0]!.lines.map((l) => [l.title, l.detail, l.quantity, l.amount])).toEqual([
      ['One lamp', 'Colour: White', 2, 40],
      ['Manual', undefined, 1, 5],
      ['Bulb', undefined, 2, 8],
    ])
    expect(view).toMatchObject({ count: 5, subtotal: 54.5, shipping: 5, total: 59.5 })
  })

  it('drops what the catalog no longer has, quietly', () => {
    const view = read([
      { campaign: 'gone', lines: [{ reward: 'x', options: {}, quantity: 1 }], addons: [] },
      { campaign: 'lamp', lines: [{ reward: 'x', options: {}, quantity: 1 }, { reward: 'lamp', options: { colour: 'pink' }, quantity: 1 }, { reward: 'manual', options: {}, quantity: 1 }], addons: [{ id: 'x', quantity: 1 }] },
    ])
    expect(view.groups.map((g) => [g.campaign, g.lines.map((l) => l.title)])).toEqual([['lamp', ['Manual']]])
  })

  it('keeps an item that is no longer available, with a notice, out of the totals', () => {
    const view = read([
      { campaign: 'lamp', lines: [{ reward: 'gone', options: {}, quantity: 1 }], addons: [{ id: 'bulb', quantity: 1 }] },
      { campaign: 'ruler', lines: [{ reward: 'ruler', options: {}, quantity: 1 }], addons: [], bonus: 4 },
    ])
    expect(view.groups.flatMap((g) => g.lines.map((l) => [l.title, l.unavailable]))).toEqual([
      ['Gone', 'Sold out'],
      ['Bulb', 'Add-ons need a Reward from this Campaign'],
      ['One ruler', 'Pledging has closed'],
    ])
    expect(view.groups[1]!.closed).toBe('Pledging has closed')
    expect(view).toMatchObject({ count: 3, subtotal: 0, total: 0 })
  })

  it('counts a “just support it” Pledge as one item', () => {
    expect(read([{ campaign: 'lamp', lines: [], addons: [], bonus: 10 }])).toMatchObject({ count: 1, subtotal: 10, shipping: 0 })
  })

  it('flags a Reward that does not ship to the zone and charges no shipping for it', () => {
    const view = read([{ campaign: 'lamp', lines: [{ reward: 'lamp', options: { colour: 'black' }, quantity: 1 }], addons: [] }], 'europe')
    expect(view.groups[0]!.lines[0]!.ships).toBe(false)
    expect(view).toMatchObject({ subtotal: 20, shipping: 0 })
  })

  it('flags a line the Backer’s Pledge has already taken to the per-Backer limit, and trims one it nearly has', () => {
    const line = (quantity: number) => ({ campaign: 'lamp', lines: [{ reward: 'lamp', options: { colour: 'white' }, quantity }], addons: [] })
    const full = resolveTinkerfundCart({ cart: [line(1)], pledges: [pledgedLamps(3)] }, shop(), 'domestic')
    expect(full.groups[0]!.lines[0]).toMatchObject({ unavailable: 'Max 3 per Backer: your Pledge already holds 3', amount: 0 })
    const near = resolveTinkerfundCart({ cart: [line(2)], pledges: [pledgedLamps(2)] }, shop(), 'domestic')
    expect(near.groups[0]!.lines[0]).toMatchObject({ quantity: 1, max: 1, amount: 20 })
  })

  it('flags what the Backer’s Pledge already holds that won’t ship to the zone, since the Pledge moves there', () => {
    const manual = [{ campaign: 'lamp', lines: [{ reward: 'manual', options: {}, quantity: 1 }], addons: [] }]
    const state = { cart: manual, pledges: [pledgedLamps(1)] }
    expect(resolveTinkerfundCart(state, shop(), 'europe').groups[0]!.unshipped).toEqual(['One lamp'])
    expect(resolveTinkerfundCart(state, shop(), 'domestic').groups[0]!.unshipped).toEqual([])
  })

  it('trims a quantity to what is left', () => {
    const view = read([{ campaign: 'lamp', lines: [{ reward: 'lamp', options: { colour: 'black' }, quantity: 7 }], addons: [] }])
    expect(view.groups[0]!.lines[0]).toMatchObject({ quantity: 3, max: 3, amount: 60 })
  })

  it('changes a trimmed line from what it shows: one fewer, then removed', () => {
    let cart: TinkerfundDraft[] = [{ campaign: 'lamp', lines: [{ reward: 'lamp', options: { colour: 'black' }, quantity: 7 }], addons: [] }]
    ;({ cart } = add(cart, setTinkerfundLine(read(cart).groups[0]!.lines[0]!, 2)))
    expect(read(cart).groups[0]!.lines[0]).toMatchObject({ quantity: 2 })
    ;({ cart } = add(cart, setTinkerfundLine(read(cart).groups[0]!.lines[0]!, 0)))
    expect(cart).toEqual([])
  })
})
