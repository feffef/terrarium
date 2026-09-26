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
} from '../../app/utils/campaign.ts'

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

describe('formatTinkerfundAgo', () => {
  const NOW = Date.parse('2026-06-01T12:00:00Z')
  const HOUR = 3_600_000

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
  const NOW = Date.parse('2026-06-01T12:00:00Z')
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
  const sections = (story: number, rewards: number, updates: number) => [
    { id: 'story', top: story },
    { id: 'rewards', top: rewards },
    { id: 'updates', top: updates },
  ]

  it('is the last section whose top has scrolled past the line', () => {
    expect(currentTinkerfundSection(sections(-900, -300, 400), 100)).toBe('rewards')
    expect(currentTinkerfundSection(sections(-900, -300, 100), 100)).toBe('updates')
  })

  it('is the first section before any has reached the line', () => {
    expect(currentTinkerfundSection(sections(400, 900, 1400), 100)).toBe('story')
  })

  // On desktop the Rewards column starts level with the Story.
  it('prefers the earlier section when two start level', () => {
    expect(currentTinkerfundSection(sections(-200, -200, 600), 100)).toBe('story')
  })
})
