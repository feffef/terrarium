// Browsing the shop (story #1381): Home's sections, Discover, Category and
// Deals, all derived from baked content at the page's "now" (issue #1364).
import type { z } from 'zod'
import type { campaign } from '../../schemas'
import { tinkerfundNamedCampaigns, tinkerfundRecentBackers, type TinkerfundPromotionTerms } from './campaign'
import { formatTinkerfundCountdown, resolveTinkerfundOffset, tinkerfundCountdown } from './clock'
import { tinkerfundSlug } from './shop'
import { campaignPriceFrom, deriveCampaignStatus, derivePromotionState, type CampaignState, type CampaignStatus } from './status'

export const TINKERFUND_SORTS = {
  popular: 'Popular',
  ending: 'Ending soon',
  newest: 'Newest',
  funded: 'Most funded',
} as const
export type TinkerfundSort = keyof typeof TINKERFUND_SORTS

/** Discover's state; it lives in the URL query (issue #1367). */
export interface TinkerfundBrowseQuery {
  category?: string
  state?: CampaignState
  soon?: true
  deal?: true
  /** Bounds on Reward price, in EUR. */
  min?: number
  max?: number
  sort: TinkerfundSort
}

type RouteQueryValue = string | null | (string | null)[] | undefined

function first(value: RouteQueryValue): string | undefined {
  return (Array.isArray(value) ? value[0] : value) ?? undefined
}

function price(value: RouteQueryValue): number | undefined {
  const text = first(value)
  return text && /^\d+$/.test(text) ? Number(text) : undefined
}

export function parseTinkerfundBrowseQuery(raw: Record<string, RouteQueryValue>): TinkerfundBrowseQuery {
  const category = first(raw.category)
  const state = first(raw.state)
  const sort = first(raw.sort)
  const query: TinkerfundBrowseQuery = {
    sort: sort && sort in TINKERFUND_SORTS ? (sort as TinkerfundSort) : 'popular',
  }
  if (category && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(category)) query.category = category
  if (state === 'upcoming' || state === 'live' || state === 'ended') query.state = state
  if (first(raw.soon) === '1') query.soon = true
  if (first(raw.deal) === '1') query.deal = true
  const min = price(raw.min)
  const max = price(raw.max)
  if (min !== undefined) query.min = min
  if (max !== undefined) query.max = max
  return query
}

/** The URL query for `query`, leaving out every default. */
export function tinkerfundBrowseRouteQuery(query: TinkerfundBrowseQuery): Record<string, string> {
  const out: Record<string, string> = {}
  if (query.category) out.category = query.category
  if (query.state) out.state = query.state
  if (query.soon) out.soon = '1'
  if (query.deal) out.deal = '1'
  if (query.min !== undefined) out.min = String(query.min)
  if (query.max !== undefined) out.max = String(query.max)
  if (query.sort !== 'popular') out.sort = query.sort
  return out
}

type Campaign = z.infer<typeof campaign>

type Stock = Pick<Campaign['rewards'][number], 'id' | 'price' | 'claimed'>
const stock = ({ id, price, claimed }: Stock): Stock => ({ id, price, claimed })

/** What a card or table row reads of a Campaign, counting the Backer's Pledges included. */
export function tinkerfundBrowseCampaign(c: Campaign) {
  const { registry, inventor, category, goal, launch, end, backers, pledged, recent, alsoBacked } = c
  return {
    registry, inventor, category, goal, launch, end, backers, pledged, recent, alsoBacked,
    figures: c.figures.slice(0, 1).map(({ svg }) => ({ svg })),
    rewards: c.rewards.map(stock),
    addons: c.addons?.map(stock),
  }
}

interface TinkerfundCampaignDoc {
  path: string
  title: string
  description?: string
  campaign: Pick<Campaign, 'registry' | 'inventor' | 'category' | 'goal' | 'launch' | 'end' | 'backers' | 'pledged' | 'recent' | 'alsoBacked'> & {
    figures: Pick<Campaign['figures'][number], 'svg'>[]
    rewards: Pick<Campaign['rewards'][number], 'price'>[]
  }
}

type PromotionTiming = Pick<TinkerfundPromotionTerms, 'campaign' | 'bundle' | 'start' | 'end'>

/** What a Campaign card or an index-table row shows. */
export interface TinkerfundListing {
  path: string
  title: string
  description?: string
  registry: string
  category: string
  inventor: string
  /** FIG. 1, always isometric (issue #1363). */
  figure: string
  goal: number
  pledged: number
  backers: number
  /** Named Backers, newest first. */
  named: string[]
  alsoBacked?: string[]
  prices: number[]
  priceFrom?: number
  status: CampaignStatus
  /** An Active Promotion names this Campaign, a bundle in its list; the shop calls it a Deal. */
  promoted: boolean
}

export function tinkerfundListings(
  docs: TinkerfundCampaignDoc[],
  promotions: PromotionTiming[],
  now: number,
): TinkerfundListing[] {
  const promoted = new Set(
    promotions.filter((p) => derivePromotionState(p, now) === 'active').flatMap(tinkerfundNamedCampaigns),
  )
  return docs.map(({ path, title, description, campaign: c }) => ({
    path,
    title,
    description,
    registry: c.registry,
    category: c.category,
    inventor: c.inventor,
    figure: c.figures[0]?.svg ?? '',
    goal: c.goal,
    pledged: c.pledged,
    backers: c.backers,
    named: tinkerfundRecentBackers(c.recent, now).map((r) => r.name),
    alsoBacked: c.alsoBacked,
    prices: c.rewards.map((r) => r.price),
    priceFrom: campaignPriceFrom(c.rewards),
    status: deriveCampaignStatus(c, c.pledged, now),
    promoted: promoted.has(tinkerfundSlug(path)),
  }))
}

/** The slugs of the Live Campaigns among these listings. */
export const tinkerfundLive = (listings: Pick<TinkerfundListing, 'path' | 'status'>[]) =>
  listings.filter((l) => l.status.state === 'live').map((l) => tinkerfundSlug(l.path))

export const TINKERFUND_STATE_LABELS = { upcoming: 'Upcoming', live: 'Live', ended: 'Ended', funded: 'Funded', unfunded: 'Unfunded' } as const

/** The state, or the outcome once Ended. */
export function tinkerfundStateLabel(status: CampaignStatus): string {
  return TINKERFUND_STATE_LABELS[status.outcome ?? status.state]
}

const DEADLINE_LABELS = { upcoming: 'Launches', live: 'Ends', ended: 'Ended' } as const
const COUNTDOWN_LABELS = { upcoming: `${DEADLINE_LABELS.upcoming} in`, live: 'Remaining' } as const

export function tinkerfundDeadline(status: CampaignStatus): { label: (typeof DEADLINE_LABELS)[CampaignState]; at: number } {
  return { label: DEADLINE_LABELS[status.state], at: status.state === 'upcoming' ? status.launchAt : status.endAt }
}

/** `clock` may tick past the page's "now"; the state stays fixed (issue #1364). */
export function tinkerfundTimeLeft(status: CampaignStatus, clock: number) {
  if (status.state === 'ended') return undefined
  const { at } = tinkerfundDeadline(status)
  return { label: COUNTDOWN_LABELS[status.state], text: formatTinkerfundCountdown(tinkerfundCountdown(clock, at)), at }
}

export function tinkerfundRemaining(status: CampaignStatus, clock: number): string {
  const left = tinkerfundTimeLeft(status, clock)
  if (!left) return DEADLINE_LABELS.ended
  return status.state === 'upcoming' ? `${left.label} ${left.text}` : left.text
}

const STATE_ORDER = { live: 0, upcoming: 1, ended: 2 } as const

/** Ending soon orders by the next deadline: a Live Campaign's end, an
 *  Upcoming one's launch; Ended ones follow, most recent first. */
function deadline({ status }: TinkerfundListing): number {
  if (status.state === 'ended') return -status.endAt
  return status.state === 'live' ? status.endAt : status.launchAt
}

const COMPARE: Record<TinkerfundSort, (a: TinkerfundListing, b: TinkerfundListing) => number> = {
  popular: (a, b) => b.backers - a.backers,
  ending: (a, b) => STATE_ORDER[a.status.state] - STATE_ORDER[b.status.state] || deadline(a) - deadline(b),
  newest: (a, b) => b.status.launchAt - a.status.launchAt,
  funded: (a, b) => b.status.percent - a.status.percent,
}

export function browseTinkerfundListings<T extends TinkerfundListing>(listings: T[], query: TinkerfundBrowseQuery): T[] {
  const { category, state, soon, deal, min, max } = query
  const priced = min !== undefined || max !== undefined
  return listings
    .filter((l) =>
      (!category || l.category === category)
      && (!state || l.status.state === state)
      && (!soon || l.status.endingSoon)
      && (!deal || l.promoted)
      && (!priced || l.prices.some((p) => p >= (min ?? 0) && p <= (max ?? Infinity))),
    )
    .sort((a, b) => COMPARE[query.sort](a, b) || a.registry.localeCompare(b.registry))
}

export function tinkerfundPriceBounds(listings: TinkerfundListing[]): { min: number; max: number } {
  const prices = listings.flatMap((l) => l.prices)
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : { min: 0, max: 0 }
}

const JUST_LAUNCHED = resolveTinkerfundOffset('+14d', 0)

/** Home's lists, in page order (issue #1367); an empty one hides its section. */
export function tinkerfundHomeSections<T extends TinkerfundListing>(listings: T[], now: number) {
  const live = listings.filter((l) => l.status.state === 'live')
  const featured = browseTinkerfundListings(live, { sort: 'funded' })[0]
  return {
    featured,
    endingSoon: browseTinkerfundListings(live, { sort: 'ending', soon: true }),
    popular: browseTinkerfundListings(listings.filter((l) => l.status.state !== 'ended'), { sort: 'popular' }),
    justLaunched: browseTinkerfundListings(live.filter((l) => l !== featured && l.status.launchAt > now - JUST_LAUNCHED), { sort: 'newest' }),
  }
}

/** Active Promotions, ending soonest first (open-ended last), and Scheduled
 *  ones, starting soonest first. */
export function groupTinkerfundPromotions<T extends PromotionTiming>(promotions: T[], now: number) {
  const timed = promotions.map((p) => ({
    ...p,
    startAt: resolveTinkerfundOffset(p.start, now),
    endAt: p.end ? resolveTinkerfundOffset(p.end, now) : undefined,
    state: derivePromotionState(p, now),
  }))
  return {
    active: timed.filter((p) => p.state === 'active').sort((a, b) => (a.endAt ?? Infinity) - (b.endAt ?? Infinity)),
    scheduled: timed.filter((p) => p.state === 'scheduled').sort((a, b) => a.startAt - b.startAt),
  }
}

export const TINKERFUND_RECOMMENDATIONS = {
  also: 'Backers also backed',
  more: 'More from this category',
  similar: 'More like this',
} as const

const RECOMMENDED = 4

/** Live and Upcoming first, then Ended; at most a row's worth (issue #1387). */
function recommend<T extends TinkerfundListing>(listings: T[]): T[] {
  return browseTinkerfundListings(listings, { sort: 'ending' }).slice(0, RECOMMENDED)
}

function bySlug<T extends TinkerfundListing>(listings: T[], slugs: Iterable<string>): T[] {
  const index = new Map(listings.map((l) => [tinkerfundSlug(l.path), l]))
  return [...new Set(slugs)].flatMap((s) => index.get(s) ?? [])
}

/** A Campaign page's "Backers also backed", then "More from this category"
 *  without the Campaigns the first already shows. */
export function tinkerfundRecommendations<T extends TinkerfundListing>(listings: T[], slug: string) {
  const self = bySlug(listings, [slug])[0]
  const also = bySlug(listings, self?.alsoBacked ?? []).slice(0, RECOMMENDED)
  const shown = new Set([self, ...also])
  return { also, more: recommend(listings.filter((l) => l.category === self?.category && !shown.has(l))) }
}

/** The Cart's one row: what its Campaigns' Backers also backed, else more
 *  from their categories; never what the Cart already holds. */
export function tinkerfundCartRecommendations<T extends TinkerfundListing>(listings: T[], inCart: string[]) {
  const held = bySlug(listings, inCart)
  const fresh = (l: T) => !held.includes(l)
  const also = bySlug(listings, held.flatMap((l) => l.alsoBacked ?? [])).filter(fresh).slice(0, RECOMMENDED)
  if (also.length) return { title: TINKERFUND_RECOMMENDATIONS.also, cards: also }
  const categories = new Set(held.map((l) => l.category))
  return { title: TINKERFUND_RECOMMENDATIONS.similar, cards: recommend(listings.filter((l) => categories.has(l.category) && fresh(l))) }
}
