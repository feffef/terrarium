// Unit tests for the Midden's first-use gloss matching (layers/midden/app/utils/gloss.ts, issue #1463).
import { describe, expect, it } from 'vitest'
import { middenGlossBody, middenGlossParts, type MiddenGlossKey } from '../../app/utils/gloss.ts'

describe('middenGlossParts', () => {
  it('marks only the first use of each term, keeping the authored text exact', () => {
    const text = 'A Tenant and its Space; another Tenant, and ADR-0008 ruled.'
    const parts = middenGlossParts(text, new Set())
    expect(parts).toEqual([
      'A ', { key: 'tenant', text: 'Tenant' }, ' and its ', { key: 'space', text: 'Space' },
      '; another Tenant, and ', { key: 'adr', text: 'ADR-0008' }, ' ruled.',
    ])
    expect(parts.map((p) => (typeof p === 'string' ? p : p.text)).join('')).toBe(text)
  })

  it('skips terms already seen and records the ones it marks', () => {
    const seen = new Set<MiddenGlossKey>(['tenant'])
    expect(middenGlossParts('Tenants keep isolation.', seen)).toEqual([
      'Tenants keep ', { key: 'isolation', text: 'isolation' }, '.',
    ])
    expect(seen).toEqual(new Set(['tenant', 'isolation']))
  })

  it('leaves ordinary lowercase words alone', () => {
    expect(middenGlossParts('a space in the platform', new Set())).toEqual(['a space in the platform'])
  })
})

describe('middenGlossBody', () => {
  it('shares first use across prose and the embedded finds, in document order', () => {
    const body: Parameters<typeof middenGlossBody>[0] = [
      ['p', {}, 'The Tenant held; ', ['code', {}, 'sync'], ' too.'],
      ['midden-artifact', { slug: 'a' }],
      ['p', {}, ['a', { href: '/x' }, 'Space link'], ' then Space.'],
    ]
    const { nodes, notes } = middenGlossBody(body, { a: 'A Tenant in a Space.' })
    expect(nodes).toEqual([
      ['p', {}, 'The ', ['midden-gloss', { term: 'tenant' }, 'Tenant'], ' held; ',
        ['code', {}, ['midden-gloss', { term: 'job' }, 'sync']], ' too.'],
      ['midden-artifact', { slug: 'a' }],
      ['p', {}, ['a', { href: '/x' }, 'Space link'], ' then Space.'],
    ])
    expect(notes.a).toEqual(['A Tenant in a ', { key: 'space', text: 'Space' }, '.'])
  })
})
