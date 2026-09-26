// Checkout (story #1384, Pledge flow #1365): Promotions over a Cart, then one
// Pledge per Campaign.
import { tinkerfundAutomaticDeals, tinkerfundPromotionTargets } from './campaign'
import type { TinkerfundPromotionTerms } from './campaign'
import {
  mergeTinkerfundAddons,
  mergeTinkerfundLines,
  tinkerfundCartLineKey,
  tinkerfundCents as cents,
  tinkerfundDoesntShip,
  tinkerfundHeld,
  tinkerfundLimitNotice,
  tinkerfundOptionsLabel,
  tinkerfundPledgeFor,
  tinkerfundShipping,
  tinkerfundShipsTo,
  tinkerfundSum as sum,
} from './cart'
import type {
  TinkerfundBackerState,
  TinkerfundCartGroup,
  TinkerfundCartView,
  TinkerfundCatalog,
  TinkerfundPledge,
  TinkerfundShop,
  TinkerfundStep,
  TinkerfundZone,
} from './cart'
import { derivePromotionState } from './status'

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

const goodsOf = (group: TinkerfundCartGroup) => sum(group.lines.map((l) => l.amount))

function findCode(promotions: TinkerfundPromotionTerms[], entered: string | undefined, campaigns: string[], now: number) {
  const code = entered?.trim().toUpperCase()
  if (!code) return {}
  const promotion = promotions.find((p) => p.code === code)
  if (!promotion) return { problem: 'That code isn’t valid' }
  const state = derivePromotionState(promotion, now)
  if (state === 'scheduled') return { problem: 'That code isn’t active yet' }
  if (state === 'expired') return { problem: 'That code has expired' }
  if (!campaigns.some((c) => tinkerfundPromotionTargets(promotion, c))) return { problem: 'That code doesn’t apply to anything in your Cart' }
  return { promotion }
}

/** Automatic discounts plus at most one code, off Rewards and Add-ons only (issue #1365). */
export function quoteTinkerfundCheckout(view: TinkerfundCartView, shop: TinkerfundShop, code: string | undefined): TinkerfundQuote {
  const entered = findCode(shop.promotions, code, view.groups.filter((g) => goodsOf(g) > 0).map((g) => g.campaign), shop.now)
  const deals = new Set<string>()
  const groups = view.groups.map((group): TinkerfundQuoteGroup => {
    const goods = goodsOf(group)
    const applied = [
      ...tinkerfundAutomaticDeals(shop.promotions, group.campaign, shop.now),
      ...(entered.promotion && tinkerfundPromotionTargets(entered.promotion, group.campaign) ? [entered.promotion] : []),
    ]
    const off = applied.map((p) => {
      if (goods > 0) deals.add(p.title)
      return 'percent' in p.discount ? (goods * p.discount.percent) / 100 : p.discount.amount
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

export interface TinkerfundReceiptLine {
  key: string
  title: string
  detail?: string
  quantity: number
  price: number
  amount: number
}

/** What the Confirmation and the account show for one Pledge: the same receipt (issue #1365). */
export function tinkerfundReceipt(pledge: TinkerfundPledge, entry: TinkerfundCatalog[string]) {
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

export interface TinkerfundPlaceInput {
  state: TinkerfundBackerState
  quote: TinkerfundQuote
  zone: TinkerfundZone
  payment: string
  shop: TinkerfundShop
}

/**
 * One Pledge per Campaign, added to the one the Campaign already has (issue
 * #1365). Refuses the whole checkout if any part can't be had, so nothing is
 * half-pledged.
 */
export function placeTinkerfundPledges({ state, quote, zone, payment, shop }: TinkerfundPlaceInput): TinkerfundStep {
  const refuse = (error: string) => ({ state, error })
  if (!quote.groups.length) return refuse('Your Cart is empty')
  if (!payment) return refuse('Choose how to pay')
  const fresh = nextRefs([...shop.baked, ...state.pledges].map((p) => p.ref), quote.groups.length)
  const placed: TinkerfundPledge[] = []

  for (const group of quote.groups) {
    const refuseGroup = (why: string) => refuse(`${group.title}: ${why}`)
    if (group.closed) return refuseGroup(group.closed)
    const gone = group.lines.find((l) => l.unavailable)
    if (gone) return refuseGroup(`${gone.title} is no longer available`)

    const campaign = shop.catalog[group.campaign]!.campaign
    const old = tinkerfundPledgeFor(state.pledges, group.campaign)
    const lines = mergeTinkerfundLines(
      old?.lines ?? [],
      group.lines.flatMap((l) => ('reward' in l.ref ? [{ reward: l.ref.reward, options: l.ref.options, quantity: l.quantity }] : [])),
    )
    for (const reward of campaign.rewards) {
      const held = tinkerfundHeld(lines, reward.id)
      if (!held) continue
      // The merged Pledge moves to this zone, earlier Rewards included.
      if (!tinkerfundShipsTo(reward, zone)) return refuseGroup(tinkerfundDoesntShip(reward.title))
      if (reward.limit !== undefined && held > reward.limit) return refuseGroup(tinkerfundLimitNotice(reward.limit))
    }
    const addons = mergeTinkerfundAddons(
      old?.addons ?? [],
      group.lines.flatMap((l) => ('addon' in l.ref ? [{ id: l.ref.addon, quantity: l.quantity }] : [])),
    )
    const bonus = cents((old?.bonus ?? 0) + (group.bonus ?? 0))

    placed.push({
      ref: old?.ref ?? fresh.shift()!,
      campaign: group.campaign,
      placed: old?.placed ?? shop.now,
      zone,
      payment,
      lines,
      addons,
      ...(bonus > 0 ? { bonus } : {}),
      discount: cents((old?.discount ?? 0) + group.discount),
      shipping: tinkerfundShipping(lines, campaign, zone),
    })
  }

  const kept = state.pledges.filter((p) => !placed.some((q) => q.ref === p.ref))
  return { state: { cart: [], pledges: [...kept, ...placed] }, refs: placed.map((p) => p.ref) }
}
