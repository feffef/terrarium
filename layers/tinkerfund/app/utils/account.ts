// The Backer account (story #1385): the demo Backer's Pledges, baked and the
// visitor's own, and changing or cancelling one until its Campaign ends (#1365).
import {
  TINKERFUND_GONE,
  TINKERFUND_NEEDS_REWARD,
  tinkerfundCartLineKey,
  tinkerfundCents,
  tinkerfundShortfall,
  tinkerfundSum,
  tinkerfundValidOptions,
} from './cart'
import type { TinkerfundCartCampaign, TinkerfundDraft, TinkerfundPledge } from './cart'
import type { TinkerfundBakedPledge } from './checkout'
import { resolveTinkerfundOffset } from './clock'
import { deriveCampaignStatus } from './status'

export interface TinkerfundAccountCampaign extends TinkerfundCartCampaign {
  goal: number
  pledged: number
  rewards: (TinkerfundCartCampaign['rewards'][number] & { delivery: string })[]
}

export type TinkerfundAccountCatalog = Record<string, { title: string; campaign: TinkerfundAccountCampaign }>

export type TinkerfundPledgeState = 'pending' | 'charged' | 'delivered' | 'unfunded' | 'cancelled'

export interface TinkerfundAccountPledge {
  pledge: TinkerfundPledge
  state: TinkerfundPledgeState
  /** Only a Pending Pledge can still be changed or cancelled. */
  locked: boolean
  endsAt: number
}

const ships = (pledge: Pick<TinkerfundPledge, 'lines'>, campaign: TinkerfundCartCampaign) =>
  pledge.lines.some((l) => campaign.rewards.find((r) => r.id === l.reward)?.shipsTo)

/** A baked Pledge read as a stored one. Baked Pledges carry no payment, so they
 *  read as paid with `payment`, the shop's first demo method. */
function fromBaked(b: TinkerfundBakedPledge, campaign: TinkerfundCartCampaign, now: number, payment: string): TinkerfundPledge {
  const lines = b.lines.map((l) => ({ reward: l.reward, options: l.options ?? {}, quantity: l.quantity }))
  return {
    ref: b.ref,
    campaign: b.campaign,
    placed: resolveTinkerfundOffset(b.placed, now),
    zone: b.zone,
    payment,
    lines,
    addons: b.addons ?? [],
    ...(b.bonus ? { bonus: b.bonus } : {}),
    discount: 0,
    shipping: ships({ lines }, campaign) ? campaign.shipping[b.zone] ?? 0 : 0,
  }
}

function stateOf(pledge: TinkerfundPledge, campaign: TinkerfundAccountCampaign, now: number): TinkerfundPledgeState {
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
function lockedBecause(pledge: TinkerfundPledge, campaign: TinkerfundCartCampaign, now: number): string | undefined {
  if (pledge.cancelled !== undefined) return 'This Pledge was cancelled'
  if (deriveCampaignStatus({ ...campaign, goal: 1 }, 0, now).state === 'ended') return 'This Pledge is locked: its Campaign has ended'
}

export function cancelTinkerfundPledge(
  pledge: TinkerfundPledge,
  entry: { campaign: TinkerfundCartCampaign },
  now: number,
): { pledge?: TinkerfundPledge; error?: string } {
  const error = lockedBecause(pledge, entry.campaign, now)
  return error ? { error } : { pledge: { ...pledge, cancelled: now } }
}

export type TinkerfundPledgeChange = Omit<TinkerfundDraft, 'campaign' | 'bonus'> & { bonus?: number }

/**
 * `pledge` with new lines, Add-ons and bonus, under the same rules as the Cart
 * (issue #1365). What the Pledge already holds counts as still available to
 * it, since `entry`'s stock already counts it. The discount it earned at
 * checkout stays, never more than its new goods; shipping follows its lines.
 */
export function reviseTinkerfundPledge(
  pledge: TinkerfundPledge,
  change: TinkerfundPledgeChange,
  entry: { campaign: TinkerfundCartCampaign },
  now: number,
): { pledge?: TinkerfundPledge; error?: string } {
  const { campaign } = entry
  const locked = lockedBecause(pledge, campaign, now)
  if (locked) return { error: locked }

  const lines: TinkerfundPledge['lines'] = []
  for (const line of change.lines.filter((l) => l.quantity > 0)) {
    const key = tinkerfundCartLineKey({ campaign: pledge.campaign, ...line })
    const same = lines.find((l) => tinkerfundCartLineKey({ campaign: pledge.campaign, ...l }) === key)
    if (same) same.quantity += line.quantity
    else lines.push({ ...line, options: { ...line.options } })
  }
  const addons = change.addons.filter((a) => a.quantity > 0)
  const bonus = tinkerfundCents(Math.max(0, change.bonus ?? 0))
  if (!lines.length && !addons.length && !bonus) return { error: 'Nothing is left in this Pledge. To withdraw it, cancel it instead.' }
  if (addons.length && !lines.length) return { error: TINKERFUND_NEEDS_REWARD }

  const held = (p: Pick<TinkerfundPledge, 'lines'>, id: string) => p.lines.filter((l) => l.reward === id).reduce((n, l) => n + l.quantity, 0)
  const goods: number[] = []
  for (const line of lines) {
    const reward = campaign.rewards.find((r) => r.id === line.reward)
    if (!reward || !tinkerfundValidOptions(reward, line.options)) return { error: TINKERFUND_GONE }
    if (reward.shipsTo && !reward.shipsTo.includes(pledge.zone)) return { error: `${reward.title} doesn’t ship there` }
    goods.push(reward.price * line.quantity)
  }
  for (const reward of campaign.rewards) {
    const wanted = held({ lines }, reward.id)
    const short = wanted ? tinkerfundShortfall({ ...reward, claimed: reward.claimed - held(pledge, reward.id) }, wanted) : undefined
    if (short) return { error: `${reward.title}: ${short}` }
  }
  for (const line of addons) {
    const addon = campaign.addons?.find((a) => a.id === line.id)
    if (!addon) return { error: TINKERFUND_GONE }
    const had = pledge.addons.find((a) => a.id === addon.id)?.quantity ?? 0
    const short = tinkerfundShortfall({ ...addon, claimed: addon.claimed - had }, line.quantity)
    if (short) return { error: `${addon.title}: ${short}` }
    goods.push(addon.price * line.quantity)
  }

  const next: TinkerfundPledge = {
    ...pledge,
    lines,
    addons,
    discount: Math.min(pledge.discount, tinkerfundSum(goods)),
    shipping: ships({ lines }, campaign) ? campaign.shipping[pledge.zone] ?? 0 : 0,
  }
  if (bonus) next.bonus = bonus
  else delete next.bonus
  return { pledge: next }
}

/** The visitor's Pledges and the baked ones they don't replace, newest first;
 *  a Pledge whose Campaign is gone is dropped quietly (issue #1366). */
export function tinkerfundAccountPledges(
  pledges: TinkerfundPledge[],
  baked: TinkerfundBakedPledge[],
  catalog: TinkerfundAccountCatalog,
  now: number,
  payment: string,
): TinkerfundAccountPledge[] {
  const all = [
    ...pledges,
    ...baked.flatMap((b) => {
      const campaign = catalog[b.campaign]?.campaign
      return campaign && !pledges.some((p) => p.ref === b.ref) ? [fromBaked(b, campaign, now, payment)] : []
    }),
  ]
  return all
    .flatMap((pledge) => {
      const campaign = catalog[pledge.campaign]?.campaign
      if (!campaign) return []
      const state = stateOf(pledge, campaign, now)
      return [{ pledge, state, locked: state !== 'pending', endsAt: resolveTinkerfundOffset(campaign.end, now) }]
    })
    .sort((a, b) => b.pledge.placed - a.pledge.placed)
}
