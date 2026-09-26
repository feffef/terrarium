// Browsing the shop (story #1381): Discover's state lives in the URL query,
// and every list — Home's sections, Discover, Category, Deals — is derived
// from the baked Campaigns and Promotions at the page's "now".
import { describe, expect, it } from 'vitest'
import {
  parseTinkerfundBrowseQuery,
  tinkerfundBrowseRouteQuery,
  tinkerfundListings,
  browseTinkerfundListings,
  tinkerfundHomeSections,
  groupTinkerfundPromotions,
  tinkerfundStateLabel,
  tinkerfundRemaining,
  tinkerfundDeadline,
  tinkerfundPriceBounds,
} from '../../app/utils/browse.ts'
import { tinkerfundCount } from '../../app/utils/shop.ts'

const NOW = Date.parse('2026-06-01T12:00:00Z')
const HOUR = 3_600_000

function doc(slug: string, fields: { category?: string; launch: string; end: string; goal?: number; pledged?: number; backers?: number; prices?: number[] }) {
  return {
    path: `/campaigns/${slug}`,
    title: slug,
    description: `About ${slug}`,
    campaign: {
      registry: `TF-${slug.length.toString().padStart(4, '0')}`,
      inventor: 'test-inventor',
      category: fields.category ?? 'desk',
      goal: fields.goal ?? 1000,
      launch: fields.launch,
      end: fields.end,
      backers: fields.backers ?? 0,
      pledged: fields.pledged ?? 0,
      figures: [{ svg: `<path d="${slug}" />` }],
      rewards: (fields.prices ?? [20]).map((price) => ({ price })),
    },
  }
}

describe('the Discover query', () => {
  it('defaults to every Campaign, most popular first', () => {
    expect(parseTinkerfundBrowseQuery({})).toEqual({ sort: 'popular' })
    expect(tinkerfundBrowseRouteQuery({ sort: 'popular' })).toEqual({})
  })

  it('round-trips every filter and sort through the URL', () => {
    const query = { category: 'desk', state: 'live', soon: true, deal: true, min: 10, max: 60, sort: 'ending' } as const
    const url = tinkerfundBrowseRouteQuery(query)
    expect(url).toEqual({ category: 'desk', state: 'live', soon: '1', deal: '1', min: '10', max: '60', sort: 'ending' })
    expect(parseTinkerfundBrowseQuery(url)).toEqual(query)
  })

  it('drops values it does not understand rather than failing', () => {
    expect(parseTinkerfundBrowseQuery({
      category: 'Not A Slug', state: 'paused', soon: 'yes', deal: null, min: '-5', max: 'lots', sort: 'random',
    })).toEqual({ sort: 'popular' })
  })

  it('reads the first of a repeated key', () => {
    expect(parseTinkerfundBrowseQuery({ state: ['ended', 'live'], min: ['20', '30'] })).toEqual({ state: 'ended', min: 20, sort: 'popular' })
  })
})

describe('a Campaign listing', () => {
  it('carries what a card and a table row show', () => {
    const [lamp] = tinkerfundListings([doc('lamp', { launch: '-12d', end: '+36h', pledged: 1250, backers: 40, prices: [19, 5] })], [], NOW)
    expect(lamp).toMatchObject({
      path: '/campaigns/lamp', title: 'lamp', category: 'desk', inventor: 'test-inventor', figure: '<path d="lamp" />',
      pledged: 1250, goal: 1000, backers: 40, prices: [19, 5], promoted: false,
    })
    expect(lamp!.status).toMatchObject({ state: 'live', endingSoon: true, goalReached: true, percent: 125, endAt: NOW + 36 * HOUR })
  })

  it('is on Deal only while an Active Promotion names it', () => {
    const docs = [doc('a', { launch: '-1d', end: '+9d' }), doc('b', { launch: '-1d', end: '+9d' }), doc('c', { launch: '-1d', end: '+9d' })]
    const promotions = [
      { campaign: 'a', start: '-1d' },
      { campaign: 'b', start: '+2d', end: '+9d' },
      { campaign: 'c', start: '-9d', end: '-2d' },
      { start: '-30d' },
    ]
    expect(tinkerfundListings(docs, promotions, NOW).map((l) => [l.title, l.promoted])).toEqual([['a', true], ['b', false], ['c', false]])
  })
})

// Worked by hand against NOW: lamp ends in 36h, kettle launches in 3 days,
// ruler ended 30 days ago Funded, hammock ended an hour ago Unfunded.
const listings = tinkerfundListings([
  doc('lamp', { launch: '-12d', end: '+36h', goal: 1000, pledged: 1250, backers: 40, prices: [19, 5] }),
  doc('stapler', { launch: '-9d', end: '+21d', goal: 2500, pledged: 2500, backers: 110, prices: [15, 25, 1] }),
  doc('kettle', { category: 'workshop', launch: '+3d', end: '+33d', prices: [49] }),
  doc('ruler', { launch: '-60d', end: '-30d', goal: 500, pledged: 62400, backers: 2080, prices: [30] }),
  doc('hammock', { category: 'workshop', launch: '-31d', end: '-1h', goal: 20000, pledged: 4600, backers: 92, prices: [50] }),
], [{ campaign: 'stapler', start: '-1d' }], NOW)

describe('browsing Campaigns', () => {
  const titles = (query: Parameters<typeof browseTinkerfundListings>[1]) => browseTinkerfundListings(listings, query).map((l) => l.title)

  it('sorts Popular by Backers', () => {
    expect(titles({ sort: 'popular' })).toEqual(['ruler', 'stapler', 'hammock', 'lamp', 'kettle'])
  })

  it('sorts Ending soon by the next deadline: Live first, then Upcoming, then the most recently Ended', () => {
    expect(titles({ sort: 'ending' })).toEqual(['lamp', 'stapler', 'kettle', 'hammock', 'ruler'])
  })

  it('sorts Newest by launch, latest first', () => {
    expect(titles({ sort: 'newest' })).toEqual(['kettle', 'stapler', 'lamp', 'hammock', 'ruler'])
  })

  it('sorts Most funded by percent of goal', () => {
    expect(titles({ sort: 'funded' })).toEqual(['ruler', 'lamp', 'stapler', 'hammock', 'kettle'])
  })

  it('filters by category, state, Ending soon and On Deal', () => {
    expect(titles({ sort: 'popular', category: 'workshop' })).toEqual(['hammock', 'kettle'])
    expect(titles({ sort: 'popular', state: 'ended' })).toEqual(['ruler', 'hammock'])
    expect(titles({ sort: 'popular', soon: true })).toEqual(['lamp'])
    expect(titles({ sort: 'popular', deal: true })).toEqual(['stapler'])
    expect(titles({ sort: 'popular', category: 'workshop', state: 'live' })).toEqual([])
  })

  it('keeps a Campaign with any Reward inside the price range', () => {
    expect(titles({ sort: 'popular', min: 20, max: 29 })).toEqual(['stapler'])
    expect(titles({ sort: 'popular', min: 45 })).toEqual(['hammock', 'kettle'])
    expect(titles({ sort: 'popular', max: 5 })).toEqual(['stapler', 'lamp'])
  })

  it('keeps a Campaign with no Rewards until a price range is set', () => {
    const support = tinkerfundListings([doc('support', { launch: '-1d', end: '+9d', prices: [] })], [], NOW)
    expect(browseTinkerfundListings(support, { sort: 'popular' }).map((l) => l.title)).toEqual(['support'])
    expect(browseTinkerfundListings(support, { sort: 'popular', min: 1 })).toEqual([])
  })
})

describe('the Reward price range', () => {
  it('spans the cheapest to the dearest Reward on offer', () => {
    expect(tinkerfundPriceBounds(listings)).toEqual({ min: 1, max: 50 })
    expect(tinkerfundPriceBounds([])).toEqual({ min: 0, max: 0 })
  })
})

describe('Home', () => {
  const titles = (list: { title: string }[]) => list.map((l) => l.title)

  it('features the Live Campaign furthest past its goal', () => {
    expect(tinkerfundHomeSections(listings, NOW).featured?.title).toBe('lamp')
  })

  it('lists what ends within 48 hours, what is popular now, and what launched in the last two weeks', () => {
    const home = tinkerfundHomeSections(listings, NOW)
    expect(titles(home.endingSoon)).toEqual(['lamp'])
    expect(titles(home.popular)).toEqual(['stapler', 'lamp', 'kettle'])
    expect(titles(home.justLaunched)).toEqual(['stapler', 'lamp'])
  })

  it('leaves a section empty when nothing fits, so it can hide', () => {
    const quiet = tinkerfundHomeSections(tinkerfundListings([doc('old', { launch: '-15d', end: '+15d' })], [], NOW), NOW)
    expect(quiet.featured?.title).toBe('old')
    expect(quiet.endingSoon).toEqual([])
    expect(quiet.justLaunched).toEqual([])
    expect(tinkerfundHomeSections([], NOW)).toEqual({ featured: undefined, endingSoon: [], popular: [], justLaunched: [] })
  })
})

describe('Deals', () => {
  it('lists Active Promotions ending soonest first, then Scheduled ones starting soonest first, and drops Expired ones', () => {
    const deals = groupTinkerfundPromotions([
      { title: 'forever', start: '-30d' },
      { title: 'expired', start: '-30d', end: '-3d' },
      { title: 'week', start: '-1d', end: '+6d' },
      { title: 'day', start: '-1d', end: '+1d' },
      { title: 'later', start: '+5d' },
      { title: 'soon', start: '+2d', end: '+9d' },
    ], NOW)
    expect(deals.active.map((p) => p.title)).toEqual(['day', 'week', 'forever'])
    expect(deals.active[0]).toMatchObject({ startAt: NOW - 24 * HOUR, endAt: NOW + 24 * HOUR })
    expect(deals.active[2]!.endAt).toBeUndefined()
    expect(deals.scheduled.map((p) => p.title)).toEqual(['soon', 'later'])
  })

  it('counts Campaigns in the singular and plural', () => {
    expect([0, 1, 6].map((n) => tinkerfundCount(n, 'Campaign'))).toEqual(['0 Campaigns', '1 Campaign', '6 Campaigns'])
  })
})

describe('a listing’s status copy', () => {
  const byTitle = (title: string) => listings.find((l) => l.title === title)!.status

  it('names the state, or the outcome once Ended', () => {
    expect(['lamp', 'kettle', 'ruler', 'hammock'].map((t) => tinkerfundStateLabel(byTitle(t)))).toEqual(['Live', 'Upcoming', 'Funded', 'Unfunded'])
  })

  it('counts down to the end, or to the launch, at the given clock', () => {
    expect(tinkerfundRemaining(byTitle('lamp'), NOW)).toBe('1 day 12 hours')
    expect(tinkerfundRemaining(byTitle('lamp'), NOW + 13 * HOUR)).toBe('0 days 23 hours')
    expect(tinkerfundRemaining(byTitle('kettle'), NOW)).toBe('Launches in 3 days 0 hours')
    expect(tinkerfundRemaining(byTitle('ruler'), NOW)).toBe('Ended')
  })

  it('dates the launch while Upcoming, else the end', () => {
    expect(tinkerfundDeadline(byTitle('kettle'))).toEqual({ label: 'Launches', at: NOW + 72 * HOUR })
    expect(tinkerfundDeadline(byTitle('lamp'))).toEqual({ label: 'Ends', at: NOW + 36 * HOUR })
    expect(tinkerfundDeadline(byTitle('hammock'))).toEqual({ label: 'Ended', at: NOW - HOUR })
  })
})
