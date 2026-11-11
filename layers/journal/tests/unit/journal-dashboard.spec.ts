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
  sessionRuleTitles,
  skillUrl,
  countFrictions,
  digestAnchor,
  digestList,
  digestNeighbours,
  frictionsByDay,
  summaryParagraphs,
  countOf,
  ideaGrillPrompt,
  learningDocsPrompt,
  sessionNotes,
  sessionAnchor,
  sessionDurationSec,
  installedSkillCount,
  sessionWhen,
  sessionModelsLabel,
  subagentUsageLabel,
  frictionCount,
  frictionTotals,
  kindCounts,
  ownSkills,
  installedSkills,
  skillUseCounts,
  journalKpiTiles,
  prUrl,
  sessionShortId,
  skillGroups,
  skillRoleParts,
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

describe('sessionDurationSec', () => {
  it('measures the span in seconds', () => {
    expect(sessionDurationSec('2026-07-05T00:00:00Z', '2026-07-05T00:01:30Z')).toBe(90)
    expect(sessionDurationSec('2026-07-05T10:00:00Z', '2026-07-05T11:40:00Z')).toBe(6000)
  })

  it('clamps zero, negative and sub-minute spans to one minute', () => {
    expect(sessionDurationSec('2026-07-05T10:00:00Z', '2026-07-05T10:00:00Z')).toBe(60)
    expect(sessionDurationSec('2026-07-05T11:00:00Z', '2026-07-05T10:00:00Z')).toBe(60)
    expect(sessionDurationSec('2026-07-05T10:00:00Z', '2026-07-05T10:00:10Z')).toBe(60)
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

describe('journalKpiTiles', () => {
  const run = (startedAt: string, costUsd: number) => ({
    session: 's', startedAt, durationSeconds: 1, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0, costUsd,
  })
  const tiles = (over: Partial<Parameters<typeof journalKpiTiles>[0]> = {}) =>
    journalKpiTiles({ space: 'current', sessions: [], skills: [], routines: [], ...over })
  const tile = (key: string, over: Partial<Parameters<typeof journalKpiTiles>[0]> = {}) =>
    tiles(over).find((t) => t.key === key)!
  const stats = (key: string, over: Partial<Parameters<typeof journalKpiTiles>[0]> = {}) =>
    tile(key, over).stats.map((s) => `${s.value} ${s.label}`)

  it('shows five tiles on current, in order, each with its label, CTA and link', () => {
    expect(tiles().map(({ key, label, cta, to }) => ({ key, label, cta, to }))).toEqual([
      { key: 'sessions', label: 'Sessions logged', cta: 'Session logs ↓', to: '#session-log' },
      { key: 'frictions', label: 'Frictions surfaced', cta: 'Worst problems →', to: '/t/journal/current/frictions' },
      { key: 'routines', label: 'Routine spend', cta: 'Cost breakdown →', to: '/t/journal/current/routines' },
      { key: 'ideas', label: 'Suggestions', cta: 'Ideas & learnings →', to: '/t/journal/current/ideas' },
      { key: 'skills', label: 'Skills', cta: 'Roles & usage →', to: '/t/journal/current/skills' },
    ])
    expect(tiles().map((t) => t.value)).toEqual([0, 0, '$0.00', 0, 0])
    for (const t of tiles()) {
      expect(t.gloss).not.toBe('')
      for (const s of t.stats) expect(s.hint).not.toBe('')
    }
  })

  it('shows no tiles on any other Space', () => {
    expect(tiles({ space: 'archived', sessions: [session()] })).toEqual([])
    expect(tiles({ space: 'other' })).toEqual([])
  })

  it('counts sessions, with every kind as a stat, zeros included', () => {
    const sessions = [session({ kind: 'autonomous' }), session(), session()]
    expect(tile('sessions', { sessions }).value).toBe(3)
    expect(stats('sessions', { sessions })).toEqual(['2 interactive', '0 delegated', '1 autonomous'])
  })

  it('counts Frictions, with every severity as a stat, worst first', () => {
    const sessions = [session({ frictions: [friction('blocker'), friction('major'), friction('minor')] }),
      session({ frictions: [friction('major'), friction('nit'), friction('minor')] })]
    expect(tile('frictions', { sessions }).value).toBe(6)
    expect(stats('frictions', { sessions })).toEqual(['1 blk', '2 maj', '0 mod', '2 min', '1 nit'])
    expect(tile('frictions', { sessions }).stats.map((s) => s.severity)).toEqual(['blocker', 'major', 'moderate', 'minor', 'nit'])
    expect(tile('frictions')).toMatchObject({ value: 0, to: '/t/journal/current/frictions' })
  })

  it('sums Routine spend over runs started on or after the oldest session date (UTC)', () => {
    const sessions = [session({ endedAt: '2026-11-08T10:00:00Z' }), session({ endedAt: '2026-10-10T23:00:00Z' })]
    const routines = [
      { name: 'a', runs: [run('2026-10-09T23:59:59Z', 4), run('2026-10-10T00:00:00Z', 5.9716483)] },
      { name: 'b', runs: [run('2026-11-08T04:00:00Z', 1.5)] },
      { name: 'c', runs: [] },
    ]
    expect(tile('routines', { sessions, routines }).value).toBe('$7.47')
    expect(stats('routines', { sessions, routines })).toEqual(['2 runs'])
    expect(tile('routines', { sessions, routines: [{ name: 'a', runs: [run('2026-10-11T00:00:00Z', 150.4)] }] }).value).toBe('$150')
    expect(tile('routines', { routines }).value).toBe('$0.00')
    expect(stats('routines', { routines })).toEqual(['0 runs'])
  })

  it('counts ideas plus learnings as Suggestions, learnings as sessionNotes counts them', () => {
    const sessions = [session({ ideas: ['i1', 'i2'], learnings: ['l1'] }), session({ external: true, learnings: ['l2'] })]
    expect(tile('ideas', { sessions }).value).toBe(3)
    expect(stats('ideas', { sessions })).toEqual(['2 ideas', '1 learning'])
  })

  it('counts every Skill, split into platform and installed, whatever the sessions', () => {
    const skills = [skill(), skill({ name: 'b' }), skill({ name: 'c', category: 'general-engineering' })]
    expect(tile('skills', { skills }).value).toBe(3)
    expect(stats('skills', { skills })).toEqual(['2 platform', '1 installed'])
    expect(stats('skills', { skills: [skill()] })).toEqual(['1 platform', '0 installed'])
    expect(tile('skills', { skills, sessions: [session(), session()] }).value).toBe(3)
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
    skill({ name: 'digest', category: 'platform-operation', importance: 'routine' }),
    skill({ name: 'triage', category: 'platform-operation', importance: 'supporting' }),
    skill({ name: 'tdd', category: 'general-engineering', importance: 'essential' }),
    skill({ name: 'code-review', category: 'general-engineering', importance: 'supporting' }),
  ]

  it('ownSkills keeps only platform-operation Skills', () => {
    expect(ownSkills(skills).map((s) => s.name).sort()).toEqual(['add-space', 'digest', 'edit-content', 'triage'])
  })

  it('installedSkills keeps installed Skills graded above peripheral', () => {
    const withPeripheral = [...skills, skill({ name: 'teach', category: 'general-engineering', importance: 'peripheral' })]
    expect(installedSkills(withPeripheral).map((s) => s.name).sort()).toEqual(['code-review', 'tdd'])
  })

  it('skillUseCounts counts sessions, not mentions', () => {
    const use = (...names: string[]) => names.map((name) => ({ name, reason: '' }))
    const counts = skillUseCounts([
      session({ skillsUsed: use('tdd', 'tdd', 'digest') }),
      session({ skillsUsed: use('tdd') }),
      session({}),
    ])
    expect(counts).toEqual({ tdd: 2, digest: 1 })
  })

  it('installedSkillCount counts the non-own Skills', () => {
    expect(installedSkillCount(skills)).toBe(2)
  })

  it('skillGroups orders essential → routine → specialist → supporting → peripheral, alpha within a group, dropping empties', () => {
    const groups = skillGroups(ownSkills(skills))
    expect(groups.map((g) => g.importance)).toEqual(['essential', 'routine', 'supporting']) // specialist + peripheral empty → dropped
    expect(groups[0]!.skills.map((s) => s.name)).toEqual(['add-space', 'edit-content']) // alpha within essential
    expect(groups[1]!.skills.map((s) => s.name)).toEqual(['digest'])
    expect(groups[2]!.skills.map((s) => s.name)).toEqual(['triage'])
  })

  it('skillRoleParts splits inline code/em/strong, keeping the spaces between them', () => {
    expect(skillRoleParts('invoked *by* `close-session`, **always**')).toEqual([
      { kind: 'text', text: 'invoked ' },
      { kind: 'em', text: 'by' },
      { kind: 'text', text: ' ' },
      { kind: 'code', text: 'close-session' },
      { kind: 'text', text: ', ' },
      { kind: 'strong', text: 'always' },
    ])
    expect(skillRoleParts('see `personas/*.md` and a * b')).toEqual([
      { kind: 'text', text: 'see ' },
      { kind: 'code', text: 'personas/*.md' },
      { kind: 'text', text: ' and a * b' },
    ])
    expect(skillRoleParts('')).toEqual([])
    for (const literal of ['an *unclosed marker', 'a `lone tick', '2*3*4 and a*b*c', '*foo *', '**bar **']) {
      expect(skillRoleParts(literal)).toEqual([{ kind: 'text', text: literal }])
    }
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

describe('skillUrl', () => {
  it("links a repo Skill's SKILL.md on main, and nothing for an unknown name", () => {
    expect(skillUrl('tdd', ['tdd'])).toBe('https://github.com/feffef/terrarium/blob/main/.agents/skills/tdd/SKILL.md')
    expect(skillUrl('simplify', ['tdd'])).toBeUndefined()
  })
})

describe('subagentUsageLabel', () => {
  it('shows a whole-percent share and minutes and seconds', () => {
    expect(subagentUsageLabel({ tokenShare: 41.6, durationSec: 192 })).toBe('42% · 3m 12s')
    expect(subagentUsageLabel({ tokenShare: 0.8, durationSec: 45 })).toBe('<1% · 45s')
  })
  it('leaves out a value an older log lacks', () => {
    expect(subagentUsageLabel({ durationSec: 60 })).toBe('1m 0s')
    expect(subagentUsageLabel({ tokenShare: 10 })).toBe('10%')
    expect(subagentUsageLabel({})).toBe('')
  })
})

describe('sessionCardViews', () => {
  it('flags an in-review log whose every PR a completed log lists', () => {
    const open = session({ session: 'a', status: 'in-review', prs: ['#1', '#2'] })
    const done = session({ session: 'b', status: 'completed', prs: ['1', '#2'] })
    const half = session({ session: 'c', status: 'in-review', prs: ['#2', '#9'] })
    const none = session({ session: 'd', status: 'in-review', prs: [] })
    expect(sessionCardViews([open, done, half, none]).map((c) => c.staleInReview)).toEqual([true, false, false, false])
  })

  it('lists frictions most severe first, ties in original order, without mutating the log', () => {
    const f = (severity: Severity, description: string) => ({ ...friction(severity), description })
    const frictions = [f('nit', 'a'), f('major', 'b'), f('blocker', 'c'), f('major', 'd'), f('minor', 'e'), f('moderate', 'f')]
    const [c] = sessionCardViews([session({ frictions })])
    expect(c!.frictions.map((x) => x.description)).toEqual(['c', 'b', 'd', 'f', 'e', 'a'])
    expect(frictions.map((x) => x.description)).toEqual(['a', 'b', 'c', 'd', 'e', 'f'])
  })

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
    expect(c!.url).toBe('https://claude.ai/code/session_0123456789abcdefXYZW')
    expect(c!.when).toBe('Jul 5 · 11:30 UTC')
    expect(c!.duration).toBe('1h 30m')
    expect(c!.frictionCounts).toEqual({ nit: 1, minor: 0, moderate: 0, major: 0, blocker: 1 })
    expect(c!.frictionTotal).toBe(2)
    expect(c!.skillsUsed).toEqual([{ name: 'tdd', reason: 'r' }])
    expect(c!.prs).toEqual(['#7'])
    expect(c!.goal).toBe('goal')
    expect(c!.docsRead).toEqual([{ path: 'CLAUDE.md', reason: 'r', viaSubagent: false, unknown: false }])
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
    expect(c!.subagents).toEqual([{ type: 'general-purpose', task: 'survey', model: 'sonnet', usage: '' }])
    expect(c!.filesEdited).toEqual(['a.ts', 'b.vue'])
    expect(c!.tools).toEqual([{ name: 'Bash', count: 9 }, { name: 'Read', count: 2 }])
  })

  it('lists triggered rules, marking the ones whose ADR was read after', () => {
    const s = session({
      rulesLoaded: ['.claude/rules/adr-0004.md', '.claude/rules/adr-0008.md'],
      rulesFollowedUp: ['.claude/rules/adr-0008.md'],
    })
    const [c] = sessionCardViews([s])
    expect(c!.rules).toEqual([
      { path: '.claude/rules/adr-0004.md', alwaysLoaded: false, followedUp: false, viaSubagent: false, unknown: true },
      { path: '.claude/rules/adr-0008.md', alwaysLoaded: false, followedUp: true, viaSubagent: false, unknown: true },
    ])
  })

  it("attaches the agent's verdict to the rule it names", () => {
    const s = session({
      rulesLoaded: ['.claude/rules/adr-0004.md'],
      ruleVerdicts: [{ path: '.claude/rules/adr-0004.md', reason: 'merge rules', useful: 'partly' }],
    })
    const [c] = sessionCardViews([s])
    expect(c!.rules).toEqual([{ path: '.claude/rules/adr-0004.md', alwaysLoaded: false, followedUp: false, viaSubagent: false, unknown: false, reason: 'merge rules', useful: 'partly' }])
  })

  it('names each rule by its heading, falling back to the path, and keeps the reason as written', () => {
    const titles = sessionRuleTitles({
      '../../.claude/rules/adr-0022.md': '---\npaths: []\n---\n\n# ADR-0022: Autonomous triage sweep\n\nBody.',
      '../../.claude/rules/untitled.md': 'No heading.',
    })
    expect(titles).toEqual({ '.claude/rules/adr-0022.md': 'ADR-0022: Autonomous triage sweep' })
    const s = session({
      rulesGlobal: ['.claude/rules/adr-0022.md', '.claude/rules/gone.md'],
      ruleVerdicts: [{ path: '.claude/rules/adr-0022.md', reason: 'loaded; not related to a blog post', useful: 'no' }],
    })
    const [c] = sessionCardViews([s], titles)
    expect(c!.rules.map((r) => [r.title, r.reason])).toEqual([
      ['ADR-0022: Autonomous triage sweep', 'loaded; not related to a blog post'],
      [undefined, undefined],
    ])
  })

  it('lists always-loaded rules first, marked so', () => {
    const [c] = sessionCardViews([session({ rulesGlobal: ['.claude/rules/adr-0003.md'], rulesLoaded: ['.claude/rules/adr-0004.md'] })])
    expect(c!.rules.map((r) => [r.path, r.alwaysLoaded])).toEqual([
      ['.claude/rules/adr-0003.md', true],
      ['.claude/rules/adr-0004.md', false],
    ])
  })

  // Issue #1941: one list each for rules and docs; a subagent-only entry is tagged,
  // and with no verdict it is unknown, never a guessed yes/partly/no.
  it('lists rules only a subagent loaded in the one rules list, tagged, with their verdict or as unknown', () => {
    const s = session({
      rulesLoaded: ['.claude/rules/adr-0004.md'],
      rulesLoadedBySubagents: ['.claude/rules/adr-0012.md', '.claude/rules/adr-0021.md'],
      rulesFollowedUp: ['.claude/rules/adr-0012.md'],
      ruleVerdicts: [{ path: '.claude/rules/adr-0012.md', reason: 'Triage #12 reported: named the pingback rule', useful: 'yes' }],
    })
    const [c] = sessionCardViews([s], { '.claude/rules/adr-0012.md': 'ADR-0012: Pingbacks' })
    expect(c!.rules).toEqual([
      { path: '.claude/rules/adr-0004.md', alwaysLoaded: false, followedUp: false, viaSubagent: false, unknown: true, reason: undefined, useful: undefined },
      { path: '.claude/rules/adr-0012.md', title: 'ADR-0012: Pingbacks', alwaysLoaded: false, followedUp: true, viaSubagent: true, unknown: false, reason: 'Triage #12 reported: named the pingback rule', useful: 'yes' },
      { path: '.claude/rules/adr-0021.md', alwaysLoaded: false, followedUp: false, viaSubagent: true, unknown: true, reason: undefined, useful: undefined },
    ])
  })

  // Issue #3020: a `ruleUse` log groups its rules by Main session and Subagents.
  describe('ruleUse logs', () => {
    const load = (rule: string, via: 'start' | 'native' | 'hint' = 'native', trigger?: string) =>
      ({ rule: `.claude/rules/${rule}`, via, ...(trigger && { trigger }) })
    const view = (over: Partial<SessionDoc>) => sessionCardViews([session(over)], { '.claude/rules/adr-0003.md': 'ADR-0003: T' })[0]!

    it('lists main rules start-first with its values, and leaves the old flat list empty', () => {
      const c = view({
        ruleUse: [{ by: 'main', answered: true, loads: [load('adr-0004.md', 'hint'), load('adr-0003.md', 'start')], reported: [{ path: '.claude/rules/adr-0004.md', value: 'steered', why: 'ran the gate' }] }],
      })
      expect(c.rules).toEqual([])
      expect(c.ruleUse!.main).toEqual({
        answered: true,
        rules: [
          { path: '.claude/rules/adr-0003.md', title: 'ADR-0003: T', alwaysLoaded: true, followedUp: false, hover: '.claude/rules/adr-0003.md\nloaded at start', value: undefined, whys: [] },
          { path: '.claude/rules/adr-0004.md', title: undefined, alwaysLoaded: false, followedUp: false, hover: '.claude/rules/adr-0004.md\nloaded by a hint hook', value: 'steered', whys: ['ran the gate'] },
        ],
      })
    })

    it('tallies subagents per rule, with shares over the answering ones that loaded it', () => {
      const c = view({
        subagents: [{ type: 'Explore', task: 'scan' }, { type: 'Explore', task: 'check' }, { type: 'Explore', task: 'late' }],
        ruleUse: [
          { by: 'Explore', subagent: 0, answered: true, loads: [load('adr-0004.md', 'native', 'a.ts')], reported: [{ path: '.claude/rules/adr-0004.md', value: 'backed', why: 'x' }] },
          { by: 'Explore', subagent: 1, answered: true, loads: [load('adr-0004.md', 'native', 'a.ts')], reported: [] },
          { by: 'Explore', subagent: 2, answered: false, loads: [load('adr-0004.md', 'hint')], reported: [] },
        ],
      })
      expect(c.ruleUse!.main).toEqual({ answered: null, rules: [] })
      expect(c.ruleUse!.subagents).toEqual({
        total: 3,
        unanswered: 1,
        rules: [{
          path: '.claude/rules/adr-0004.md',
          title: undefined,
          alwaysLoaded: false,
          hover: '.claude/rules/adr-0004.md\nnative 2 · hint 1\ntriggered by a.ts ×2',
          loadedBy: 3,
          values: [{ value: 'backed', n: 1, percent: 50, hover: "1 of 2 answering subagents that loaded it named it backed; 1 didn't name it" }],
          whys: ['scan: x'],
        }],
      })
    })

    it('shows the session-wide always-loaded rules under main on a log with no start loads', () => {
      const c = view({ rulesGlobal: ['.claude/rules/adr-0003.md'], ruleUse: [{ by: 'main', answered: true, loads: [load('adr-0004.md')], reported: [] }] })
      expect(c.ruleUse!.main.rules.map((r) => [r.path, r.alwaysLoaded])).toEqual([['.claude/rules/adr-0003.md', true], ['.claude/rules/adr-0004.md', false]])
    })

    it('keeps a row for a rule an agent named but never loaded', () => {
      const why = '(no load recorded)'
      const c = view({
        subagents: [{ type: 'Explore', task: 'scan' }],
        ruleUse: [
          { by: 'main', answered: true, loads: [], reported: [{ path: '.claude/rules/adr-0012.md', value: 'steered', why }] },
          { by: 'Explore', subagent: 0, answered: true, loads: [], reported: [{ path: '.claude/rules/adr-0012.md', value: 'backed', why }] },
        ],
      })
      expect(c.ruleUse!.main.rules.map((r) => [r.path, r.value, r.hover])).toEqual([['.claude/rules/adr-0012.md', 'steered', '.claude/rules/adr-0012.md\nno load recorded']])
      expect(c.ruleUse!.subagents.rules.map((r) => [r.path, r.loadedBy, r.values.map((v) => v.percent), r.whys])).toEqual([['.claude/rules/adr-0012.md', 0, [100], [`scan: ${why}`]]])
    })

    it('says who reported a doc instead of "no verdict"', () => {
      const c = view({
        docsRead: [{ path: 'docs/a.md', reason: 'r' }],
        docsReadBySubagents: ['docs/a.md'],
        subagents: [{ type: 'Explore', task: 'scan' }],
        ruleUse: [
          { by: 'main', answered: true, loads: [], reported: [{ path: 'docs/a.md' }] },
          { by: 'Explore', subagent: 0, answered: true, loads: [], reported: [{ path: 'docs/a.md', why: '(no load recorded)' }] },
        ],
      })
      expect(c.docsRead).toEqual([{ path: 'docs/a.md', reason: 'r', viaSubagent: true, unknown: false, reportedBy: 'reported by main and 1 subagent', whys: ['scan: (no load recorded)'] }])
    })
  })

  // Issue #2607: a main-session or always-loaded rule left without a verdict is
  // unknown too, so the gap shows on the card.
  it('marks every loaded rule with no verdict as unknown, main-session ones included', () => {
    const s = session({
      rulesGlobal: ['.claude/rules/adr-0003.md'],
      rulesLoaded: ['.claude/rules/adr-0010.md', '.claude/rules/adr-0022.md'],
      ruleVerdicts: [{ path: '.claude/rules/adr-0022.md', reason: 'r', useful: 'no' }],
    })
    const [c] = sessionCardViews([s])
    expect(c!.rules.map((r) => [r.path, r.unknown])).toEqual([
      ['.claude/rules/adr-0003.md', true],
      ['.claude/rules/adr-0010.md', true],
      ['.claude/rules/adr-0022.md', false],
    ])
  })

  it('tags a doc only a subagent read, unknown until it has a verdict; a main-session doc is never unknown', () => {
    const s = session({
      docsRead: [
        { path: 'GLOSSARY.md', reason: '(no reason given)' },
        { path: 'docs/agents/x.md', reason: 'Triage #12 reported: r', useful: 'no' },
        { path: 'docs/agents/y.md', reason: '(no reason given)' },
      ],
      docsReadBySubagents: ['docs/agents/x.md', 'docs/agents/y.md'],
    })
    const [c] = sessionCardViews([s])
    expect(c!.docsRead.map((d) => [d.path, d.viaSubagent, d.unknown])).toEqual([
      ['GLOSSARY.md', false, false],
      ['docs/agents/x.md', true, false],
      ['docs/agents/y.md', true, true],
    ])
  })

  it('defaults the trace fields for an older, authored-only log', () => {
    const [c] = sessionCardViews([session({ docsRead: [{ path: 'GLOSSARY.md', reason: 'r' }] })])
    expect(c!.model).toBe('')
    expect(c!.subagents).toEqual([])
    expect(c!.filesEdited).toEqual([])
    expect(c!.rules).toEqual([])
    expect(c!.docsRead).toEqual([{ path: 'GLOSSARY.md', reason: 'r', viaSubagent: false, unknown: false }])
    expect(c!.tools).toEqual([])
  })

  it('surfaces authored learnings/ideas, and defaults them to [] when absent', () => {
    const [with_] = sessionCardViews([session({ learnings: ['a thing'], ideas: ['an idea'] })])
    expect(with_!.learnings).toEqual(['a thing'])
    expect(with_!.ideas).toEqual(['an idea'])
    const [without] = sessionCardViews([session()])
    expect(without!.learnings).toEqual([])
    expect(without!.ideas).toEqual([])
  })

  it('normalizes `external` to a boolean, defaulting to false when absent (ADR-0009)', () => {
    const [marked] = sessionCardViews([session({ external: true })])
    expect(marked!.external).toBe(true)
    expect(marked!.url).toBeNull()
    const [unmarked] = sessionCardViews([session()])
    expect(unmarked!.external).toBe(false)
    const [explicitFalse] = sessionCardViews([session({ external: false })])
    expect(explicitFalse!.external).toBe(false)
  })

  it('links only a session_ id: a local CLI session logs a bare UUID that claude.ai cannot open', () => {
    const [local] = sessionCardViews([session({ session: 'a1af4e46-8293-4f33-bf41-c956bd7f6306' })])
    expect(local!.url).toBeNull()
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

describe('sessionNotes', () => {
  // Passed newest-first, matching the SFCs' `.order('endedAt', 'DESC')` query —
  // sessionNotes keeps that order rather than re-sorting.
  const sessions = [
    session({ session: 's3', ideas: ['idea three'], learnings: ['a learning'] }),
    session({ session: 's2', ideas: ['idea two-a', 'idea two-b'], learnings: [] }),
    session({ session: 's1', ideas: ['idea one'], learnings: ['another learning'] }),
  ]

  it('flattens ideas and learnings separately, preserving newest-first order', () => {
    const { ideas, learnings } = sessionNotes(sessions)
    expect(ideas.map((i) => i.note)).toEqual(['idea three', 'idea two-a', 'idea two-b', 'idea one'])
    expect(ideas.every((i) => i.kind === 'idea')).toBe(true)
    expect(learnings.map((i) => i.note)).toEqual(['a learning', 'another learning'])
    expect(learnings.every((i) => i.kind === 'learning')).toBe(true)
  })

  it('carries each note\'s session and deep-link anchor', () => {
    expect(sessionNotes(sessions).ideas[0]).toEqual({
      note: 'idea three',
      kind: 'idea',
      session: 's3',
      date: '2026-07-05',
      anchor: sessionAnchor('s3'),
    })
  })

  it('keeps an external session\'s ideas but drops its learnings (ADR-0009)', () => {
    const ext = session({ session: 'ext', external: true, ideas: ['outside idea'], learnings: ['outside learning'] })
    const { ideas, learnings } = sessionNotes([ext, ...sessions])
    expect(ideas.map((i) => i.note)).toContain('outside idea')
    expect(learnings.map((i) => i.note)).not.toContain('outside learning')
  })

  it('is empty when no session authored a note', () => {
    expect(sessionNotes([session({ ideas: undefined, learnings: undefined })])).toEqual({ ideas: [], learnings: [] })
    expect(sessionNotes([])).toEqual({ ideas: [], learnings: [] })
  })
})

describe('ideaGrillPrompt', () => {
  it('builds a ready-made /grill-with-docs prompt tagged with the session id, then the idea text', () => {
    const [idea] = sessionNotes([session({ session: 'session_01ABC', ideas: ['Auto-cluster ideas into issues'] })]).ideas
    expect(ideaGrillPrompt(idea!)).toBe(
      '/grill-with-docs to refine this idea from session session_01ABC:\n\nAuto-cluster ideas into issues',
    )
  })
})

describe('learningDocsPrompt', () => {
  it('tags the prompt with the session id and learning, and asks for a proposal before any edit', () => {
    const [learning] = sessionNotes([session({ session: 'session_01ABC', learnings: ['Layer aliases resolve to the main app'] })]).learnings
    const prompt = learningDocsPrompt(learning!)
    expect(prompt).toContain('Session session_01ABC logged this learning:\n\nLayer aliases resolve to the main app')
    expect(prompt).toContain('*-session_01ABC.yml')
    expect(prompt).toContain('wait for my go-ahead')
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

describe('digestNeighbours', () => {
  const days = ['2026-07-06', '2026-07-04', '2026-07-05']
  it('finds the older and newer day regardless of input order', () => {
    expect(digestNeighbours(days, '2026-07-05')).toEqual({ older: '2026-07-04', newer: '2026-07-06' })
  })
  it('has no neighbour past either end, nor for an unknown day', () => {
    expect(digestNeighbours(days, '2026-07-04').older).toBeNull()
    expect(digestNeighbours(days, '2026-07-06').newer).toBeNull()
    expect(digestNeighbours(days, '1999-01-01')).toEqual({ older: null, newer: null })
  })
})

describe('countOf', () => {
  it('pluralises except for exactly one', () => {
    expect(countOf(0, 'session')).toBe('0 sessions')
    expect(countOf(1, 'session')).toBe('1 session')
    expect(countOf(2, 'session')).toBe('2 sessions')
  })
})

describe('summaryParagraphs', () => {
  it('keeps a short summary as one paragraph', () => {
    expect(summaryParagraphs('One. Two.')).toEqual(['One. Two.'])
  })
  it('splits on line breaks and packs long runs of sentences into several paragraphs', () => {
    const long = Array.from({ length: 12 }, (_, i) => `Sentence number ${i} says something fairly long here.`).join(' ')
    const parts = summaryParagraphs(`First block.\n\n${long}`)
    expect(parts[0]).toBe('First block.')
    expect(parts.length).toBeGreaterThan(2)
    expect(parts.slice(1).join(' ')).toBe(long)
  })
})

describe('frictionsByDay', () => {
  it('groups by UTC day, oldest first, and averages per session', () => {
    const days = frictionsByDay([
      session({ session: 'a', endedAt: '2026-07-06T10:00:00Z', frictions: [friction('nit'), friction('minor'), friction('major')] }),
      session({ session: 'b', endedAt: '2026-07-06T11:00:00Z', frictions: [] }),
      session({ session: 'c', endedAt: '2026-07-05T10:00:00Z', frictions: [friction('nit')] }),
    ])
    expect(days).toEqual([
      { date: '2026-07-05', sessions: 1, frictions: 1, perSession: 1 },
      { date: '2026-07-06', sessions: 2, frictions: 3, perSession: 1.5 },
    ])
  })
  it('is empty with no sessions and reports 0 for a clean day', () => {
    expect(frictionsByDay([])).toEqual([])
    expect(frictionsByDay([session({ session: 'z', endedAt: '2026-07-01T10:00:00Z', frictions: [] })])).toMatchObject([{ perSession: 0 }])
  })
  it('keeps only the newest days', () => {
    const many = [1, 2, 3].map((d) => session({ session: `s${d}`, endedAt: `2026-07-0${d}T10:00:00Z` }))
    expect(frictionsByDay(many, 2).map((d) => d.date)).toEqual(['2026-07-02', '2026-07-03'])
  })
})
