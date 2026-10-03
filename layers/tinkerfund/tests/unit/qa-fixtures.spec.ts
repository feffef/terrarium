// qa's edge-case set (story #1379): the component gallery and the e2e tests
// rely on each case staying true at qa's pinned now.
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseDocument } from '../../../../scripts/validate-content.ts'
import { deriveCampaignStatus, derivePromotionState } from '../../app/utils/status'

interface Campaign {
  category: string
  inventor: string
  goal: number
  launch: string
  end: string
  backers: number
  pledged: number
  rewards: { price: number; claimed: number; stock?: number }[]
  recent?: { name: string; at: string }[]
  alsoBacked?: string[]
}

const qa = fileURLToPath(new URL('../../content/qa/', import.meta.url))
const now = Date.parse(String(parseDocument(`${qa}shop/shop.yml`).now))

function documents(dir: string) {
  return readdirSync(`${qa}${dir}`)
    .filter((f) => /\.(md|yml)$/.test(f))
    .map((f) => ({ stem: f.replace(/\.\w+$/, ''), doc: parseDocument(`${qa}${dir}/${f}`) }))
}

const campaigns = documents('pages/campaigns').map(({ stem, doc }) => {
  const campaign = doc.campaign as Campaign
  return { slug: stem, title: String(doc.title), ...campaign, status: deriveCampaignStatus(campaign, campaign.pledged, now) }
})

describe('qa edge cases', () => {
  it('has an Upcoming Campaign with zero Backers', () => {
    expect(campaigns.some((c) => c.status.state === 'upcoming' && c.backers === 0)).toBe(true)
  })

  it('has a Live Campaign exactly at its goal, with a sold-out Reward', () => {
    const exact = campaigns.find((c) => c.status.state === 'live' && c.pledged === c.goal)
    expect(exact?.status).toMatchObject({ goalReached: true, percent: 100 })
    expect(exact?.rewards.some((r) => r.claimed === r.stock)).toBe(true)
  })

  it('has a Live Campaign with zero Backers and a title long enough to wrap', () => {
    expect(campaigns.some((c) => c.status.state === 'live' && c.backers === 0 && c.title.length > 80)).toBe(true)
  })

  it('has an Ended Campaign that is Funded many times over, and one that is Unfunded', () => {
    expect(campaigns.some((c) => c.status.outcome === 'funded' && c.status.percent >= 10_000)).toBe(true)
    expect(campaigns.some((c) => c.status.outcome === 'unfunded')).toBe(true)
  })

  // The checkout e2e tips it over with one Reward at the TINKER10 code's 10% off.
  it('has a Live Campaign one discounted Reward tips over its goal', () => {
    const keypad = campaigns.find((c) => c.slug === 'one-button-keypad')!
    const price = Math.min(...keypad.rewards.map((r) => r.price))
    expect(keypad.status.state).toBe('live')
    expect(keypad.pledged).toBeLessThan(keypad.goal)
    expect(keypad.pledged + price * 0.9).toBeGreaterThanOrEqual(keypad.goal)
    const promotions = documents('promotions').map(({ doc }) => doc as { code?: string; start: string; end?: string })
    expect(derivePromotionState(promotions.find((p) => p.code === 'TINKER10')!, now)).toBe('active')
  })

  it('has an Inventor with no Campaigns', () => {
    expect(documents('inventors').some(({ stem }) => !campaigns.some((c) => c.inventor === stem))).toBe(true)
  })

  it('has a category no Campaign is filed in', () => {
    const categories = documents('categories').map((s) => s.stem)
    expect(categories.some((slug) => !campaigns.some((c) => c.category === slug))).toBe(true)
  })

  it('has a Promotion in every state', () => {
    const states = new Set(documents('promotions').map(({ doc }) => derivePromotionState(doc as { start: string; end?: string }, now)))
    expect([...states].sort()).toEqual(['active', 'expired', 'scheduled'])
  })

  it('gives the demo Backer a past Pledge to a Live, a Funded and an Unfunded Campaign', () => {
    const pledges = parseDocument(`${qa}backer/backer.yml`).pledges as { campaign: string }[]
    const pledged = pledges.map((p) => campaigns.find((c) => c.slug === p.campaign)?.status)
    expect(pledged.some((s) => s?.state === 'live')).toBe(true)
    expect(pledged.some((s) => s?.outcome === 'funded')).toBe(true)
    expect(pledged.some((s) => s?.outcome === 'unfunded')).toBe(true)
  })

  it('names a Live Campaign’s Backers, one exactly at launch and one long enough to wrap', () => {
    expect(campaigns.some((c) => c.status.state === 'live'
      && c.recent?.some((r) => r.at === c.launch) && c.recent.some((r) => r.name.length > 40))).toBe(true)
  })

  it('names a Backer exactly at an Ended Campaign’s end', () => {
    expect(campaigns.some((c) => c.status.state === 'ended' && c.recent?.some((r) => r.at === c.end))).toBe(true)
  })

  it('has a Live Campaign with Backers but none named', () => {
    expect(campaigns.some((c) => c.status.state === 'live' && c.backers > 0 && !c.recent)).toBe(true)
  })

  const categoryOf = (slug: string) => campaigns.find((c) => c.slug === slug)?.category

  it('has a Live Campaign whose Backers also backed Campaigns in other categories', () => {
    expect(campaigns.some((c) => c.status.state === 'live' && c.alsoBacked?.every((s) => categoryOf(s) !== c.category))).toBe(true)
  })

  it('has a Campaign whose Backers also backed the rest of its category, leaving no more to show', () => {
    expect(campaigns.some((c) => c.alsoBacked && campaigns.every((o) => o === c || o.category !== c.category || c.alsoBacked?.includes(o.slug)))).toBe(true)
  })

  it('has a Live Campaign without alsoBacked that has more in its category', () => {
    expect(campaigns.some((c) => c.status.state === 'live' && !c.alsoBacked
      && campaigns.some((o) => o !== c && o.category === c.category))).toBe(true)
  })
})
