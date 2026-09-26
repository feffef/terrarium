// The Cart over tab-lifetime browser state (story #1383): what is stored, what
// an add may do, and how a stored Cart reads against the baked catalog.
import { describe, expect, it } from 'vitest'
import { addToTinkerfundCart, readTinkerfundOverlay, resolveTinkerfundCart, writeTinkerfundOverlay } from '../../app/utils/cart.ts'
import type { TinkerfundDraft } from '../../app/utils/cart.ts'

function memoryStorage(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries))
  return {
    get length() { return map.size },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => { throw new Error('never clear() shared storage') },
  }
}

const mugLine = { campaign: 'mug', lines: [{ reward: 'mug', options: { colour: 'red' }, quantity: 2 }], addons: [] }

describe('the stored overlay', () => {
  it('starts empty', () => {
    expect(readTinkerfundOverlay(memoryStorage(), 'qa')).toEqual({ cart: [] })
  })

  it('keeps each Space’s Cart apart', () => {
    const storage = memoryStorage()
    writeTinkerfundOverlay(storage, 'qa', { cart: [mugLine] })
    expect(readTinkerfundOverlay(storage, 'qa')).toEqual({ cart: [mugLine] })
    expect(readTinkerfundOverlay(storage, 'prod')).toEqual({ cart: [] })
  })

  it('reads tampered or malformed state as empty', () => {
    for (const raw of ['{', '"cart"', '{"cart":[{"campaign":"mug","lines":[{"reward":"mug","quantity":-3}]}]}']) {
      expect(readTinkerfundOverlay(memoryStorage({ 'tinkerfund:qa:overlay': raw }), 'qa')).toEqual({ cart: [] })
    }
  })
})

const NOW = Date.parse('2026-06-01T12:00:00Z')

// A Live lamp with a limit and scarce stock, an Ended ruler.
const catalog = {
  lamp: {
    title: 'Lamp',
    campaign: {
      launch: '-2d',
      end: '+2d',
      rewards: [
        { id: 'lamp', title: 'One lamp', price: 19, claimed: 30, stock: 40, limit: 3, shipsTo: ['domestic' as const], delivery: '+9d', options: [{ id: 'colour', name: 'Colour', choices: [{ id: 'black', label: 'Black' }, { id: 'white', label: 'White' }] }] },
        { id: 'manual', title: 'Manual', price: 5, claimed: 0, digital: true as const, delivery: '+1d' },
        { id: 'gone', title: 'Gone', price: 9, claimed: 5, stock: 5, digital: true as const, delivery: '+1d' },
      ],
      addons: [{ id: 'bulb', title: 'Bulb', price: 4, claimed: 0 }, { id: 'shade', title: 'Shade', price: 6, claimed: 2, stock: 2 }],
      shipping: { domestic: 5 },
    },
  },
  ruler: {
    title: 'Ruler',
    campaign: { launch: '-9d', end: '-1d', rewards: [{ id: 'ruler', title: 'Ruler', price: 3, claimed: 0, digital: true as const, delivery: '+1d' }], shipping: {} },
  },
}

const black = { campaign: 'lamp', reward: 'lamp', options: { colour: 'black' } }

function add(cart: TinkerfundDraft[], request: Parameters<typeof addToTinkerfundCart>[1]) {
  return addToTinkerfundCart(cart, request, catalog, NOW)
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

  it('holds a Reward to the stock that is left', () => {
    expect(add([], { ...black, quantity: 3 }).error).toBeUndefined()
    const scarce = { ...catalog, lamp: { ...catalog.lamp, campaign: { ...catalog.lamp.campaign, rewards: catalog.lamp.campaign.rewards.map((r) => ({ ...r, claimed: 38, limit: undefined })) } } }
    expect(addToTinkerfundCart([], { ...black, quantity: 3 }, scarce, NOW).error).toBe('Only 2 left')
    expect(add([], { campaign: 'lamp', reward: 'gone', options: {}, quantity: 1 }).error).toBe('Sold out')
    const { cart } = add([], { ...black, quantity: 1 })
    expect(add(cart, { campaign: 'lamp', addon: 'shade', quantity: 1 }).error).toBe('Sold out')
  })

  it('takes an Add-on only alongside a Reward from the same Campaign', () => {
    expect(add([], { campaign: 'lamp', addon: 'bulb', quantity: 1 }).error).toBe('Add-ons need a Reward from this Campaign')
    const { cart } = add([], { campaign: 'lamp', reward: 'manual', options: {}, quantity: 1 })
    expect(add(cart, { campaign: 'lamp', addon: 'bulb', quantity: 1 }).cart[0]!.addons).toEqual([{ id: 'bulb', quantity: 1 }])
  })

  it('refuses a Campaign that is not Live, and anything it does not offer', () => {
    expect(add([], { campaign: 'ruler', reward: 'ruler', options: {}, quantity: 1 }).error).toBe('Pledging has closed')
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
  const read = (cart: TinkerfundDraft[], zone: 'domestic' | 'europe' = 'domestic') => resolveTinkerfundCart(cart, catalog, NOW, zone)

  it('prices each line, groups by Campaign and adds flat shipping once per Campaign', () => {
    const view = read([{
      campaign: 'lamp',
      lines: [{ reward: 'lamp', options: { colour: 'white' }, quantity: 2 }, { reward: 'manual', options: {}, quantity: 1 }],
      addons: [{ id: 'bulb', quantity: 3 }],
      bonus: 1.5,
    }])
    expect(view.groups).toHaveLength(1)
    expect(view.groups[0]!.lines.map((l) => [l.title, l.detail, l.quantity, l.amount])).toEqual([
      ['One lamp', 'Colour: White', 2, 38],
      ['Manual', undefined, 1, 5],
      ['Bulb', undefined, 3, 12],
    ])
    expect(view).toMatchObject({ count: 6, subtotal: 56.5, shipping: 5, total: 61.5 })
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
      ['Ruler', 'Pledging has closed'],
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
    expect(view).toMatchObject({ subtotal: 19, shipping: 0 })
  })

  it('trims a quantity to what is left', () => {
    const view = read([{ campaign: 'lamp', lines: [{ reward: 'lamp', options: { colour: 'black' }, quantity: 7 }], addons: [] }])
    expect(view.groups[0]!.lines[0]).toMatchObject({ quantity: 3, max: 3, amount: 57 })
  })
})
