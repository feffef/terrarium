// Unit tests for the Journal dashboard's pure aggregation/formatting module
// (issue #61) — the logic that computes what the public dashboard displays
// (friction counts, durations, orderings, the Skill Inventory grouping). It was
// extracted verbatim from `layers/journal/app/pages/t/journal/[space]/index.vue`,
// so these lock in the behavior the SFC used to embed.
//
// Importing the module here also pulls it into `tsc -p tsconfig.node.json` (the
// second half of `pnpm typecheck`) transitively, so the layer-local module is
// typechecked before #55 lands (see the issue).
import { describe, expect, it } from 'vitest'
import {
  sessionCardViews,
  countFrictions,
  digestAnchor,
  digestList,
  ideaGrillPrompt,
  latestIdeas,
  sessionAnchor,
  sessionDurationMin,
  externalSkillCount,
  sessionWhen,
  sessionModelsLabel,
  SPARK_FEED_DAYS,
  SPARK_FEED_LIMIT,
  frictionCount,
  frictionTotals,
  kindCounts,
  ownSkills,
  prRefs,
  prRefsParts,
  prUrl,
  sessionShortId,
  skillGroups,
  skillsLabel,
  skillsSub,
  sessionToolEntries,
} from '../../app/utils/dashboard.ts'
import type { Friction, SessionDoc, Severity, SkillDoc } from '../../app/types/journal.ts'

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
  return { name: 'a', category: 'platform-operation', importance: 'essential', role: 'role', observations: [], ...over }
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

describe('sessionDurationMin', () => {
  it('rounds to the nearest minute', () => {
    // 90s → 1.5 min → rounds to 2
    expect(sessionDurationMin('2026-07-05T00:00:00Z', '2026-07-05T00:01:30Z')).toBe(2)
    // 100 min exactly
    expect(sessionDurationMin('2026-07-05T10:00:00Z', '2026-07-05T11:40:00Z')).toBe(100)
  })

  it('clamps zero and negative durations to at least 1', () => {
    expect(sessionDurationMin('2026-07-05T10:00:00Z', '2026-07-05T10:00:00Z')).toBe(1) // 0 → 1
    expect(sessionDurationMin('2026-07-05T11:00:00Z', '2026-07-05T10:00:00Z')).toBe(1) // negative → 1
    // a sub-30s positive span rounds to 0 then clamps to 1
    expect(sessionDurationMin('2026-07-05T10:00:00Z', '2026-07-05T10:00:10Z')).toBe(1)
  })
})

describe('sessionShortId', () => {
  it('leaves ids of 18 chars or fewer untouched', () => {
    expect(sessionShortId('short')).toBe('short')
    expect(sessionShortId('a'.repeat(18))).toBe('a'.repeat(18))
  })

  it('truncates ids longer than 18 chars to a 13…4 form', () => {
    const id = 'session_0123456789abcdefXYZW' // 28 chars
    expect(sessionShortId(id)).toBe('session_01234…XYZW')
    // first 13 chars, ellipsis, last 4 chars
    expect(sessionShortId(id)).toBe(`${id.slice(0, 13)}…${id.slice(-4)}`)
  })
})

describe('sessionWhen', () => {
  it('formats an ISO instant as UTC month/day · HH:MM', () => {
    expect(sessionWhen('2026-07-05T09:07:00Z')).toBe('Jul 5 · 09:07 UTC')
    expect(sessionWhen('2026-01-31T23:04:00Z')).toBe('Jan 31 · 23:04 UTC')
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
  it('counts interactive, delegated, and autonomous sessions', () => {
    const sessions = [
      session({ kind: 'interactive' }),
      session({ kind: 'autonomous' }),
      session({ kind: 'delegated' }),
      session({ kind: 'interactive' }),
    ]
    expect(kindCounts(sessions)).toEqual({ interactive: 2, delegated: 1, autonomous: 1 })
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

describe('prRefsParts', () => {
  it('is empty with no overflow when no PRs are referenced', () => {
    expect(prRefsParts([])).toEqual({ shown: [], rest: 0 })
  })

  it('shows all PRs newest-first when they fit', () => {
    expect(prRefsParts(['3', '12'])).toEqual({ shown: ['12', '3'], rest: 0 })
    expect(prRefsParts(['1', '2', '10'])).toEqual({ shown: ['10', '2', '1'], rest: 0 })
  })

  it('folds the overflow into a rest count', () => {
    expect(prRefsParts(['1', '2', '3', '4', '5'])).toEqual({ shown: ['5', '4', '3'], rest: 2 })
  })

  it('does not mutate the input list', () => {
    const refs = ['1', '2', '3', '4']
    prRefsParts(refs)
    expect(refs).toEqual(['1', '2', '3', '4'])
  })
})

describe('prUrl', () => {
  it('links a PR number to the repo, stripping a leading #', () => {
    expect(prUrl('166')).toBe('https://github.com/feffef/terrarium/pull/166')
    expect(prUrl('#166')).toBe('https://github.com/feffef/terrarium/pull/166')
  })
})

describe('skill inventory', () => {
  const skills = [
    skill({ name: 'edit-content', category: 'platform-operation', importance: 'essential' }),
    skill({ name: 'add-space', category: 'platform-operation', importance: 'essential' }),
    skill({ name: 'triage', category: 'platform-operation', importance: 'supporting' }),
    skill({ name: 'tdd', category: 'general-engineering', importance: 'essential' }),
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
    expect(skillsSub(ownSkills(skills))).toBe('2 essential · 1 supporting')
    expect(skillsSub([])).toBe('none yet')
  })

  it('skillGroups orders essential → specialist → supporting → peripheral, alpha within a group, dropping empties', () => {
    const groups = skillGroups(ownSkills(skills))
    expect(groups.map((g) => g.importance)).toEqual(['essential', 'supporting']) // specialist + peripheral empty → dropped
    expect(groups[0]!.skills.map((s) => s.name)).toEqual(['add-space', 'edit-content']) // alpha within essential
    expect(groups[1]!.skills.map((s) => s.name)).toEqual(['triage'])
  })
})

describe('sessionModelsLabel', () => {
  it('strips the claude- prefix and joins busiest-first', () => {
    expect(sessionModelsLabel({ 'claude-opus-4-8': 137 })).toBe('opus-4-8')
    expect(sessionModelsLabel({ 'claude-sonnet-5': 4, 'claude-opus-4-8': 137 })).toBe('opus-4-8 · sonnet-5')
  })

  it('breaks equal counts by id and returns "" when absent', () => {
    expect(sessionModelsLabel({ 'claude-b': 2, 'claude-a': 2 })).toBe('a · b')
    expect(sessionModelsLabel(undefined)).toBe('')
    expect(sessionModelsLabel({})).toBe('')
  })
})

describe('sessionToolEntries', () => {
  it('sorts by count desc then name, and handles absent', () => {
    expect(sessionToolEntries({ Bash: 19, Read: 5, Edit: 5 })).toEqual([
      { name: 'Bash', count: 19 },
      { name: 'Edit', count: 5 },
      { name: 'Read', count: 5 },
    ])
    expect(sessionToolEntries(undefined)).toEqual([])
  })
})

describe('sessionCardViews', () => {
  it('maps a SessionDoc to its display view, including sessionShortId truncation', () => {
    const s = session({
      session: 'session_0123456789abcdefXYZW',
      startedAt: '2026-07-05T10:00:00Z',
      endedAt: '2026-07-05T11:30:00Z',
      prs: ['#7'],
      frictions: [friction('nit'), friction('blocker')],
      skillsUsed: [{ name: 'tdd', reason: 'r' }],
      docsRead: [{ path: 'CLAUDE.md', reason: 'r' }],
    })
    const [c] = sessionCardViews([s])
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

  it('surfaces the mechanical trace: model, subagents, files edited, tools', () => {
    const s = session({
      models: { 'claude-opus-4-8': 100, 'claude-sonnet-5': 3 },
      subagents: [{ type: 'general-purpose', task: 'survey', model: 'sonnet' }],
      filesEdited: ['a.ts', 'b.vue'],
      toolCounts: { Bash: 9, Read: 2 },
    })
    const [c] = sessionCardViews([s])
    expect(c!.model).toBe('opus-4-8 · sonnet-5')
    expect(c!.subagents).toEqual([{ type: 'general-purpose', task: 'survey', model: 'sonnet' }])
    expect(c!.filesEdited).toEqual(['a.ts', 'b.vue'])
    expect(c!.tools).toEqual([{ name: 'Bash', count: 9 }, { name: 'Read', count: 2 }])
  })

  it('defaults the trace fields for an older, authored-only log', () => {
    const [c] = sessionCardViews([session()])
    expect(c!.model).toBe('')
    expect(c!.subagents).toEqual([])
    expect(c!.filesEdited).toEqual([])
    expect(c!.tools).toEqual([])
  })

  it('surfaces authored learnings/ideas, and defaults them to [] when absent', () => {
    const [with_] = sessionCardViews([session({ learnings: ['a thing'], ideas: ['a spark'] })])
    expect(with_!.learnings).toEqual(['a thing'])
    expect(with_!.ideas).toEqual(['a spark'])
    const [without] = sessionCardViews([session()])
    expect(without!.learnings).toEqual([])
    expect(without!.ideas).toEqual([])
  })

  it('normalizes `external` to a boolean, defaulting to false when absent (ADR-0009 amendment)', () => {
    const [marked] = sessionCardViews([session({ external: true })])
    expect(marked!.external).toBe(true)
    const [unmarked] = sessionCardViews([session()])
    expect(unmarked!.external).toBe(false)
    const [explicitFalse] = sessionCardViews([session({ external: false })])
    expect(explicitFalse!.external).toBe(false)
  })
})

describe('deep-link anchors', () => {
  it('namespaces the two feeds so their fragment ids never collide', () => {
    expect(sessionAnchor('session_011Y8H9m3q94H3FMXkZMhztp')).toBe('session-session_011Y8H9m3q94H3FMXkZMhztp')
    expect(digestAnchor('2026-07-04')).toBe('digest-2026-07-04')
    // Distinct prefixes ⇒ a session id and a digest date can never map to the
    // same anchor, which the page-wide single-open accordion relies on.
    expect(sessionAnchor('x')).not.toBe(digestAnchor('x'))
  })
})

describe('latestIdeas', () => {
  // A fixed "now" so the recency window (SPARK_FEED_DAYS) is deterministic: the
  // cutoff is exactly 2026-07-05T11:00:00Z, so all three fixture sessions (and
  // the default-dated `many` sessions below) fall inside the window.
  const NOW = new Date('2026-07-08T11:00:00Z').getTime()

  // Deliberately passed newest-first, matching the SFC's real
  // `.order('endedAt', 'DESC')` query — latestIdeas relies on that order to
  // return the latest ideas with no re-sort of its own.
  const sessions = [
    session({ session: 's3', endedAt: '2026-07-07T11:00:00Z', ideas: ['idea three'], learnings: ['a learning'] }),
    session({ session: 's2', endedAt: '2026-07-06T11:00:00Z', ideas: ['idea two-a', 'idea two-b'], learnings: [] }),
    session({ session: 's1', endedAt: '2026-07-05T11:00:00Z', ideas: ['idea one'], learnings: ['another learning'] }),
  ]

  it('flattens ideas only (never learnings), preserving newest-first order', () => {
    const ideas = latestIdeas(sessions, SPARK_FEED_LIMIT, NOW)
    expect(ideas.map((i) => i.spark)).toEqual(['idea three', 'idea two-a', 'idea two-b', 'idea one'])
    expect(ideas.every((i) => i.kind === 'idea')).toBe(true)
  })

  it('carries each idea\'s session and deep-link anchor (no date/time)', () => {
    const [first] = latestIdeas(sessions, SPARK_FEED_LIMIT, NOW)
    expect(first).toEqual({
      spark: 'idea three',
      kind: 'idea',
      session: 's3',
      anchor: sessionAnchor('s3'),
    })
  })

  it('drops ideas from sessions older than the recency window', () => {
    const old = session({ session: 'stale', endedAt: '2026-07-01T11:00:00Z', ideas: ['ancient idea'] })
    const ideas = latestIdeas([...sessions, old], SPARK_FEED_LIMIT, NOW)
    expect(ideas.map((i) => i.spark)).not.toContain('ancient idea')
    // A window of SPARK_FEED_DAYS days back from NOW keeps the in-window ideas.
    expect(SPARK_FEED_DAYS).toBe(3)
    expect(ideas.map((i) => i.session)).toEqual(['s3', 's2', 's2', 's1'])
  })

  it('caps the feed at the given limit, keeping the latest and dropping the oldest', () => {
    expect(latestIdeas(sessions, 2, NOW).map((i) => i.spark)).toEqual(['idea three', 'idea two-a'])
  })

  it('defaults to SPARK_FEED_LIMIT (15) ideas', () => {
    expect(SPARK_FEED_LIMIT).toBe(15)
    // Default endedAt is 2026-07-05T11:00:00Z — exactly on NOW's cutoff, so in-window.
    const many = Array.from({ length: 18 }, (_, n) => session({ session: `s${n}`, ideas: [`idea ${n}`] }))
    expect(latestIdeas(many, SPARK_FEED_LIMIT, NOW)).toHaveLength(15)
    // the first 15 in feed order — i.e. the latest, dropping the tail
    expect(latestIdeas(many, SPARK_FEED_LIMIT, NOW).at(-1)!.spark).toBe('idea 14')
  })

  it('is empty when no session in the feed authored an idea', () => {
    expect(latestIdeas([session({ ideas: undefined, learnings: ['x'] })], SPARK_FEED_LIMIT, NOW)).toEqual([])
    expect(latestIdeas([session({ ideas: [], learnings: ['x'] })], SPARK_FEED_LIMIT, NOW)).toEqual([])
    expect(latestIdeas([])).toEqual([])
  })
})

describe('ideaGrillPrompt', () => {
  it('builds a ready-made /grill-with-docs prompt tagged with the session id, then the idea text', () => {
    const now = new Date('2026-07-05T12:00:00Z').getTime()
    const [idea] = latestIdeas([session({ session: 'session_01ABC', ideas: ['Auto-cluster ideas into issues'] })], SPARK_FEED_LIMIT, now)
    expect(ideaGrillPrompt(idea!)).toBe(
      '/grill-with-docs to refine this idea from session session_01ABC:\n\nAuto-cluster ideas into issues',
    )
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
