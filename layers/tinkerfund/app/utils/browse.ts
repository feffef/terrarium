// Browsing the shop (story #1381): Home's sections, Discover, Category and
// Deals, all derived from baked content at the page's "now" (issue #1364).
import type { z } from 'zod'
import type { campaign } from '../../schemas'
import type { TinkerfundPromotionTerms } from './campaign'
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

export interface TinkerfundCampaignDoc {
  path: string
  title: string
  description?: string
  campaign: Pick<Campaign, 'registry' | 'inventor' | 'category' | 'goal' | 'launch' | 'end' | 'backers' | 'pledged'> & {
    figures: Pick<Campaign['figures'][number], 'svg'>[]
    rewards: Pick<Campaign['rewards'][number], 'price'>[]
  }
}

type PromotionTiming = Pick<TinkerfundPromotionTerms, 'campaign' | 'start' | 'end'>

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
  prices: number[]
  priceFrom?: number
  status: CampaignStatus
  /** An Active Promotion names this Campaign; the shop calls it a Deal. */
  promoted: boolean
}

export function tinkerfundListings(
  docs: TinkerfundCampaignDoc[],
  promotions: PromotionTiming[],
  now: number,
): TinkerfundListing[] {
  const promoted = new Set(
    promotions.filter((p) => p.campaign && derivePromotionState(p, now) === 'active').map((p) => p.campaign),
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
    prices: c.rewards.map((r) => r.price),
    priceFrom: campaignPriceFrom(c.rewards),
    status: deriveCampaignStatus(c, c.pledged, now),
    promoted: promoted.has(tinkerfundSlug(path)),
  }))
}

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
  return {
    featured: browseTinkerfundListings(live, { sort: 'funded' })[0],
    endingSoon: browseTinkerfundListings(live, { sort: 'ending', soon: true }),
    popular: browseTinkerfundListings(listings.filter((l) => l.status.state !== 'ended'), { sort: 'popular' }),
    justLaunched: browseTinkerfundListings(live.filter((l) => l.status.launchAt > now - JUST_LAUNCHED), { sort: 'newest' }),
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

