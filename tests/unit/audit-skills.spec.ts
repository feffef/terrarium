// Unit tests for the audit-skills helper's pure core (ADR-0015) — window
// selection, usage tallying, and the three-source join where correctness bugs
// would hide. The FS IO is a thin shell over these and is exercised by running
// the Skill.
import { describe, expect, it } from 'vitest'
import {
  buildSkillRows,
  pickWindow,
  tallyUsage,
  type InventoryEntry,
  type OnDiskSkill,
  type UsageHit,
  type WindowSession,
} from '../../scripts/audit-skills.ts'

function sess(over: Partial<WindowSession> = {}): WindowSession {
  return {
    session: 's',
    kind: 'interactive',
    goal: 'goal',
    summary: 'summary',
    endedAt: '2026-07-05T10:00:00Z',
    skillsUsed: [],
    ...over,
  }
}

describe('pickWindow()', () => {
  it('keeps the newest n by endedAt, most-recent first', () => {
    const sessions = [
      sess({ session: 'a', endedAt: '2026-07-01T00:00:00Z' }),
      sess({ session: 'b', endedAt: '2026-07-03T00:00:00Z' }),
      sess({ session: 'c', endedAt: '2026-07-02T00:00:00Z' }),
    ]
    expect(pickWindow(sessions, 2).map((s) => s.session)).toEqual(['b', 'c'])
  })

  it('breaks endedAt ties by session id, deterministically', () => {
    const sessions = [
      sess({ session: 'a', endedAt: '2026-07-01T00:00:00Z' }),
      sess({ session: 'c', endedAt: '2026-07-01T00:00:00Z' }),
      sess({ session: 'b', endedAt: '2026-07-01T00:00:00Z' }),
    ]
    expect(pickWindow(sessions, 3).map((s) => s.session)).toEqual(['c', 'b', 'a'])
  })

  it('does not mutate its input', () => {
    const sessions = [sess({ session: 'a' }), sess({ session: 'b' })]
    const before = sessions.map((s) => s.session)
    pickWindow(sessions, 1)
    expect(sessions.map((s) => s.session)).toEqual(before)
  })
})

describe('tallyUsage()', () => {
  it('counts one hit per session that used a Skill, with its kind + goal', () => {
    const window = [
      sess({ session: 's1', goal: 'blog', skillsUsed: [{ name: 'blog-post', reason: 'r' }] }),
      sess({ session: 's2', goal: 'blog again', skillsUsed: [{ name: 'blog-post', reason: 'r' }] }),
    ]
    const hits = tallyUsage(window).get('blog-post') as UsageHit[]
    expect(hits).toHaveLength(2)
    expect(hits.map((h) => h.session)).toEqual(['s1', 's2'])
    expect(hits[0]).toEqual({ session: 's1', kind: 'interactive', goal: 'blog' })
  })

  it('de-dupes a Skill listed twice in the same session', () => {
    const window = [
      sess({ session: 's1', skillsUsed: [
        { name: 'tdd', reason: 'red' },
        { name: 'tdd', reason: 'green' },
      ] }),
    ]
    expect(tallyUsage(window).get('tdd')).toHaveLength(1)
  })

  it('ignores empty skill names', () => {
    const window = [sess({ skillsUsed: [{ name: '', reason: 'r' }] })]
    expect(tallyUsage(window).size).toBe(0)
  })
})

describe('buildSkillRows()', () => {
  const onDisk = new Map<string, OnDiskSkill>([
    ['blog-post', { description: 'author a post' }],
    ['ghost', { description: 'never inventoried' }],
  ])
  const inventory = new Map<string, InventoryEntry>([
    ['blog-post', { category: 'platform-operation', importance: 'specialist', role: 'blogs' }],
    ['retired', { category: 'general-engineering', importance: 'peripheral', role: 'gone from disk' }],
  ])
  const usage = new Map<string, UsageHit[]>([
    ['blog-post', [{ session: 's1', kind: 'interactive', goal: 'blog' }]],
  ])
  const external = new Set<string>(['ghost']) // ghost is a pack Skill
  const rows = buildSkillRows(onDisk, inventory, usage, external)
  const row = (n: string) => rows.find((r) => r.name === n)!

  it('unions every name across the sources, sorted', () => {
    expect(rows.map((r) => r.name)).toEqual(['blog-post', 'ghost', 'retired'])
  })

  it('joins on-disk description, Inventory grade, and windowed usage', () => {
    expect(row('blog-post')).toMatchObject({
      onDisk: true, inventoried: true, importance: 'specialist',
      description: 'author a post', useCount: 1, external: false,
    })
  })

  it('marks pack Skills external (frontmatter not ours to patch)', () => {
    expect(row('ghost').external).toBe(true)
    expect(row('blog-post').external).toBe(false)
  })

  it('flags an on-disk Skill with no Inventory entry (coverage gap)', () => {
    expect(row('ghost')).toMatchObject({ onDisk: true, inventoried: false, importance: null, useCount: 0 })
  })

  it('flags an inventoried Skill gone from disk (stale entry)', () => {
    expect(row('retired')).toMatchObject({ onDisk: false, inventoried: true, description: null })
  })
})
