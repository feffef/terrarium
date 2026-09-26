// Derived, never stored (issue #1364). Derive at the page's "now"; only
// countdowns tick, so a checkout never changes state mid-flow.
import { resolveTinkerfundOffset } from './clock'

export type CampaignState = 'upcoming' | 'live' | 'ended'

export interface CampaignStatus {
  state: CampaignState
  outcome?: 'funded' | 'unfunded'
  endingSoon: boolean
  goalReached: boolean
  percent: number
  launchAt: number
  endAt: number
}

const ENDING_SOON = 48 * 3_600_000

export function deriveCampaignStatus(
  campaign: { launch: string; end: string; goal: number },
  pledged: number,
  now: number,
): CampaignStatus {
  const launchAt = resolveTinkerfundOffset(campaign.launch, now)
  const endAt = resolveTinkerfundOffset(campaign.end, now)
  const funded = pledged >= campaign.goal
  const state: CampaignState = now < launchAt ? 'upcoming' : now < endAt ? 'live' : 'ended'
  const live = state === 'live'
  return {
    state,
    outcome: state === 'ended' ? (funded ? 'funded' : 'unfunded') : undefined,
    endingSoon: live && endAt - now <= ENDING_SOON,
    goalReached: live && funded,
    percent: Math.floor((pledged / campaign.goal) * 100),
    launchAt,
    endAt,
  }
}

export type PromotionState = 'scheduled' | 'active' | 'expired'

/** A Promotion with no `end` never expires. */
export function derivePromotionState(promotion: { start: string; end?: string }, now: number): PromotionState {
  if (now < resolveTinkerfundOffset(promotion.start, now)) return 'scheduled'
  return !promotion.end || now < resolveTinkerfundOffset(promotion.end, now) ? 'active' : 'expired'
}

export function campaignPriceFrom(rewards: { price: number }[]): number | undefined {
  return rewards.length ? Math.min(...rewards.map((r) => r.price)) : undefined
}
