// Campaign and Promotion state is derived from the clock and totals, never
// stored (issue #1364).
import { describe, expect, it } from 'vitest'
import { deriveCampaignStatus, derivePromotionState, campaignPriceFrom } from '../../app/utils/status.ts'

const NOW = Date.parse('2026-06-01T12:00:00Z')

function campaign(launch: string, end: string, goal = 1000) {
  return { launch, end, goal }
}

describe('deriveCampaignStatus', () => {
  it('is Upcoming before launch, with no outcome or badges', () => {
    expect(deriveCampaignStatus(campaign('+2d', '+30d'), 0, NOW)).toMatchObject({
      state: 'upcoming', outcome: undefined, endingSoon: false, goalReached: false,
    })
  })

  it('is Live from the launch instant until the end', () => {
    expect(deriveCampaignStatus(campaign('+0h', '+30d'), 0, NOW).state).toBe('live')
    expect(deriveCampaignStatus(campaign('-12d', '+18d'), 500, NOW)).toMatchObject({
      state: 'live', percent: 50, endingSoon: false, goalReached: false,
    })
  })

  it('marks a Live Campaign Ending soon within its last 48 hours', () => {
    expect(deriveCampaignStatus(campaign('-12d', '+48h'), 0, NOW).endingSoon).toBe(true)
    expect(deriveCampaignStatus(campaign('-12d', '+49h'), 0, NOW).endingSoon).toBe(false)
  })

  it('marks a Live Campaign Goal reached once pledges meet the goal', () => {
    expect(deriveCampaignStatus(campaign('-12d', '+18d'), 1000, NOW)).toMatchObject({ goalReached: true, percent: 100 })
    expect(deriveCampaignStatus(campaign('-12d', '+18d'), 999, NOW).goalReached).toBe(false)
  })

  it('is Ended from the end instant, Funded or Unfunded by its total, with no badges', () => {
    expect(deriveCampaignStatus(campaign('-30d', '+0h'), 1500, NOW)).toMatchObject({
      state: 'ended', outcome: 'funded', percent: 150, endingSoon: false, goalReached: false,
    })
    expect(deriveCampaignStatus(campaign('-30d', '-2d'), 400, NOW)).toMatchObject({ state: 'ended', outcome: 'unfunded' })
  })

  it('resolves the launch and end instants for countdowns and exact dates', () => {
    expect(deriveCampaignStatus(campaign('-1d', '+36h'), 0, NOW)).toMatchObject({
      launchAt: Date.parse('2026-05-31T12:00:00Z'),
      endAt: Date.parse('2026-06-03T00:00:00Z'),
    })
  })
})

describe('derivePromotionState', () => {
  it('moves Scheduled → Active → Expired', () => {
    expect(derivePromotionState({ start: '+1h', end: '+3d' }, NOW)).toBe('scheduled')
    expect(derivePromotionState({ start: '+0h', end: '+3d' }, NOW)).toBe('active')
    expect(derivePromotionState({ start: '-3d', end: '+0h' }, NOW)).toBe('expired')
  })

  it('stays Active for good when it has no end', () => {
    expect(derivePromotionState({ start: '-300d' }, NOW)).toBe('active')
  })
})

describe('campaignPriceFrom', () => {
  it('is the cheapest Reward, or nothing when there are none', () => {
    expect(campaignPriceFrom([{ price: 49 }, { price: 19 }, { price: 99 }])).toBe(19)
    expect(campaignPriceFrom([])).toBeUndefined()
  })
})
