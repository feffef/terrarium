// The manifest's Collection schemas are what `pnpm validate:content` runs every
// Tinkerfund Document through (issue #1366).
import { describe, expect, it } from 'vitest'
import manifest from '../../tenant.config.ts'

function schemaOf(collection: string) {
  const schema = manifest.collections[collection]?.schema
  if (!schema) throw new Error(`no schema for ${collection}`)
  return schema
}

function issues(collection: string, doc: unknown): string[] {
  const res = schemaOf(collection).safeParse(doc)
  return res.success ? [] : res.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)
}

function validCampaign() {
  return {
    registry: 'TF-0001',
    inventor: 'ada',
    category: 'kitchen',
    goal: 1000,
    launch: '-12d',
    end: '+18d',
    backers: 12,
    pledged: 480,
    specifications: [{ label: 'Capacity', value: '330 ml' }],
    figures: [
      { style: 'isometric', caption: 'The mug', svg: '<rect width="10" height="10"/>' },
      { style: 'patent', caption: 'Section A', svg: '<path d="M0 0h10"/>' },
    ],
    rewards: [
      {
        id: 'mug',
        title: 'One mug',
        price: 29,
        claimed: 12,
        stock: 200,
        limit: 2,
        options: [{ id: 'colour', name: 'Colour', choices: [{ id: 'red', label: 'Red' }, { id: 'blue', label: 'Blue' }] }],
        shipsTo: ['domestic', 'europe'],
        delivery: '+90d',
      },
      { id: 'manual', title: 'The manual (PDF)', price: 5, claimed: 3, digital: true, delivery: '+20d' },
    ],
    addons: [{ id: 'coaster', title: 'Coaster', price: 6, claimed: 1 }],
    stretchGoals: [{ id: 'saucer', amount: 2000, title: 'A saucer' }],
    shipping: { domestic: 4, europe: 9 },
  }
}

describe('Campaign pages', () => {
  it('accepts a well-formed Campaign, and a plain page with none', () => {
    expect(issues('pages', { campaign: validCampaign() })).toEqual([])
    expect(issues('pages', {})).toEqual([])
  })

  it('rejects a registry number that is not TF-000n', () => {
    expect(issues('pages', { campaign: { ...validCampaign(), registry: 'TF-1' } })).toHaveLength(1)
  })

  it.each(['12d', '+1.5d', 'tomorrow'])('rejects the malformed offset %j', (end) => {
    expect(issues('pages', { campaign: { ...validCampaign(), end } })).toEqual([expect.stringMatching(/^campaign\.end: .*offset/)])
  })

  it('rejects a Campaign that ends before it launches', () => {
    expect(issues('pages', { campaign: { ...validCampaign(), launch: '+2d', end: '+1d' } })).toEqual([
      expect.stringMatching(/^campaign\.end: .*after launch/),
    ])
  })

  it('requires the first figure to be isometric', () => {
    const [iso, patent] = validCampaign().figures
    expect(issues('pages', { campaign: { ...validCampaign(), figures: [patent, iso] } })).toEqual([
      expect.stringMatching(/^campaign\.figures\.0\.style: .*isometric/),
    ])
  })

  it('requires at least one patent figure', () => {
    const [iso] = validCampaign().figures
    expect(issues('pages', { campaign: { ...validCampaign(), figures: [iso, iso] } })).toEqual([
      expect.stringMatching(/^campaign\.figures: .*patent/),
    ])
  })

  it('rejects a Reward, Add-on or Stretch goal id used twice in one Campaign', () => {
    const c = validCampaign()
    expect(issues('pages', { campaign: { ...c, addons: [{ ...c.addons[0], id: 'mug' }] } })).toEqual([
      expect.stringMatching(/^campaign\.addons\.0\.id: .*"mug".*more than once/),
    ])
  })

  it('rejects an option id used twice within its group', () => {
    const c = validCampaign()
    const [mug, manual] = c.rewards
    const colour = { ...mug!.options![0]!, choices: [{ id: 'red', label: 'Red' }, { id: 'red', label: 'Crimson' }] }
    expect(issues('pages', { campaign: { ...c, rewards: [{ ...mug, options: [colour] }, manual] } })).toEqual([
      expect.stringMatching(/^campaign\.rewards\.0\.options\.0\.choices\.1\.id: .*"red".*more than once/),
    ])
  })

  it('lets two Rewards share an option id, since a Pledge line names options by Reward', () => {
    const c = validCampaign()
    const [mug, manual] = c.rewards
    expect(issues('pages', { campaign: { ...c, rewards: [mug, { ...manual, options: mug!.options }] } })).toEqual([])
  })

  it('rejects a Reward that is neither digital nor shipped', () => {
    const c = validCampaign()
    const { shipsTo: _, ...unshipped } = c.rewards[0]!
    expect(issues('pages', { campaign: { ...c, rewards: [unshipped, c.rewards[1]] } })).toEqual([
      expect.stringMatching(/^campaign\.rewards\.0: .*digital.*shipsTo/),
    ])
  })

  it('rejects a zone a Reward ships to but the Campaign has no rate for', () => {
    expect(issues('pages', { campaign: { ...validCampaign(), shipping: { domestic: 4 } } })).toEqual([
      expect.stringMatching(/^campaign\.shipping\.europe: /),
    ])
  })

  it('rejects an unknown field, so a typo never passes silently', () => {
    expect(issues('pages', { campaign: { ...validCampaign(), goall: 5 } })).toHaveLength(1)
  })
})

describe('SVG markup', () => {
  const figure = (svg: string) => ({ campaign: { ...validCampaign(), figures: [{ style: 'isometric', caption: 'x', svg }, validCampaign().figures[1]] } })

  it('accepts colour from theme tokens, alone or mixed', () => {
    expect(issues('pages', figure(
      '<g style="fill:var(--tf-accent);stroke:none"><path d="M0 0" fill="color-mix(in srgb, var(--tf-accent) 70%, var(--tf-ink))" stroke="currentColor" /></g>',
    ))).toEqual([])
  })

  it.each([
    ['a hex fill', '<path fill="#c2410c" d="M0 0" />'],
    ['a single-quoted hex fill', `<path fill='#c2410c' d="M0 0" />`],
    ['an unquoted hex fill', '<path fill=#c2410c d="M0 0" />'],
    ['a named stroke', '<path style="stroke:black" d="M0 0" />'],
    ['a literal inside color-mix', '<path style="fill:color-mix(in srgb, var(--tf-accent) 70%, #000)" d="M0 0" />'],
    ['a non-Tinkerfund variable', '<path fill="var(--accent)" d="M0 0" />'],
  ])('rejects %s, which cannot follow the theme', (_, svg) => {
    expect(issues('pages', figure(svg))).toEqual([expect.stringMatching(/^campaign\.figures\.0\.svg: .*theme token/)])
  })

  it('holds a figure to 4 KiB and a portrait or icon to 1 KiB', () => {
    const markup = (bytes: number) => `<g>${' '.repeat(bytes - 7)}</g>`
    expect(markup(4096)).toHaveLength(4096)
    expect(issues('pages', figure(markup(4096)))).toEqual([])
    expect(issues('pages', figure(markup(4097)))).toEqual([expect.stringMatching(/^campaign\.figures\.0\.svg: .*4096 bytes/)])
    expect(issues('inventors', { name: 'Ada', bio: 'x', portrait: markup(1024) })).toEqual([])
    expect(issues('inventors', { name: 'Ada', bio: 'x', portrait: markup(1025) })).toEqual([expect.stringMatching(/^portrait: .*1024 bytes/)])
    expect(issues('categories', { name: 'Desk', blurb: 'x', icon: markup(1025), order: 1 })).toEqual([expect.stringMatching(/^icon: .*1024 bytes/)])
  })

  it('rejects an id, which would collide when a figure is drawn twice on one page', () => {
    expect(issues('inventors', { name: 'Ada', bio: 'x', portrait: '<clipPath id="c"><circle r="4" /></clipPath>' })).toEqual([
      expect.stringMatching(/^portrait: .*id/),
    ])
  })
})

describe('Update pages', () => {
  it('accepts a publish offset and rejects a malformed one', () => {
    expect(issues('pages', { update: { published: '-3d' } })).toEqual([])
    expect(issues('pages', { update: { published: 'yesterday' } })).toHaveLength(1)
  })
})

describe('data Collections', () => {
  it('accepts well-formed Documents', () => {
    expect(issues('inventors', { name: 'Ada Quill', bio: 'Turns things around.', portrait: '<circle r="4"/>' })).toEqual([])
    expect(issues('categories', { name: 'Kitchen', blurb: 'Cook less.', icon: '<path d="M0 0"/>', order: 1 })).toEqual([])
    expect(issues('comments', {
      campaign: 'mug',
      comments: [{ author: 'Bo', posted: '-2d', text: 'Nice.', replies: [{ author: 'Ada', posted: '-1d', text: 'Thanks.', inventor: true }] }],
    })).toEqual([])
    expect(issues('promotions', { title: 'Launch week', description: 'A thank-you.', campaign: 'mug', discount: { amount: 5 }, start: '-1d', end: '+6d' })).toEqual([])
    expect(issues('promotions', { title: 'Shop-wide', code: 'TINKER10', discount: { percent: 10 }, start: '-1d' })).toEqual([])
    expect(issues('backer', {
      name: 'Demo Backer',
      email: 'backer@example.test',
      address: { street: '1 Test Way', city: 'Testville', postcode: '12345', country: 'Germany', zone: 'domestic' },
      pledges: [{ ref: 'TF-P-0001', campaign: 'mug', placed: '-5d', zone: 'domestic', lines: [{ reward: 'mug', options: { colour: 'red' }, quantity: 1 }] }],
    })).toEqual([])
    expect(issues('shop', {
      now: '2026-06-01T12:00:00Z',
      currency: 'EUR',
      zones: [{ id: 'domestic', name: 'Domestic' }, { id: 'europe', name: 'Europe' }, { id: 'world', name: 'Rest of world' }],
      payments: [{ id: 'demo-card', label: 'Tinkerfund Demo Card ····4242' }],
    })).toEqual([])
  })

  it('rejects a reply to a reply — threads are one level deep', () => {
    expect(issues('comments', {
      campaign: 'mug',
      comments: [{ author: 'Bo', posted: '-2d', text: 'x', replies: [{ author: 'A', posted: '-1d', text: 'y', replies: [] }] }],
    })).toHaveLength(1)
  })

  it('rejects a Promotion with both or neither of percent and amount', () => {
    expect(issues('promotions', { title: 'x', discount: { percent: 10, amount: 5 }, start: '-1d', end: '+1d' })).toHaveLength(1)
    expect(issues('promotions', { title: 'x', start: '-1d', end: '+1d' })).toHaveLength(1)
  })

  it('rejects a shop.now that is not an exact instant', () => {
    expect(issues('shop', { now: 'June 1st', currency: 'EUR', zones: [], payments: [] })).toHaveLength(1)
  })
})
