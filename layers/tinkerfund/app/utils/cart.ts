// The Backer's Cart (story #1383), and what every Backer step shares: the
// baked shop it reads and the Cart and Pledges it adds up to (issue #1359).
import { z } from 'zod'
import { TINKERFUND_SOLD_OUT, tinkerfundStock } from './campaign'
import type { TinkerfundPromotionTerms } from './campaign'
import { deriveCampaignState } from './status'

const id = z.string().min(1)
const quantity = z.number().int().positive()

export const tinkerfundZone = z.enum(['domestic', 'europe', 'world'])
export type TinkerfundZone = z.infer<typeof tinkerfundZone>

/** What a Pledge holds, shaped like a Pledge in `backer` (issue #1365). */
export const tinkerfundPledgeContents = z.object({
  lines: z.array(z.object({ reward: id, options: z.record(id, id), quantity })),
  addons: z.array(z.object({ id, quantity })),
  bonus: z.number().positive().optional(),
})
export type TinkerfundPledgeContents = z.infer<typeof tinkerfundPledgeContents>
type Line = TinkerfundPledgeContents['lines'][number]
type AddonLine = TinkerfundPledgeContents['addons'][number]

/** A change to the Cart: a positive amount adds, a negative one takes away. */
export const tinkerfundCartRequest = z.union([
  z.object({ campaign: id, reward: id, options: z.record(id, id), quantity: z.number().int() }),
  z.object({ campaign: id, addon: id, quantity: z.number().int() }),
  z.object({ campaign: id, bonus: z.number() }),
])
export type TinkerfundCartRequest = z.infer<typeof tinkerfundCartRequest>

/** One draft Pledge per Campaign. */
export type TinkerfundDraft = TinkerfundPledgeContents & { campaign: string }

export interface TinkerfundPledge extends TinkerfundDraft {
  ref: string
  placed: number
  zone: TinkerfundZone
  payment: string
  /** The Promotions it earned at checkout: their terms, not an amount, so its discount follows what it holds. */
  promotions: string[]
  discount: number
  shipping: number
  /** When the Backer cancelled it (story #1385): it stays on the account, counting for nothing. */
  cancelled?: number
}

/** A past Pledge as baked into the `backer` collection. */
export interface TinkerfundBakedPledge {
  ref: string
  campaign: string
  placed: string
  zone: TinkerfundZone
  lines: { reward: string; options?: Record<string, string>; quantity: number }[]
  addons?: AddonLine[]
  bonus?: number
}

interface Item {
  id: string
  title: string
  price: number
  claimed: number
  stock?: number
}

interface Reward extends Item {
  limit?: number
  options?: { id: string; name: string; choices: { id: string; label: string }[] }[]
  shipsTo?: TinkerfundZone[]
  delivery: string
}

/** What the Backer's steps need of a Campaign: its baked content, figures left out. */
export interface TinkerfundCatalogCampaign {
  launch: string
  end: string
  goal: number
  pledged: number
  backers: number
  rewards: Reward[]
  addons?: Item[]
  shipping: Partial<Record<TinkerfundZone, number>>
}

export type TinkerfundCatalog = Record<string, { title: string; campaign: TinkerfundCatalogCampaign }>

/** What every Backer step reads: the baked shop at one "now". */
export interface TinkerfundShop {
  catalog: TinkerfundCatalog
  baked: TinkerfundBakedPledge[]
  promotions: TinkerfundPromotionTerms[]
  /** Baked Pledges carry no payment, so they read as paid with this, the shop's first demo method. */
  payment: string
  now: number
}

export interface TinkerfundBackerState {
  cart: TinkerfundDraft[]
  /** Every Pledge the demo Backer holds, baked ones included. */
  pledges: TinkerfundPledge[]
}

/** A step's outcome: the next state, or the same one and why not. */
export interface TinkerfundStep {
  state: TinkerfundBackerState
  error?: string
  refs?: string[]
}

export const TINKERFUND_GONE = 'No longer available'
export const TINKERFUND_NEEDS_REWARD = 'Add-ons need a Reward from this Campaign'
export const tinkerfundLimitNotice = (limit: number, pledged = 0) =>
  `Max ${limit} per Backer${pledged ? `: your Pledge already holds ${pledged}` : ''}`
export const tinkerfundDoesntShip = (title: string) => `${title} doesn’t ship there`
export const tinkerfundPledgeDoesntShip = (titles: string[], zone: string) =>
  `Your Pledge already holds ${titles.join(', ')}, which ${titles.length === 1 ? 'doesn’t' : 'don’t'} ship to ${zone}`

export const tinkerfundCents = (amount: number) => Math.round(amount * 100) / 100
export const tinkerfundSum = (xs: number[]) => tinkerfundCents(xs.reduce((a, b) => a + b, 0))

export function tinkerfundHeld(lines: Pick<Line, 'reward' | 'quantity'>[], reward: string): number {
  return tinkerfundSum(lines.filter((l) => l.reward === reward).map((l) => l.quantity))
}

export function tinkerfundShipsTo(reward: Pick<Reward, 'shipsTo'>, zone: TinkerfundZone): boolean {
  return !reward.shipsTo || reward.shipsTo.includes(zone)
}

type Limited = { stock?: number; claimed: number; limit?: number }

/** How many more the Backer may have, `pledged` being what their Pledge already holds. */
export function tinkerfundMaxQuantity(item: Limited, pledged = 0): number {
  return Math.max(0, Math.min((item.limit ?? Infinity) - pledged, tinkerfundStock(item).left ?? Infinity))
}

/** Why `wanted` more of an item can't be had, if it can't. Stock is only taken at checkout (issue #1365). */
export function tinkerfundShortfall(item: Limited, wanted: number, pledged = 0): string | undefined {
  const { left } = tinkerfundStock(item)
  if (left === 0) return TINKERFUND_SOLD_OUT
  if (item.limit !== undefined && wanted + pledged > item.limit) return tinkerfundLimitNotice(item.limit, pledged)
  if (left !== undefined && wanted > left) return `Only ${left} left`
}

/** Every option group answered with one of its own choices, and nothing else. */
export function tinkerfundValidOptions(reward: Reward, options: Record<string, string>): boolean {
  const groups = reward.options ?? []
  return (
    Object.keys(options).length === groups.length &&
    groups.every((g) => g.choices.some((c) => c.id === options[g.id]))
  )
}

/** "Colour: White", for a Reward line whose options are already valid. */
export function tinkerfundOptionsLabel(reward: Reward, options: Record<string, string>): string | undefined {
  return reward.options?.map((g) => `${g.name}: ${g.choices.find((c) => c.id === options[g.id])?.label}`).join(' · ') || undefined
}

const optionsKey = (options: Record<string, string>) => Object.entries(options).sort().join(';')

type LineRef = { campaign: string; reward: string; options: Record<string, string> } | { campaign: string; addon: string }

export function tinkerfundCartLineKey(ref: LineRef): string {
  if ('addon' in ref) return `${ref.campaign}/addon:${ref.addon}`
  return `${ref.campaign}/reward:${ref.reward}:${optionsKey(ref.options)}`
}

function merge<T extends { quantity: number }>(into: T[], add: T[], key: (item: T) => string): T[] {
  const out = [...into]
  for (const item of add) {
    const i = out.findIndex((x) => key(x) === key(item))
    if (i < 0) out.push(item)
    else out[i] = { ...out[i]!, quantity: out[i]!.quantity + item.quantity }
  }
  return out.filter((x) => x.quantity > 0)
}

/** `into` with `add`'s quantities added, a Reward's lines matched by their options; lines left empty go. */
export const mergeTinkerfundLines = (into: Line[], add: Line[]) => merge(into, add, (l) => `${l.reward}:${optionsKey(l.options)}`)
export const mergeTinkerfundAddons = (into: AddonLine[], add: AddonLine[]) => merge(into, add, (a) => a.id)

/** A Pledge's flat shipping (issue #1365): the zone's rate once any of its Rewards ships. */
export function tinkerfundShipping(lines: { reward: string }[], campaign: TinkerfundCatalogCampaign, zone: TinkerfundZone): number {
  return lines.some((l) => campaign.rewards.find((r) => r.id === l.reward)?.shipsTo) ? campaign.shipping[zone] ?? 0 : 0
}

/** Rewards and Add-ons at their prices: what discounts come off, never bonus support (issue #1365). */
export function tinkerfundGoods(contents: Pick<TinkerfundPledgeContents, 'lines' | 'addons'>, campaign: TinkerfundCatalogCampaign): number {
  return tinkerfundSum([
    ...contents.lines.map((l) => (campaign.rewards.find((r) => r.id === l.reward)?.price ?? 0) * l.quantity),
    ...contents.addons.map((a) => (campaign.addons?.find((x) => x.id === a.id)?.price ?? 0) * a.quantity),
  ])
}

/** A fixed amount comes off once, a percentage off all the goods, and never more than the goods. */
export function tinkerfundDiscount(goods: number, terms: Pick<TinkerfundPromotionTerms, 'discount'>[]): number {
  return Math.min(goods, tinkerfundSum(terms.map(({ discount: d }) => ('percent' in d ? (goods * d.percent) / 100 : d.amount))))
}

/** The Pledge's discount and shipping, always worked out afresh from what it holds, its zone and the terms it earned. */
export function settleTinkerfundPledge(pledge: Omit<TinkerfundPledge, 'discount' | 'shipping'>, shop: Pick<TinkerfundShop, 'catalog' | 'promotions'>): TinkerfundPledge {
  const campaign = shop.catalog[pledge.campaign]?.campaign
  if (!campaign) return { ...pledge, discount: 0, shipping: 0 }
  const terms = shop.promotions.filter((p) => pledge.promotions.includes(p.id))
  return { ...pledge, discount: tinkerfundDiscount(tinkerfundGoods(pledge, campaign), terms), shipping: tinkerfundShipping(pledge.lines, campaign, pledge.zone) }
}

export function tinkerfundClosedReason(campaign: Pick<TinkerfundCatalogCampaign, 'launch' | 'end'>, now: number): string | undefined {
  const state = deriveCampaignState(campaign, now)
  if (state === 'upcoming') return 'Opens at launch'
  if (state === 'ended') return 'Pledging has closed'
}

type Totals = { pledged: number; backers: number; rewards: Pick<Item, 'id' | 'price' | 'claimed'>[]; addons?: Pick<Item, 'id' | 'price' | 'claimed'>[] }
type Counted = Pick<TinkerfundBakedPledge, 'lines' | 'addons' | 'bonus'> & { discount?: number }

/**
 * A Campaign's totals and stock with the Backer's Pledges counted (issue
 * #1364): what a Pledge raises is its Rewards, Add-ons and bonus less its
 * discount; shipping raises nothing. The baked totals already hold the baked
 * Pledges, so a Pledge counts only its difference from its baked self; a
 * cancelled one counts as empty, so a cancel can pull a Campaign back below
 * its goal (story #1385).
 */
export function withTinkerfundPledges<C extends Totals>(slug: string, campaign: C, pledges: TinkerfundPledge[], baked: TinkerfundBakedPledge[]): C {
  const mine = pledges.filter((p) => p.campaign === slug)
  if (!mine.length) return campaign
  const current = (p: TinkerfundPledge): Counted | undefined => (p.cancelled === undefined ? p : undefined)
  const bakedAs = (p: TinkerfundPledge): Counted | undefined => baked.find((b) => b.ref === p.ref)
  const rewardsIn = (p: Counted | undefined, id: string) => tinkerfundHeld(p?.lines ?? [], id)
  const addonsIn = (p: Counted | undefined, id: string) => p?.addons?.find((a) => a.id === id)?.quantity ?? 0
  const amount = (p: Counted | undefined) =>
    p
      ? tinkerfundSum([
          ...campaign.rewards.map((r) => r.price * rewardsIn(p, r.id)),
          ...(campaign.addons ?? []).map((a) => a.price * addonsIn(p, a.id)),
          p.bonus ?? 0,
          -(p.discount ?? 0),
        ])
      : 0
  const change = (of: (p: Counted | undefined) => number) => mine.reduce((n, p) => n + of(current(p)) - of(bakedAs(p)), 0)

  return {
    ...campaign,
    pledged: tinkerfundCents(campaign.pledged + change(amount)),
    backers: campaign.backers + change((p) => Number(!!p)),
    rewards: campaign.rewards.map((r) => ({ ...r, claimed: r.claimed + change((p) => rewardsIn(p, r.id)) })),
    ...(campaign.addons ? { addons: campaign.addons.map((a) => ({ ...a, claimed: a.claimed + change((p) => addonsIn(p, a.id)) })) } : {}),
  }
}

/** The catalog with the Backer's Pledges counted into totals and stock. */
export function tinkerfundCountedCatalog(shop: Pick<TinkerfundShop, 'catalog' | 'baked'>, pledges: TinkerfundPledge[]): TinkerfundCatalog {
  return Object.fromEntries(Object.entries(shop.catalog).map(([slug, entry]) =>
    [slug, { ...entry, campaign: withTinkerfundPledges(slug, entry.campaign, pledges, shop.baked) }]))
}

/** The Pledge a Campaign already has: one per Campaign, unless it was cancelled (issue #1365). */
export function tinkerfundPledgeFor(pledges: TinkerfundPledge[], campaign: string): TinkerfundPledge | undefined {
  return pledges.find((p) => p.campaign === campaign && p.cancelled === undefined)
}

export function addToTinkerfundCart(state: TinkerfundBackerState, request: TinkerfundCartRequest, shop: TinkerfundShop): TinkerfundStep {
  const refuse = (error: string) => ({ state, error })
  const campaign = tinkerfundCountedCatalog(shop, state.pledges)[request.campaign]?.campaign
  if (!campaign) return refuse(TINKERFUND_GONE)
  const adding = ('bonus' in request ? request.bonus : request.quantity) > 0
  const closed = adding ? tinkerfundClosedReason(campaign, shop.now) : undefined
  if (closed) return refuse(closed)

  const old = state.cart.find((d) => d.campaign === request.campaign)
  const draft: TinkerfundDraft = old ? { ...old } : { campaign: request.campaign, lines: [], addons: [] }

  if ('bonus' in request) {
    const bonus = tinkerfundCents((draft.bonus ?? 0) + request.bonus)
    if (bonus > 0) draft.bonus = bonus
    else delete draft.bonus
  } else if ('reward' in request) {
    const reward = campaign.rewards.find((r) => r.id === request.reward)
    if (!reward || !tinkerfundValidOptions(reward, request.options)) return refuse(TINKERFUND_GONE)
    draft.lines = mergeTinkerfundLines(draft.lines, [{ reward: reward.id, options: { ...request.options }, quantity: request.quantity }])
    const pledged = tinkerfundHeld(tinkerfundPledgeFor(state.pledges, request.campaign)?.lines ?? [], reward.id)
    const short = adding ? tinkerfundShortfall(reward, tinkerfundHeld(draft.lines, reward.id), pledged) : undefined
    if (short) return refuse(short)
  } else {
    const addon = campaign.addons?.find((a) => a.id === request.addon)
    if (!addon) return refuse(TINKERFUND_GONE)
    if (adding && !draft.lines.length) return refuse(TINKERFUND_NEEDS_REWARD)
    draft.addons = mergeTinkerfundAddons(draft.addons, [{ id: addon.id, quantity: request.quantity }])
    const short = adding ? tinkerfundShortfall(addon, draft.addons.find((a) => a.id === addon.id)?.quantity ?? 0) : undefined
    if (short) return refuse(short)
  }

  const empty = !draft.lines.length && !draft.addons.length && !draft.bonus
  const others = state.cart.filter((d) => d !== old)
  const cart = empty ? others : old ? state.cart.map((d) => (d === old ? draft : d)) : [...state.cart, draft]
  return { state: { ...state, cart } }
}

export interface TinkerfundCartLine {
  key: string
  ref: LineRef
  title: string
  detail?: string
  price: number
  /** What is shown: the stored quantity, trimmed to `max` while the line is available. */
  quantity: number
  stored: number
  max: number
  amount: number
  unavailable?: string
  ships: boolean
}

/** The request that brings `line` to `quantity`, measured from what is stored, not what is shown. */
export function setTinkerfundLine(line: TinkerfundCartLine, quantity: number): TinkerfundCartRequest {
  return { ...line.ref, quantity: quantity - line.stored }
}

export interface TinkerfundCartGroup {
  campaign: string
  title: string
  lines: TinkerfundCartLine[]
  bonus?: number
  closed?: string
  /** The Pledge this Campaign already has, which checkout adds to (issue #1365). */
  existing?: TinkerfundPledge
  /** Rewards `existing` holds that don't ship to the zone it would move to. */
  unshipped: string[]
  subtotal: number
  /** What shipping the Pledge adds: it pays its zone's rate once, and moving zone re-rates all of it. */
  shipping: number
}

export interface TinkerfundCartView {
  groups: TinkerfundCartGroup[]
  count: number
  subtotal: number
  shipping: number
  total: number
}

/** Unknown ids are dropped quietly; what is known but can't be had stays, flagged and unpriced (issue #1366). */
export function resolveTinkerfundCart(state: TinkerfundBackerState, shop: TinkerfundShop, zone: TinkerfundZone): TinkerfundCartView {
  const catalog = tinkerfundCountedCatalog(shop, state.pledges)
  const groups = state.cart.flatMap((draft): TinkerfundCartGroup[] => {
    const entry = catalog[draft.campaign]
    if (!entry) return []
    const { campaign } = entry
    const closed = tinkerfundClosedReason(campaign, shop.now)
    const existing = tinkerfundPledgeFor(state.pledges, draft.campaign)
    const lineOf = (item: Item & Limited, quantity: number, unavailable = closed, pledged = 0) => {
      const max = tinkerfundMaxQuantity(item, pledged)
      const why = unavailable ?? (max === 0 ? tinkerfundShortfall(item, quantity, pledged) : undefined)
      const shown = why ? quantity : Math.min(quantity, max)
      return { title: item.title, price: item.price, quantity: shown, stored: quantity, max, amount: why ? 0 : tinkerfundCents(item.price * shown), unavailable: why }
    }

    const rewards = draft.lines.flatMap((line): TinkerfundCartLine[] => {
      const reward = campaign.rewards.find((r) => r.id === line.reward)
      if (!reward || !tinkerfundValidOptions(reward, line.options)) return []
      const ref = { campaign: draft.campaign, reward: reward.id, options: line.options }
      const detail = tinkerfundOptionsLabel(reward, line.options)
      return [{ key: tinkerfundCartLineKey(ref), ref, detail, ships: tinkerfundShipsTo(reward, zone), ...lineOf(reward, line.quantity, closed, tinkerfundHeld(existing?.lines ?? [], reward.id)) }]
    })
    const rewarded = rewards.some((l) => !l.unavailable)
    const addons = draft.addons.flatMap((line): TinkerfundCartLine[] => {
      const addon = campaign.addons?.find((a) => a.id === line.id)
      if (!addon) return []
      const ref = { campaign: draft.campaign, addon: addon.id }
      return [{ key: tinkerfundCartLineKey(ref), ref, ships: true, ...lineOf(addon, line.quantity, closed ?? (rewarded ? undefined : TINKERFUND_NEEDS_REWARD)) }]
    })
    const lines = [...rewards, ...addons]
    if (!lines.length && !draft.bonus) return []
    const shipped = [...existing?.lines ?? [], ...rewards.flatMap((l) => ('reward' in l.ref && l.ships && !l.unavailable ? [l.ref] : []))]
    return [{
      campaign: draft.campaign,
      title: entry.title,
      lines,
      bonus: draft.bonus,
      closed,
      existing,
      unshipped: campaign.rewards.filter((r) => tinkerfundHeld(existing?.lines ?? [], r.id) && !tinkerfundShipsTo(r, zone)).map((r) => r.title),
      subtotal: tinkerfundSum([...lines.map((l) => l.amount), closed ? 0 : draft.bonus ?? 0]),
      shipping: tinkerfundCents(tinkerfundShipping(shipped, campaign, zone) - (existing?.shipping ?? 0)),
    }]
  })
  const subtotal = tinkerfundSum(groups.map((g) => g.subtotal))
  const shipping = tinkerfundSum(groups.map((g) => g.shipping))
  const count = groups.reduce((n, g) => n + (g.lines.length ? g.lines.reduce((m, l) => m + l.quantity, 0) : 1), 0)
  return { groups, count, subtotal, shipping, total: tinkerfundCents(subtotal + shipping) }
}
