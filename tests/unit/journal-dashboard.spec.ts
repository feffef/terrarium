// Unit tests for the Journal dashboard's pure aggregation/formatting module
// (issue #61) — the logic that computes what the public dashboard displays
// (friction counts, durations, orderings, the Skill catalogue grouping). It was
// extracted verbatim from `tenants/journal/app/pages/t/journal/[space]/index.vue`,
// so these lock in the behavior the SFC used to embed.
//
// Importing the module here also pulls it into `tsc -p tsconfig.node.json` (the
// second half of `pnpm typecheck`) transitively, so the layer-local module is
// typechecked before #55 lands (see the issue).
import { describe, expect, it } from 'vitest'
import {
  cards,
  countFrictions,
  digestList,
  durMin,
  externalSkillCount,
  fmtWhen,
  frictionCount,
  frictionTotals,
  kindCounts,
  ownSkills,
  prRefs,
  shortId,
  skillGroups,
  skillsLabel,
  skillsSub,
} from '../../tenants/journal/app/utils/dashboard.ts'
import type { Friction, SessionDoc, Severity, SkillDoc } from '../../tenants/journal/app/types/journal.ts'

function friction(severity: string): Friction {
  return { description: 'd', solution: 's', severity: severity as Severity }
}

function session(over: Partial<SessionDoc> = {}): SessionDoc {
  return {
    session: 'sess-1',
    startedAt: '2026-07-05T10:00:00Z',
    endedAt: '2026-07-05T11:00:00Z',
    kind: 'interactive',
    goal: 'goal',
    status: 'completed',
    outcome: 'outcome',
    summary: 'summary',
    prs: [],
    docsRead: [],
    skillsUsed: [],
    frictions: [],
    ...over,
  }
}

function skill(over: Partial<SkillDoc> = {}): SkillDoc {
  return { name: 'a', category: 'platform-operation', importance: 'core', role: 'role', ...over }
}

describe('countFrictions', () => {
  it('counts the five known severities and ignores unknown ones', () => {
    const list = [
      friction('nit'),
      friction('nit'),
      friction('minor'),
      friction('moderate'),
      friction('major'),
      friction('blocker'),
      friction('catastrophic'), // unknown — ignored
      friction(''), // unknown — ignored
    ]
    expect(countFrictions(list)).toEqual({ nit: 2, minor: 1, moderate: 1, major: 1, blocker: 1 })
  })

  it('returns an all-zero record for an empty list', () => {
    expect(countFrictions([])).toEqual({ nit: 0, minor: 0, moderate: 0, major: 0, blocker: 0 })
  })
})

describe('durMin', () => {
  it('rounds to the nearest minute', () => {
    // 90s → 1.5 min → rounds to 2
    expect(durMin('2026-07-05T00:00:00Z', '2026-07-05T00:01:30Z')).toBe(2)
    // 100 min exactly
    expect(durMin('2026-07-05T10:00:00Z', '2026-07-05T11:40:00Z')).toBe(100)
  })

  it('clamps zero and negative durations to at least 1', () => {
    expect(durMin('2026-07-05T10:00:00Z', '2026-07-05T10:00:00Z')).toBe(1) // 0 → 1
    expect(durMin('2026-07-05T11:00:00Z', '2026-07-05T10:00:00Z')).toBe(1) // negative → 1
    // a sub-30s positive span rounds to 0 then clamps to 1
    expect(durMin('2026-07-05T10:00:00Z', '2026-07-05T10:00:10Z')).toBe(1)
  })
})

describe('shortId', () => {
  it('leaves ids of 18 chars or fewer untouched', () => {
    expect(shortId('short')).toBe('short')
    expect(shortId('a'.repeat(18))).toBe('a'.repeat(18))
  })

  it('truncates ids longer than 18 chars to a 13…4 form', () => {
    const id = 'session_0123456789abcdefXYZW' // 28 chars
    expect(shortId(id)).toBe('session_01234…XYZW')
    // first 13 chars, ellipsis, last 4 chars
    expect(shortId(id)).toBe(`${id.slice(0, 13)}…${id.slice(-4)}`)
  })
})

describe('fmtWhen', () => {
  it('formats an ISO instant as UTC month/day · HH:MM', () => {
    expect(fmtWhen('2026-07-05T09:07:00Z')).toBe('Jul 5 · 09:07 UTC')
    expect(fmtWhen('2026-01-31T23:04:00Z')).toBe('Jan 31 · 23:04 UTC')
  })
})

describe('frictionTotals / frictionCount', () => {
  it('rolls up severities across all sessions', () => {
    const sessions = [
      session({ frictions: [friction('nit'), friction('blocker')] }),
      session({ frictions: [friction('nit'), friction('major'), friction('unknown')] }),
    ]
    expect(frictionTotals(sessions)).toEqual({ nit: 2, minor: 0, moderate: 0, major: 1, blocker: 1 })
    // frictionCount counts every friction, including unknown severities
    expect(frictionCount(sessions)).toBe(5)
  })
})

describe('kindCounts', () => {
  it('counts interactive vs autonomous sessions', () => {
    const sessions = [
      session({ kind: 'interactive' }),
      session({ kind: 'autonomous' }),
      session({ kind: 'interactive' }),
    ]
    expect(kindCounts(sessions)).toEqual({ interactive: 2, autonomous: 1 })
  })
})

describe('prRefs', () => {
  it('strips a leading #, de-dupes, and sorts numerically', () => {
    const sessions = [session({ prs: ['#12', '12'] }), session({ prs: ['3'] })]
    expect(prRefs(sessions)).toEqual(['3', '12'])
  })

  it('sorts numerically, not lexically', () => {
    const sessions = [session({ prs: ['#2', '#10', '#1'] })]
    expect(prRefs(sessions)).toEqual(['1', '2', '10'])
  })
})

describe('skill catalogue', () => {
  const skills = [
    skill({ name: 'edit-content', category: 'platform-operation', importance: 'core' }),
    skill({ name: 'add-space', category: 'platform-operation', importance: 'core' }),
    skill({ name: 'triage', category: 'platform-operation', importance: 'supporting' }),
    skill({ name: 'tdd', category: 'general-engineering', importance: 'core' }),
    skill({ name: 'code-review', category: 'general-engineering', importance: 'supporting' }),
  ]

  it('ownSkills keeps only platform-operation Skills', () => {
    expect(ownSkills(skills).map((s) => s.name).sort()).toEqual(['add-space', 'edit-content', 'triage'])
  })

  it('externalSkillCount counts the non-own Skills', () => {
    expect(externalSkillCount(skills)).toBe(2)
  })

  it('skillsLabel carries the external count only when non-zero', () => {
    expect(skillsLabel(0)).toBe('Platform Skills')
    expect(skillsLabel(2)).toBe('Platform Skills (+2 from an external pack)')
  })

  it('skillsSub joins non-empty importance buckets, else "none yet"', () => {
    expect(skillsSub(ownSkills(skills))).toBe('2 core · 1 supporting')
    expect(skillsSub([])).toBe('none yet')
  })

  it('skillGroups orders core → supporting → peripheral, alpha within a group, dropping empties', () => {
    const groups = skillGroups(ownSkills(skills))
    expect(groups.map((g) => g.importance)).toEqual(['core', 'supporting']) // peripheral empty → dropped
    expect(groups[0]!.skills.map((s) => s.name)).toEqual(['add-space', 'edit-content']) // alpha within core
    expect(groups[1]!.skills.map((s) => s.name)).toEqual(['triage'])
  })
})

describe('cards', () => {
  it('maps a SessionDoc to its display view, including shortId truncation', () => {
    const s = session({
      session: 'session_0123456789abcdefXYZW',
      startedAt: '2026-07-05T10:00:00Z',
      endedAt: '2026-07-05T11:30:00Z',
      prs: ['#7'],
      frictions: [friction('nit'), friction('blocker')],
      skillsUsed: [{ name: 'tdd', reason: 'r' }],
      docsRead: [{ path: 'CLAUDE.md', reason: 'r' }],
    })
    const [c] = cards([s])
    expect(c!.key).toBe('session_0123456789abcdefXYZW')
    expect(c!.sid).toBe('session_01234…XYZW')
    expect(c!.when).toBe('Jul 5 · 11:30 UTC')
    expect(c!.duration).toBe(90)
    expect(c!.frictionCounts).toEqual({ nit: 1, minor: 0, moderate: 0, major: 0, blocker: 1 })
    expect(c!.frictionTotal).toBe(2)
    expect(c!.skills).toEqual(['tdd'])
    expect(c!.prs).toEqual(['#7'])
    expect(c!.goal).toBe('goal')
    expect(c!.docsRead).toEqual([{ path: 'CLAUDE.md', reason: 'r' }])
  })
})

describe('digestList', () => {
  it('keeps only /digests/* paths, newest first, with summary → description → "" fallback', () => {
    const pages = [
      { path: '/', summary: 'root' },
      { path: '/about', description: 'about' },
      { path: '/digests/2026-07-03', summary: 'day three' },
      { path: '/digests/2026-07-05', description: 'day five desc' }, // no summary → description
      { path: '/digests/2026-07-04' }, // neither → ''
    ]
    expect(digestList(pages)).toEqual([
      { date: '2026-07-05', summary: 'day five desc', doc: pages[3] },
      { date: '2026-07-04', summary: '', doc: pages[4] },
      { date: '2026-07-03', summary: 'day three', doc: pages[2] },
    ])
  })
})
