// Checkout (story #1384, Pledge flow #1365): Promotions over a Cart, then one
// Pledge per Campaign, stored in the visitor's overlay.
import { tinkerfundCartLineKey, tinkerfundCents as cents, tinkerfundOptionsLabel, tinkerfundSum as sum } from './cart'
import type { TinkerfundCartCatalog, TinkerfundCartGroup, TinkerfundCartView, TinkerfundOverlay, TinkerfundPledge, TinkerfundZone } from './cart'
import { resolveTinkerfundOffset } from './clock'
import { derivePromotionState } from './status'

export interface TinkerfundPromotionTerms {
  title: string
  code?: string
  campaign?: string
  discount: { percent: number } | { amount: number }
  start: string
  end?: string
}

export interface TinkerfundQuoteGroup extends TinkerfundCartGroup {
  discount: number
  total: number
}

export interface TinkerfundQuote {
  groups: TinkerfundQuoteGroup[]
  subtotal: number
  discount: number
  shipping: number
  total: number
  /** Titles of the Promotions that took something off. */
  deals: string[]
  /** The entered code, once it applies. */
  code?: string
  codeProblem?: string
}

const targets = (p: TinkerfundPromotionTerms, campaign: string) => !p.campaign || p.campaign === campaign
const goodsOf = (group: TinkerfundCartGroup) => sum(group.lines.map((l) => l.amount))

function findCode<P extends TinkerfundPromotionTerms>(promotions: P[], entered: string | undefined, campaigns: string[], now: number) {
  const code = entered?.trim().toUpperCase()
  if (!code) return {}
  const promotion = promotions.find((p) => p.code === code)
  if (!promotion) return { problem: 'That code isn’t valid' }
  const state = derivePromotionState(promotion, now)
  if (state === 'scheduled') return { problem: 'That code isn’t active yet' }
  if (state === 'expired') return { problem: 'That code has expired' }
  if (!campaigns.some((c) => targets(promotion, c))) return { problem: 'That code doesn’t apply to anything in your Cart' }
  return { promotion }
}

/** Automatic discounts plus at most one code, off Rewards and Add-ons only (issue #1365). */
export function quoteTinkerfundCheckout(
  view: TinkerfundCartView,
  promotions: TinkerfundPromotionTerms[],
  code: string | undefined,
  now: number,
): TinkerfundQuote {
  const entered = findCode(promotions, code, view.groups.filter((g) => goodsOf(g) > 0).map((g) => g.campaign), now)
  const applied = [
    ...promotions.filter((p) => !p.code && derivePromotionState(p, now) === 'active'),
    ...(entered.promotion ? [entered.promotion] : []),
  ]
  const deals = new Set<string>()
  const groups = view.groups.map((group): TinkerfundQuoteGroup => {
    const goods = goodsOf(group)
    const off = applied.filter((p) => targets(p, group.campaign)).map((p) => {
      const amount = 'percent' in p.discount ? (goods * p.discount.percent) / 100 : p.discount.amount
      if (goods > 0) deals.add(p.title)
      return amount
    })
    const discount = Math.min(goods, sum(off))
    return { ...group, discount, total: cents(group.subtotal - discount + group.shipping) }
  })
  const discount = sum(groups.map((g) => g.discount))
  return {
    groups,
    subtotal: view.subtotal,
    discount,
    shipping: view.shipping,
    total: cents(view.total - discount),
    deals: [...deals],
    code: entered.promotion?.code,
    codeProblem: entered.problem,
  }
}

/** A past Pledge as baked into the `backer` collection. */
export interface TinkerfundBakedPledge {
  ref: string
  campaign: string
  placed: string
  zone: TinkerfundZone
  lines: { reward: string; options?: Record<string, string>; quantity: number }[]
  addons?: { id: string; quantity: number }[]
  bonus?: number
}

/** The Pledge a Campaign already has: the visitor's own, else a baked one. */
export function tinkerfundPledgeFor(campaign: string, pledges: TinkerfundPledge[], baked: TinkerfundBakedPledge[]) {
  return pledges.find((p) => p.campaign === campaign) ?? baked.find((p) => p.campaign === campaign)
}

interface Priced {
  id: string
  price: number
  claimed: number
}

type CountedPledge = Pick<TinkerfundBakedPledge, 'ref' | 'campaign' | 'lines' | 'addons' | 'bonus'> & { discount?: number }

/**
 * A Campaign's totals and stock with the visitor's Pledges counted (issue
 * #1364): what a Pledge raises is its Rewards, Add-ons and bonus less its
 * discount; shipping raises nothing. A Pledge that replaces a baked one counts
 * only the difference, since the baked totals already hold the baked Pledge.
 */
export function withTinkerfundPledges<C extends { pledged: number; backers: number; rewards: Priced[]; addons?: Priced[] }>(
  slug: string,
  campaign: C,
  pledges: TinkerfundPledge[],
  baked: TinkerfundBakedPledge[],
): C {
  const mine = pledges.filter((p) => p.campaign === slug)
  if (!mine.length) return campaign
  const was = (p: TinkerfundPledge): CountedPledge | undefined => baked.find((b) => b.ref === p.ref)
  const count = (p: CountedPledge | undefined, kind: 'reward' | 'addon', id: string) =>
    kind === 'reward'
      ? (p?.lines ?? []).filter((l) => l.reward === id).reduce((n, l) => n + l.quantity, 0)
      : (p?.addons ?? []).filter((a) => a.id === id).reduce((n, a) => n + a.quantity, 0)
  const taken = (kind: 'reward' | 'addon', id: string) => mine.reduce((n, p) => n + count(p, kind, id) - count(was(p), kind, id), 0)
  const amount = (p: CountedPledge | undefined) =>
    p
      ? campaign.rewards.reduce((n, r) => n + r.price * count(p, 'reward', r.id), 0) +
        (campaign.addons ?? []).reduce((n, a) => n + a.price * count(p, 'addon', a.id), 0) +
        (p.bonus ?? 0) -
        (p.discount ?? 0)
      : 0

  return {
    ...campaign,
    pledged: cents(campaign.pledged + mine.reduce((n, p) => n + amount(p) - amount(was(p)), 0)),
    backers: campaign.backers + mine.filter((p) => !was(p)).length,
    rewards: campaign.rewards.map((r) => ({ ...r, claimed: r.claimed + taken('reward', r.id) })),
    ...(campaign.addons ? { addons: campaign.addons.map((a) => ({ ...a, claimed: a.claimed + taken('addon', a.id) })) } : {}),
  }
}

export interface TinkerfundReceiptLine {
  key: string
  title: string
  detail?: string
  quantity: number
  price: number
  amount: number
}

/** What the Confirmation and the account show for one Pledge: the same receipt (issue #1365). */
export function tinkerfundReceipt(pledge: TinkerfundPledge, entry: TinkerfundCartCatalog[string]) {
  const { campaign } = entry
  const line = (key: string, item: { title: string; price: number }, quantity: number, detail?: string): TinkerfundReceiptLine =>
    ({ key, title: item.title, detail, quantity, price: item.price, amount: cents(item.price * quantity) })
  const lines = [
    ...pledge.lines.flatMap((l) => {
      const reward = campaign.rewards.find((r) => r.id === l.reward)
      return reward ? [line(tinkerfundCartLineKey({ campaign: pledge.campaign, ...l }), reward, l.quantity, tinkerfundOptionsLabel(reward, l.options))] : []
    }),
    ...pledge.addons.flatMap((a) => {
      const addon = campaign.addons?.find((x) => x.id === a.id)
      return addon ? [line(tinkerfundCartLineKey({ campaign: pledge.campaign, addon: a.id }), addon, a.quantity)] : []
    }),
  ]
  const goods = sum(lines.map((l) => l.amount))
  const bonus = pledge.bonus ?? 0
  return {
    ref: pledge.ref,
    campaign: pledge.campaign,
    title: entry.title,
    lines,
    goods,
    bonus,
    discount: pledge.discount,
    shipping: pledge.shipping,
    total: cents(goods + bonus - pledge.discount + pledge.shipping),
  }
}

function nextRefs(taken: string[], count: number): string[] {
  const last = Math.max(0, ...taken.map((ref) => Number(ref.match(/\d+$/)?.[0] ?? 0)))
  return Array.from({ length: count }, (_, i) => `TF-P-${String(last + 1 + i).padStart(4, '0')}`)
}

/** `into` with `add`'s quantities added, matching items by `key`. */
function merge<T extends { quantity: number }>(into: T[], add: T[], key: (item: T) => string): T[] {
  const out = [...into]
  for (const item of add) {
    const i = out.findIndex((x) => key(x) === key(item))
    if (i < 0) out.push(item)
    else out[i] = { ...out[i]!, quantity: out[i]!.quantity + item.quantity }
  }
  return out
}

export interface TinkerfundPlaceInput {
  overlay: TinkerfundOverlay
  quote: TinkerfundQuote
  zone: TinkerfundZone
  payment: string
  catalog: TinkerfundCartCatalog
  baked: TinkerfundBakedPledge[]
  now: number
}

/**
 * Confirms a quoted checkout: one Pledge per Campaign, added to the one the
 * Campaign already has (issue #1365). Refuses the whole checkout if any part
 * can't be had, so nothing is half-pledged.
 */
export function placeTinkerfundPledges(input: TinkerfundPlaceInput): { overlay?: TinkerfundOverlay; refs?: string[]; error?: string } {
  const { overlay, quote, zone, payment, catalog, baked, now } = input
  if (!quote.groups.length) return { error: 'Your Cart is empty' }
  if (!payment) return { error: 'Choose how to pay' }
  const fresh = nextRefs([...baked, ...overlay.pledges].map((p) => p.ref), quote.groups.length)
  const placed: TinkerfundPledge[] = []

  for (const group of quote.groups) {
    const refuse = (why: string) => ({ error: `${group.title}: ${why}` })
    if (group.closed) return refuse(group.closed)
    const gone = group.lines.find((l) => l.unavailable)
    if (gone) return refuse(`${gone.title} is no longer available`)

    const campaign = catalog[group.campaign]!.campaign
    const old = tinkerfundPledgeFor(group.campaign, overlay.pledges, baked)
    const lines = merge(
      (old?.lines ?? []).map((l) => ({ reward: l.reward, options: l.options ?? {}, quantity: l.quantity })),
      group.lines.flatMap((l) => ('reward' in l.ref ? [{ reward: l.ref.reward, options: l.ref.options, quantity: l.quantity }] : [])),
      (l) => tinkerfundCartLineKey({ campaign: group.campaign, ...l }),
    )
    for (const reward of campaign.rewards) {
      const held = lines.filter((l) => l.reward === reward.id).reduce((n, l) => n + l.quantity, 0)
      if (!held) continue
      // The merged Pledge moves to this zone, earlier Rewards included.
      if (reward.shipsTo && !reward.shipsTo.includes(zone)) return refuse(`${reward.title} doesn’t ship there`)
      if (reward.limit !== undefined && held > reward.limit) return refuse(`Max ${reward.limit} per Backer`)
    }
    const addons = merge(
      old?.addons ?? [],
      group.lines.flatMap((l) => ('addon' in l.ref ? [{ id: l.ref.addon, quantity: l.quantity }] : [])),
      (a) => a.id,
    )
    const bonus = cents((old?.bonus ?? 0) + (group.bonus ?? 0))
    const ships = lines.some((l) => campaign.rewards.find((r) => r.id === l.reward)?.shipsTo)

    placed.push({
      ref: old?.ref ?? fresh.shift()!,
      campaign: group.campaign,
      placed: old ? (typeof old.placed === 'number' ? old.placed : resolveTinkerfundOffset(old.placed, now)) : now,
      zone,
      payment,
      lines,
      addons,
      ...(bonus > 0 ? { bonus } : {}),
      discount: cents((old && 'discount' in old ? old.discount : 0) + group.discount),
      shipping: ships ? campaign.shipping[zone] ?? 0 : 0,
    })
  }

  const kept = overlay.pledges.filter((p) => !placed.some((q) => q.ref === p.ref))
  return { overlay: { cart: [], pledges: [...kept, ...placed] }, refs: placed.map((p) => p.ref) }
}
