// Derived, never stored (issue #1364), at the "now" each navigation and each
// Backer action reads afresh (story #1377).
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

export function deriveCampaignState(campaign: { launch: string; end: string }, now: number): CampaignState {
  if (now < resolveTinkerfundOffset(campaign.launch, now)) return 'upcoming'
  return now < resolveTinkerfundOffset(campaign.end, now) ? 'live' : 'ended'
}

export function deriveCampaignStatus(
  campaign: { launch: string; end: string; goal: number },
  pledged: number,
  now: number,
): CampaignStatus {
  const launchAt = resolveTinkerfundOffset(campaign.launch, now)
  const endAt = resolveTinkerfundOffset(campaign.end, now)
  const funded = pledged >= campaign.goal
  const state = deriveCampaignState(campaign, now)
  const live = state === 'live'
  return {
    state,
    outcome: state === 'ended' ? (funded ? 'funded' : 'unfunded') : undefined,
    endingSoon: live && endAt <= resolveTinkerfundOffset('+48h', now),
    goalReached: live && funded,
    percent: Math.floor((pledged / campaign.goal) * 100),
    launchAt,
    endAt,
  }
}

export type PromotionState = 'scheduled' | 'active' | 'expired'

export function derivePromotionState(promotion: { start: string; end?: string }, now: number): PromotionState {
  if (now < resolveTinkerfundOffset(promotion.start, now)) return 'scheduled'
  return !promotion.end || now < resolveTinkerfundOffset(promotion.end, now) ? 'active' : 'expired'
}

export function campaignPriceFrom(rewards: { price: number }[]): number | undefined {
  return rewards.length ? Math.min(...rewards.map((r) => r.price)) : undefined
}
