// The Backer account (story #1385): the demo Backer's Pledges, and changing
// or cancelling one until its Campaign ends (#1365).
import {
  TINKERFUND_GONE,
  TINKERFUND_NEEDS_REWARD,
  mergeTinkerfundAddons,
  mergeTinkerfundLines,
  tinkerfundCents,
  tinkerfundCountedCatalog,
  tinkerfundDoesntShip,
  tinkerfundHeld,
  tinkerfundShipping,
  tinkerfundShipsTo,
  tinkerfundShortfall,
  tinkerfundSum,
  tinkerfundValidOptions,
} from './cart'
import type { TinkerfundBackerState, TinkerfundCatalogCampaign, TinkerfundPledge, TinkerfundPledgeContents, TinkerfundShop, TinkerfundStep } from './cart'
import { tinkerfundReceipt } from './checkout'
import { resolveTinkerfundOffset } from './clock'
import { deriveCampaignState, deriveCampaignStatus } from './status'

export type TinkerfundPledgeState = 'pending' | 'charged' | 'delivered' | 'unfunded' | 'cancelled'

export interface TinkerfundAccountPledge {
  pledge: TinkerfundPledge
  state: TinkerfundPledgeState
  /** Only a Pending Pledge can still be changed or cancelled. */
  locked: boolean
  endsAt: number
  receipt: ReturnType<typeof tinkerfundReceipt>
}

function stateOf(pledge: TinkerfundPledge, campaign: TinkerfundCatalogCampaign, now: number): TinkerfundPledgeState {
  if (pledge.cancelled !== undefined) return 'cancelled'
  const { state, outcome } = deriveCampaignStatus(campaign, campaign.pledged, now)
  if (state !== 'ended') return 'pending'
  if (outcome === 'unfunded') return 'unfunded'
  const arrived = pledge.lines.length > 0 && pledge.lines.every((l) => {
    const reward = campaign.rewards.find((r) => r.id === l.reward)
    return reward && resolveTinkerfundOffset(reward.delivery, now) <= now
  })
  return arrived ? 'delivered' : 'charged'
}

/** Why `pledge` can no longer change, if it can't: the Campaign has ended (issue #1365). */
function lockedBecause(pledge: TinkerfundPledge, campaign: TinkerfundCatalogCampaign, now: number): string | undefined {
  if (pledge.cancelled !== undefined) return 'This Pledge was cancelled'
  if (deriveCampaignState(campaign, now) === 'ended') return 'This Pledge is locked: its Campaign has ended'
}

/** The Pledge `ref` names and its Campaign, with the Backer's Pledges counted. */
function find(state: TinkerfundBackerState, ref: string, shop: TinkerfundShop) {
  const pledge = state.pledges.find((p) => p.ref === ref)
  const campaign = pledge && tinkerfundCountedCatalog(shop, state.pledges)[pledge.campaign]?.campaign
  return pledge && campaign ? { pledge, campaign } : undefined
}

const replace = (state: TinkerfundBackerState, pledge: TinkerfundPledge): TinkerfundBackerState =>
  ({ ...state, pledges: state.pledges.map((p) => (p.ref === pledge.ref ? pledge : p)) })

export function cancelTinkerfundPledge(state: TinkerfundBackerState, ref: string, shop: TinkerfundShop): TinkerfundStep {
  const found = find(state, ref, shop)
  if (!found) return { state, error: TINKERFUND_GONE }
  const error = lockedBecause(found.pledge, found.campaign, shop.now)
  return error ? { state, error } : { state: replace(state, { ...found.pledge, cancelled: shop.now }) }
}

export type TinkerfundPledgeChange = TinkerfundPledgeContents

/**
 * The Pledge with new lines, Add-ons and bonus, under the same rules as the
 * Cart (issue #1365). What it already holds counts as still available to it,
 * since the counted stock already holds it. The discount it earned at
 * checkout stays, never more than its new goods; shipping follows its lines.
 */
export function reviseTinkerfundPledge(
  state: TinkerfundBackerState,
  ref: string,
  change: TinkerfundPledgeChange,
  shop: TinkerfundShop,
): TinkerfundStep {
  const refuse = (error: string) => ({ state, error })
  const found = find(state, ref, shop)
  if (!found) return refuse(TINKERFUND_GONE)
  const { pledge, campaign } = found
  const locked = lockedBecause(pledge, campaign, shop.now)
  if (locked) return refuse(locked)

  const lines = mergeTinkerfundLines([], change.lines.map((l) => ({ ...l, options: { ...l.options } })))
  const addons = mergeTinkerfundAddons([], change.addons)
  const bonus = tinkerfundCents(Math.max(0, change.bonus ?? 0))
  if (!lines.length && !addons.length && !bonus) return refuse('Nothing is left in this Pledge. To withdraw it, cancel it instead.')
  if (addons.length && !lines.length) return refuse(TINKERFUND_NEEDS_REWARD)

  const goods: number[] = []
  for (const line of lines) {
    const reward = campaign.rewards.find((r) => r.id === line.reward)
    if (!reward || !tinkerfundValidOptions(reward, line.options)) return refuse(TINKERFUND_GONE)
    if (!tinkerfundShipsTo(reward, pledge.zone)) return refuse(tinkerfundDoesntShip(reward.title))
    goods.push(reward.price * line.quantity)
  }
  for (const reward of campaign.rewards) {
    const wanted = tinkerfundHeld(lines, reward.id)
    const short = wanted ? tinkerfundShortfall({ ...reward, claimed: reward.claimed - tinkerfundHeld(pledge.lines, reward.id) }, wanted) : undefined
    if (short) return refuse(`${reward.title}: ${short}`)
  }
  for (const line of addons) {
    const addon = campaign.addons?.find((a) => a.id === line.id)
    if (!addon) return refuse(TINKERFUND_GONE)
    const had = pledge.addons.find((a) => a.id === addon.id)?.quantity ?? 0
    const short = tinkerfundShortfall({ ...addon, claimed: addon.claimed - had }, line.quantity)
    if (short) return refuse(`${addon.title}: ${short}`)
    goods.push(addon.price * line.quantity)
  }

  const next: TinkerfundPledge = {
    ...pledge,
    lines,
    addons,
    discount: Math.min(pledge.discount, tinkerfundSum(goods)),
    shipping: tinkerfundShipping(lines, campaign, pledge.zone),
  }
  if (bonus) next.bonus = bonus
  else delete next.bonus
  return { state: replace(state, next) }
}

/** Every Pledge the Backer holds, newest first. */
export function tinkerfundAccountPledges(state: TinkerfundBackerState, shop: TinkerfundShop): TinkerfundAccountPledge[] {
  const catalog = tinkerfundCountedCatalog(shop, state.pledges)
  return state.pledges
    .flatMap((pledge) => {
      const entry = catalog[pledge.campaign]
      if (!entry) return []
      const state = stateOf(pledge, entry.campaign, shop.now)
      return [{ pledge, state, locked: state !== 'pending', endsAt: resolveTinkerfundOffset(entry.campaign.end, shop.now), receipt: tinkerfundReceipt(pledge, entry) }]
    })
    .sort((a, b) => b.pledge.placed - a.pledge.placed)
}
