// Shared unit-test fixtures: a Storage that refuses clear(), and one small
// shop every Backer step is tested against.
import type { TinkerfundPromotionTerms } from '../../app/utils/campaign.ts'
import type { TinkerfundBakedPledge, TinkerfundCatalog, TinkerfundShop } from '../../app/utils/cart.ts'
import { TINKERFUND_HOUR } from '../../app/utils/clock.ts'

export const NOW = Date.parse('2026-06-01T12:00:00Z')
export const HOUR = TINKERFUND_HOUR
export const DAY = 24 * HOUR

/** sessionStorage is shared with every Tenant on the origin, so clear() must never run (issue #1359). */
export function memoryStorage(entries: Record<string, string> = {}): Storage {
  const map = new Map(Object.entries(entries))
  return {
    get length() { return map.size },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, String(v)),
    removeItem: (k) => void map.delete(k),
    clear: () => { throw new Error('never clear() storage other Tenants share') },
  }
}

const colour = { id: 'colour', name: 'Colour', choices: [{ id: 'black', label: 'Black' }, { id: 'white', label: 'White' }] }

// Live: lamp (a limit, scarce stock, a sold-out Reward and Add-on) and mug
// (ships to Europe too). Ended: ruler (funded, delivered), kettle (funded, not
// yet delivered), hammock (unfunded). Upcoming: clock.
export const catalog = {
  lamp: {
    title: 'Lamp',
    campaign: {
      launch: '-2d', end: '+2d', goal: 100, pledged: 150, backers: 10,
      rewards: [
        { id: 'lamp', title: 'One lamp', price: 20, claimed: 30, stock: 40, limit: 3, shipsTo: ['domestic' as const], delivery: '+9d', options: [colour] },
        { id: 'manual', title: 'Manual', price: 5, claimed: 1, delivery: '+1d' },
        { id: 'gone', title: 'Gone', price: 9, claimed: 5, stock: 5, delivery: '+1d' },
      ],
      addons: [{ id: 'bulb', title: 'Bulb', price: 4, claimed: 1, stock: 3 }, { id: 'shade', title: 'Shade', price: 6, claimed: 2, stock: 2 }],
      shipping: { domestic: 5 },
    },
  },
  mug: {
    title: 'Mug',
    campaign: {
      launch: '-2d', end: '+2d', goal: 100, pledged: 0, backers: 0,
      rewards: [{ id: 'mug', title: 'Mug', price: 3, claimed: 0, shipsTo: ['domestic' as const, 'europe' as const], delivery: '+9d' }],
      shipping: { domestic: 2, europe: 4 },
    },
  },
  ruler: {
    title: 'Ruler',
    campaign: {
      launch: '-60d', end: '-30d', goal: 100, pledged: 900, backers: 30,
      rewards: [{ id: 'ruler', title: 'One ruler', price: 30, claimed: 30, shipsTo: ['domestic' as const], delivery: '-5d' }],
      shipping: { domestic: 3 },
    },
  },
  kettle: {
    title: 'Kettle',
    campaign: {
      launch: '-60d', end: '-30d', goal: 100, pledged: 900, backers: 9,
      rewards: [{ id: 'kettle', title: 'Kettle', price: 9, claimed: 9, shipsTo: ['domestic' as const], delivery: '+30d' }],
      shipping: { domestic: 2 },
    },
  },
  hammock: {
    title: 'Hammock',
    campaign: {
      launch: '-30d', end: '-1h', goal: 1000, pledged: 50, backers: 1,
      rewards: [{ id: 'hammock', title: 'One hammock', price: 50, claimed: 1, shipsTo: ['domestic' as const], delivery: '+90d' }],
      shipping: { domestic: 7 },
    },
  },
  clock: {
    title: 'Clock',
    campaign: {
      launch: '+1d', end: '+9d', goal: 100, pledged: 0, backers: 0,
      rewards: [{ id: 'clock', title: 'Clock', price: 12, claimed: 0, delivery: '+20d' }],
      shipping: {},
    },
  },
} satisfies TinkerfundCatalog

export const baked: TinkerfundBakedPledge[] = [
  { ref: 'TF-P-0001', campaign: 'ruler', placed: '-45d', zone: 'domestic', lines: [{ reward: 'ruler', quantity: 1 }] },
  { ref: 'TF-P-0002', campaign: 'hammock', placed: '-20d', zone: 'domestic', lines: [{ reward: 'hammock', quantity: 1 }], bonus: 5 },
  { ref: 'TF-P-0003', campaign: 'lamp', placed: '-1d', zone: 'domestic', lines: [{ reward: 'manual', quantity: 1 }] },
  { ref: 'TF-P-0004', campaign: 'kettle', placed: '-50d', zone: 'domestic', lines: [{ reward: 'kettle', quantity: 1 }] },
  { ref: 'TF-P-0005', campaign: 'gone', placed: '-9d', zone: 'domestic', lines: [] },
]

export const promotion = (p: Omit<TinkerfundPromotionTerms, 'stem' | 'start'> & { start?: string }): TinkerfundPromotionTerms =>
  ({ stem: p.title.toLowerCase().replace(/\W+/g, '-'), start: '-1d', ...p })

export const shop = (over: Partial<TinkerfundShop> = {}): TinkerfundShop =>
  ({ catalog, baked: [], promotions: [], payment: 'demo-card', now: NOW, ...over })
