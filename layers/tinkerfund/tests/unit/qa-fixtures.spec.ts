// qa's edge-case set (story #1379): the component gallery and the e2e tests
// rely on each case staying true at qa's pinned now.
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { parseDocument } from '../../../../scripts/validate-content.ts'
import { deriveCampaignStatus, derivePromotionState } from '../../app/utils/status'

interface Campaign {
  category: string
  goal: number
  launch: string
  end: string
  backers: number
  pledged: number
  rewards: { claimed: number; stock?: number }[]
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
})
