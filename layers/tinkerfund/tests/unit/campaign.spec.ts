// The Campaign page's derived readouts (story #1380).
import { describe, expect, it } from 'vitest'
import {
  formatTinkerfundAgo,
  formatTinkerfundDiscount,
  formatTinkerfundMoney,
  formatTinkerfundMonth,
  currentTinkerfundSection,
  tinkerfundAutomaticDeals,
  tinkerfundLocale,
  tinkerfundStock,
  tinkerfundUpdates,
} from '../../app/utils/campaign.ts'
import { HOUR, NOW } from './support.ts'

describe('tinkerfundStock', () => {
  it('counts what is left of a limited Reward', () => {
    expect(tinkerfundStock({ stock: 200, claimed: 188 })).toEqual({ left: 12, soldOut: false, label: '12 of 200 left' })
  })

  it('is sold out once every unit is claimed', () => {
    expect(tinkerfundStock({ stock: 50, claimed: 50 })).toEqual({ left: 0, soldOut: true, label: 'Sold out' })
  })

  it('has no count when stock is unlimited', () => {
    expect(tinkerfundStock({ claimed: 380 })).toEqual({ left: undefined, soldOut: false, label: undefined })
  })
})

describe('tinkerfundUpdates', () => {
  it('lists newest first, numbered in publishing order whatever the file order', () => {
    const updates = tinkerfundUpdates(
      [
        { title: 'Shipped', published: '-2d', body: 'Done.' },
        { title: 'Funded', published: '-9d', body: 'Thanks.' },
        { title: 'Tooling', published: '-5d', body: 'Moulds.' },
      ],
      NOW,
    )
    expect(updates.map((u) => [u.n, u.title, u.at])).toEqual([
      [3, 'Shipped', NOW - 48 * HOUR],
      [2, 'Tooling', NOW - 120 * HOUR],
      [1, 'Funded', NOW - 216 * HOUR],
    ])
  })

  it('splits the body into paragraphs at blank lines', () => {
    const [update] = tinkerfundUpdates([{ title: 'T', published: '-1d', body: 'One\nline.\n\nTwo.\n  \nThree.' }], NOW)
    expect(update!.paragraphs).toEqual(['One\nline.', 'Two.', 'Three.'])
  })
})

describe('formatTinkerfundAgo', () => {
  it('says hours within the first day, days after', () => {
    expect(formatTinkerfundAgo(NOW, NOW - 25 * HOUR)).toBe('1 day ago')
    expect(formatTinkerfundAgo(NOW, NOW - 11 * 24 * HOUR)).toBe('11 days ago')
    expect(formatTinkerfundAgo(NOW, NOW - 23 * HOUR)).toBe('23 hours ago')
    expect(formatTinkerfundAgo(NOW, NOW - HOUR)).toBe('1 hour ago')
  })

  it('says just now inside the hour', () => {
    expect(formatTinkerfundAgo(NOW, NOW - HOUR / 2)).toBe('just now')
  })
})

describe('tinkerfundAutomaticDeals', () => {
  const deal = { title: 'A tenth off', discount: { percent: 10 }, start: '-1d' }

  it('keeps Active automatic Promotions for this Campaign or the whole shop', () => {
    const shopWide = { ...deal, title: 'Everything', end: '+3d' }
    const mine = { ...deal, campaign: 'mug' }
    expect(tinkerfundAutomaticDeals([mine, shopWide], 'mug', NOW)).toEqual([mine, shopWide])
  })

  it('drops codes, other Campaigns, and Promotions not yet or no longer Active', () => {
    expect(tinkerfundAutomaticDeals([
      { ...deal, code: 'TINKER10' },
      { ...deal, campaign: 'rock' },
      { ...deal, start: '+2d' },
      { ...deal, start: '-9d', end: '-3d' },
    ], 'mug', NOW)).toEqual([])
  })
})

describe('formatTinkerfundDiscount', () => {
  it('reads a percentage or an amount off', () => {
    expect(formatTinkerfundDiscount({ percent: 15 }, 'en')).toBe('15% off')
    expect(formatTinkerfundDiscount({ amount: 5 }, 'en')).toBe('€5 off')
  })
})

describe('formatTinkerfundMoney', () => {
  it('shows whole euros without cents, and cents when there are any', () => {
    expect(formatTinkerfundMoney(27200, 'en')).toBe('€27,200')
    expect(formatTinkerfundMoney(13.5, 'en')).toBe('€13.50')
  })

  it('follows the visitor’s locale', () => {
    expect(tinkerfundLocale('de-DE,de;q=0.9,en;q=0.8')).toBe('de-DE')
    expect(formatTinkerfundMoney(27200, 'de-DE')).toBe('27.200 €')
  })
})

describe('formatTinkerfundMonth', () => {
  // A server and a browser in different time zones must agree on the month.
  it('names the month in UTC', () => {
    expect(formatTinkerfundMonth(Date.parse('2026-09-30T23:30:00Z'), 'en')).toBe('Sep 2026')
    expect(formatTinkerfundMonth(Date.parse('2026-10-01T00:30:00Z'), 'de-DE')).toBe('Okt. 2026')
  })
})

describe('tinkerfundLocale', () => {
  it('falls back to English when the browser names no usable locale', () => {
    expect(tinkerfundLocale(undefined)).toBe('en')
    expect(tinkerfundLocale('*')).toBe('en')
    expect(tinkerfundLocale('not a locale!')).toBe('en')
  })
})

describe('currentTinkerfundSection', () => {
  const at = (inView: string[], sticky: string[] = []) =>
    currentTinkerfundSection(['story', 'rewards', 'updates'].map((id) => ({ id, inView: inView.includes(id), sticky: sticky.includes(id) })))

  it('is the first section in view', () => {
    expect(at(['rewards'])).toBe('rewards')
    expect(at(['rewards', 'updates'])).toBe('rewards')
  })

  it('is none while no section is in view, so the last one holds', () => {
    expect(at([])).toBeUndefined()
  })

  // On desktop the Rewards column is sticky, so it is always in view (#1380).
  it('counts a sticky section only when nothing else is in view', () => {
    expect(at(['story', 'rewards'], ['rewards'])).toBe('story')
    expect(at(['rewards', 'updates'], ['rewards'])).toBe('updates')
    expect(at(['rewards'], ['rewards'])).toBe('rewards')
  })
})
