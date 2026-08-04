// Unit tests for the audit-skills helper's pure core (ADR-0015) — window
// selection, usage tallying, and the three-source join where correctness bugs
// would hide. The FS IO is a thin shell over these and is exercised by running
// the Skill.
import { describe, expect, it } from 'vitest'
import {
  bracketSessions,
  buildRegressionChecks,
  buildSkillRows,
  buildSkillSessionFileTotals,
  buildSkillSessionFiles,
  filterSkillsUsed,
  findHumanPromptedClosures,
  findManuallyRescuedClosures,
  findMisclassifiedKind,
  findOrphanedSessions,
  groupSessionReferences,
  hasHumanPromptedClosure,
  HUMAN_PROMPTED_CLOSURE,
  isSessionLogPath,
  parseCommitFileChanges,
  parseMergedPullRequests,
  parseSessionTrailers,
  parseSkillEditLog,
  pullRequestSessionRef,
  pickWindow,
  REC,
  RESCUED_GAP_HOURS,
  resolvedMisfilePath,
  SEP,
  tallyUsage,
  toSessionFile,
  type CommitFileChange,
  type InventoryEntry,
  type RawPullRequestApiRecord,
  type OnDiskSkill,
  type SessionFile,
  type SessionTrailerRef,
  type SkillEdit,
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
    frictions: [],
    humanPromptedClosure: false,
    entrypoint: '',
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

describe('filterSkillsUsed() — issue #545', () => {
  const validNames = new Set(['tdd', 'close-session'])

  it('drops a skillsUsed entry naming something that is not a real Skill (e.g. "model")', () => {
    const used = [{ name: 'model', reason: 'used the model' }]
    expect(filterSkillsUsed(used, validNames)).toEqual([])
  })

  it('keeps a skillsUsed entry naming a real Skill', () => {
    const used = [{ name: 'tdd', reason: 'red-green-refactor' }]
    expect(filterSkillsUsed(used, validNames)).toEqual([{ name: 'tdd', reason: 'red-green-refactor' }])
  })

  it('filters a mixed list down to only the real Skills, preserving order', () => {
    const used = [
      { name: 'tdd', reason: 'r1' },
      { name: 'model', reason: 'r2' },
      { name: 'close-session', reason: 'r3' },
    ]
    expect(filterSkillsUsed(used, validNames)).toEqual([
      { name: 'tdd', reason: 'r1' },
      { name: 'close-session', reason: 'r3' },
    ])
  })

  it('drops everything against an empty valid-names set', () => {
    expect(filterSkillsUsed([{ name: 'tdd', reason: 'r' }], new Set())).toEqual([])
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
    [
      'blog-post',
      {
        category: 'platform-operation',
        importance: 'specialist',
        role: 'blogs',
        observations: [{ date: '2026-07-05', note: 'promoted from supporting per usedIn' }],
      },
    ],
    ['retired', { category: 'general-engineering', importance: 'peripheral', role: 'gone from disk', observations: [] }],
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

  it('threads prior observations through, defaulting to [] when uninventoried', () => {
    expect(row('blog-post').observations).toEqual([
      { date: '2026-07-05', note: 'promoted from supporting per usedIn' },
    ])
    expect(row('ghost').observations).toEqual([])
  })

  it('flags an inventoried Skill gone from disk (stale entry)', () => {
    expect(row('retired')).toMatchObject({ onDisk: false, inventoried: true, description: null })
  })
})

describe('toSessionFile() — external exclusion (ADR-0009 amendment)', () => {
  const skillNames = new Set(['tdd'])

  it('reduces an internal log to a SessionFile, keeping its skills/frictions', () => {
    const raw = {
      session: 'session_internal',
      kind: 'interactive',
      goal: 'do a thing',
      summary: '  a   summary ',
      endedAt: '2026-07-20T00:00:00Z',
      skillsUsed: [{ name: 'tdd', reason: 'red-green' }],
      frictions: [{ severity: 'minor', description: 'x' }],
      entrypoint: 'remote',
    }
    expect(toSessionFile(raw, 'f.yml', skillNames)).toEqual({
      session: {
        session: 'session_internal',
        kind: 'interactive',
        goal: 'do a thing',
        summary: 'a summary',
        endedAt: '2026-07-20T00:00:00Z',
        skillsUsed: [{ name: 'tdd', reason: 'red-green' }],
        frictions: ['minor'],
        humanPromptedClosure: false,
        entrypoint: 'remote',
      },
      file: 'f.yml',
    })
  })

  it('returns null for an external log — excluded from the mining corpus entirely', () => {
    const raw = {
      session: 'session_external',
      kind: 'delegated',
      goal: 'external contribution',
      endedAt: '2026-07-20T00:00:00Z',
      external: true,
      skillsUsed: [{ name: 'tdd', reason: 'r' }],
      frictions: [{ severity: 'major', description: 'toolchain friction' }],
    }
    expect(toSessionFile(raw, 'f.yml', skillNames)).toBeNull()
  })

  it('treats external:false as internal (not excluded)', () => {
    const raw = { session: 's', endedAt: '2026-07-20T00:00:00Z', external: false, skillsUsed: [], frictions: [] }
    expect(toSessionFile(raw, 'f.yml', skillNames)).not.toBeNull()
  })
})

describe('bracketSessions()', () => {
  const sessions = [
    sess({ session: 'a', endedAt: '2026-07-01T00:00:00Z' }),
    sess({ session: 'b', endedAt: '2026-07-02T00:00:00Z' }),
    sess({ session: 'c', endedAt: '2026-07-03T00:00:00Z' }),
    sess({ session: 'd', endedAt: '2026-07-04T00:00:00Z' }),
    sess({ session: 'e', endedAt: '2026-07-05T00:00:00Z' }),
  ]

  it('splits strictly-before vs at-or-after the edit date', () => {
    const { before, after } = bracketSessions(sessions, '2026-07-03T00:00:00Z', 10)
    expect(before.map((s) => s.session)).toEqual(['a', 'b'])
    expect(after.map((s) => s.session)).toEqual(['c', 'd', 'e'])
  })

  it('keeps only the n nearest sessions on each side', () => {
    const { before, after } = bracketSessions(sessions, '2026-07-03T00:00:00Z', 1)
    expect(before.map((s) => s.session)).toEqual(['b'])
    expect(after.map((s) => s.session)).toEqual(['c'])
  })

  it('returns empty brackets when the edit date falls outside all session dates', () => {
    const { before, after } = bracketSessions(sessions, '2020-01-01T00:00:00Z', 10)
    expect(before).toEqual([])
    expect(after.map((s) => s.session)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('buildRegressionChecks()', () => {
  const sessions = [
    sess({ session: 'a', endedAt: '2026-07-01T00:00:00Z' }),
    sess({ session: 'b', endedAt: '2026-07-05T00:00:00Z' }),
  ]

  it('skips external (pack) Skills even if edits are known', () => {
    const edits = new Map<string, SkillEdit[]>([
      ['pack-skill', [{ sha: 's1', date: '2026-07-03T00:00:00Z', subject: 'edit' }]],
    ])
    expect(buildRegressionChecks(sessions, edits, new Set(['pack-skill']))).toEqual({ checks: [], sessions: [] })
  })

  it('skips a Skill absent from the edits map entirely', () => {
    expect(buildRegressionChecks(sessions, new Map(), new Set())).toEqual({ checks: [], sessions: [] })
  })

  it('skips an edit with no session data on either side (empty session history)', () => {
    const edits = new Map<string, SkillEdit[]>([
      ['our-skill', [{ sha: 's1', date: '2026-07-03T00:00:00Z', subject: 'edit' }]],
    ])
    expect(buildRegressionChecks([], edits, new Set())).toEqual({ checks: [], sessions: [] })
  })

  it('brackets an own Skill edit that falls within the session history, referencing sessions by id', () => {
    const edits = new Map<string, SkillEdit[]>([
      ['our-skill', [{ sha: 's1', date: '2026-07-03T00:00:00Z', subject: 'edit' }]],
    ])
    const { checks, sessions: pool } = buildRegressionChecks(sessions, edits, new Set())
    expect(checks).toHaveLength(1)
    expect(checks[0]).toMatchObject({ skill: 'our-skill', edit: { sha: 's1' }, before: ['a'], after: ['b'] })
    expect(pool.map((s) => s.session)).toEqual(['a', 'b'])
  })

  it('caps at the n most recent edits per Skill', () => {
    const edits = new Map<string, SkillEdit[]>([
      [
        'our-skill',
        [
          { sha: 's1', date: '2026-07-02T00:00:00Z', subject: 'first' },
          { sha: 's2', date: '2026-07-03T00:00:00Z', subject: 'second' },
          { sha: 's3', date: '2026-07-04T00:00:00Z', subject: 'third' },
        ],
      ],
    ])
    const { checks } = buildRegressionChecks(sessions, edits, new Set(), 10, 2)
    expect(checks.map((c) => c.edit.sha)).toEqual(['s3', 's2'])
  })

  it('dedupes a session referenced by more than one Skill\'s bracket into one pool entry', () => {
    const edits = new Map<string, SkillEdit[]>([
      ['skill-one', [{ sha: 's1', date: '2026-07-03T00:00:00Z', subject: 'edit' }]],
      ['skill-two', [{ sha: 's2', date: '2026-07-04T00:00:00Z', subject: 'edit' }]],
    ])
    const { checks, sessions: pool } = buildRegressionChecks(sessions, edits, new Set())
    expect(checks).toHaveLength(2)
    // session 'b' brackets both edits (after s1, before s2) but appears once in the pool
    expect(pool.filter((s) => s.session === 'b')).toHaveLength(1)
  })
})

describe('buildSkillSessionFiles()', () => {
  function entry(file: string, over: Partial<WindowSession> = {}): SessionFile {
    return { session: sess(over), file }
  }

  it('groups every session file by the Skills it used', () => {
    const files = [
      entry('a.yml', { session: 'a', skillsUsed: [{ name: 'tdd', reason: 'r' }] }),
      entry('b.yml', { session: 'b', skillsUsed: [{ name: 'tdd', reason: 'r' }] }),
      entry('c.yml', { session: 'c', skillsUsed: [{ name: 'digest', reason: 'r' }] }),
    ]
    expect(buildSkillSessionFiles(files)).toEqual({
      tdd: ['a.yml', 'b.yml'],
      digest: ['c.yml'],
    })
  })

  it('de-dupes a Skill listed twice within the same session file', () => {
    const files = [
      entry('a.yml', {
        skillsUsed: [
          { name: 'tdd', reason: 'red' },
          { name: 'tdd', reason: 'green' },
        ],
      }),
    ]
    expect(buildSkillSessionFiles(files)).toEqual({ tdd: ['a.yml'] })
  })

  it('is not bounded by any window — includes every entry passed in', () => {
    const files = Array.from({ length: 5 }, (_, i) =>
      entry(`s${i}.yml`, { session: `s${i}`, skillsUsed: [{ name: 'audit-skills', reason: 'r' }] }),
    )
    expect(buildSkillSessionFiles(files)['audit-skills']).toHaveLength(5)
  })

  it('caps a very-high-usage Skill at maxFiles, keeping the newest first (issue #426)', () => {
    const files = Array.from({ length: 6 }, (_, i) =>
      entry(`s${i}.yml`, {
        session: `s${i}`,
        endedAt: `2026-07-0${i + 1}T00:00:00Z`,
        skillsUsed: [{ name: 'close-session', reason: 'r' }],
      }),
    )
    expect(buildSkillSessionFiles(files, 3)['close-session']).toEqual(['s5.yml', 's4.yml', 's3.yml'])
  })

  it('does not cap a Skill below the threshold', () => {
    const files = [
      entry('a.yml', { session: 'a', endedAt: '2026-07-01T00:00:00Z', skillsUsed: [{ name: 'tdd', reason: 'r' }] }),
      entry('b.yml', { session: 'b', endedAt: '2026-07-02T00:00:00Z', skillsUsed: [{ name: 'tdd', reason: 'r' }] }),
    ]
    expect(buildSkillSessionFiles(files, 3)['tdd']).toEqual(['b.yml', 'a.yml'])
  })
})

describe('buildSkillSessionFileTotals()', () => {
  function entry(file: string, over: Partial<WindowSession> = {}): SessionFile {
    return { session: sess(over), file }
  }

  it('counts every hit, uncapped, unlike buildSkillSessionFiles', () => {
    const files = Array.from({ length: 6 }, (_, i) =>
      entry(`s${i}.yml`, { session: `s${i}`, skillsUsed: [{ name: 'close-session', reason: 'r' }] }),
    )
    expect(buildSkillSessionFileTotals(files)).toEqual({ 'close-session': 6 })
    expect(buildSkillSessionFiles(files, 3)['close-session']).toHaveLength(3)
  })

  it('de-dupes a Skill listed twice within the same session file', () => {
    const files = [
      entry('a.yml', {
        skillsUsed: [
          { name: 'tdd', reason: 'red' },
          { name: 'tdd', reason: 'green' },
        ],
      }),
    ]
    expect(buildSkillSessionFileTotals(files)).toEqual({ tdd: 1 })
  })
})

describe('parseSkillEditLog()', () => {
  // Mirrors `git log --name-only --pretty=format:REC%H SEP %P SEP %aI SEP %s`.
  function commitBlock(sha: string, parents: string, date: string, subject: string, paths: string[]): string {
    return `${REC}${sha}${SEP}${parents}${SEP}${date}${SEP}${subject}\n${paths.join('\n')}`
  }

  it('attributes a normal (single-parent) commit to every Skill it touches', () => {
    const raw = commitBlock('c1', 'p1', '2026-07-01T00:00:00Z', 'fix tdd', [
      '.agents/skills/tdd/SKILL.md',
      '.agents/skills/tdd/reference.md',
    ])
    const edits = parseSkillEditLog(raw)
    expect(edits.get('tdd')).toEqual([{ sha: 'c1', date: '2026-07-01T00:00:00Z', subject: 'fix tdd' }])
  })

  it('skips a parentless commit — shallow-clone horizon or true repo root', () => {
    const raw = commitBlock('boundary', '', '2026-07-01T00:00:00Z', 'grafted boundary', [
      '.agents/skills/close-session/SKILL.md',
      '.agents/skills/log-session/SKILL.md',
    ])
    expect(parseSkillEditLog(raw).size).toBe(0)
  })

  it('attributes a merge commit (more than one parent) exactly as before', () => {
    const raw = commitBlock('m1', 'p1 p2', '2026-07-02T00:00:00Z', 'merge fix', [
      '.agents/skills/digest/SKILL.md',
    ])
    expect(parseSkillEditLog(raw).get('digest')).toEqual([
      { sha: 'm1', date: '2026-07-02T00:00:00Z', subject: 'merge fix' },
    ])
  })

  it('drops only the parentless block, keeping real edits from other commits', () => {
    const raw = [
      commitBlock('boundary', '', '2026-07-01T00:00:00Z', 'grafted boundary', [
        '.agents/skills/close-session/SKILL.md',
      ]),
      commitBlock('c2', 'p1', '2026-07-03T00:00:00Z', 'real edit', [
        '.agents/skills/close-session/SKILL.md',
      ]),
    ].join('\n')
    expect(parseSkillEditLog(raw).get('close-session')).toEqual([
      { sha: 'c2', date: '2026-07-03T00:00:00Z', subject: 'real edit' },
    ])
  })
})

describe('parseSessionTrailers()', () => {
  // Mirrors `git log --pretty=format:REC%H SEP %aI %n %B`.
  function trailerBlock(sha: string, date: string, body: string[]): string {
    return `${REC}${sha}${SEP}${date}\n${body.join('\n')}`
  }

  it('extracts the session id from a Claude-Session trailer', () => {
    const raw = trailerBlock('c1', '2026-07-12T06:22:00Z', [
      'docs: audit-docs sweep',
      '',
      'Co-Authored-By: Claude <noreply@anthropic.com>',
      'Claude-Session: https://claude.ai/code/session_016r52n8F8uE8KAA45grM5Qo',
    ])
    expect(parseSessionTrailers(raw)).toEqual([
      { sha: 'c1', date: '2026-07-12T06:22:00Z', session: 'session_016r52n8F8uE8KAA45grM5Qo' },
    ])
  })

  it('skips a commit with no Claude-Session trailer', () => {
    const raw = trailerBlock('c1', '2026-07-12T06:22:00Z', ['chore: bump deps'])
    expect(parseSessionTrailers(raw)).toEqual([])
  })

  it('extracts a legacy bare-UUID session id, not just the current session_<id> shape', () => {
    const raw = trailerBlock('c1', '2026-07-05T00:00:00Z', [
      'journal: early session log',
      '',
      'Claude-Session: https://claude.ai/code/576a49a2-1f18-4be4-8cf7-68173ee336b9',
    ])
    expect(parseSessionTrailers(raw)).toEqual([
      { sha: 'c1', date: '2026-07-05T00:00:00Z', session: '576a49a2-1f18-4be4-8cf7-68173ee336b9' },
    ])
  })

  it('reads every commit in the log, in order', () => {
    const raw = [
      trailerBlock('c1', '2026-07-11T00:00:00Z', ['a', '', 'Claude-Session: https://claude.ai/code/session_A']),
      trailerBlock('c2', '2026-07-12T00:00:00Z', ['b', '', 'Claude-Session: https://claude.ai/code/session_B']),
    ].join('\n')
    expect(parseSessionTrailers(raw).map((r) => r.session)).toEqual(['session_A', 'session_B'])
  })
})

describe('pullRequestSessionRef() — the orphan candidate source (issue #738)', () => {
  function pr(over: Partial<RawPullRequestApiRecord> = {}): RawPullRequestApiRecord {
    return {
      number: 649,
      body: null,
      merged_at: '2026-07-22T21:01:30Z',
      merge_commit_sha: 'cc9f82d',
      ...over,
    }
  }

  it('reads the session out of the ADR-0017 header, keyed on the merge commit', () => {
    const record = pr({ body: '🤖 [Claude Opus 5](https://claude.ai/code/session_A)\n\nSome summary.' })
    expect(pullRequestSessionRef(record)).toEqual({
      sha: 'cc9f82d',
      date: '2026-07-22T21:01:30Z',
      session: 'session_A',
    })
  })

  it('falls back to the legacy Claude-Session footer — most merged PRs predate the header', () => {
    const record = pr({
      body: ['## Summary', '', 'Co-Authored-By: Claude <noreply@anthropic.com>', 'Claude-Session: https://claude.ai/code/session_B'].join('\n'),
    })
    expect(pullRequestSessionRef(record)?.session).toBe('session_B')
  })

  it('prefers the header over a footer naming a different session', () => {
    const record = pr({
      body: ['🤖 [Claude Opus 5](https://claude.ai/code/session_HEADER)', '', 'Claude-Session: https://claude.ai/code/session_FOOTER'].join('\n'),
    })
    expect(pullRequestSessionRef(record)?.session).toBe('session_HEADER')
  })

  it('ignores a closed-but-unmerged pull request', () => {
    expect(pullRequestSessionRef(pr({ merged_at: null, body: '🤖 [M](https://claude.ai/code/session_A)' }))).toBeNull()
  })

  it('contributes no candidate for a merged PR whose body carries no session marker', () => {
    expect(pullRequestSessionRef(pr({ body: 'Fixes a typo.' }))).toBeNull()
    expect(pullRequestSessionRef(pr({ body: null }))).toBeNull()
  })

  it('does not attribute a session URL merely quoted mid-sentence (issue #692 class, seen on PR #120)', () => {
    const record = pr({
      body: '- **Primary**: read the id from the harness template (`Claude-Session: https://claude.ai/code/session_01…`) — zero commits needed.',
    })
    expect(pullRequestSessionRef(record)).toBeNull()
  })

  it('does not attribute a session URL quoted anywhere else in the body either', () => {
    const record = pr({ body: 'Re-verified the fix filed as https://claude.ai/code/session_OTHER — no change needed.' })
    expect(pullRequestSessionRef(record)).toBeNull()
  })

  it('falls back to a pr-<number> reference rather than dropping a merged PR with no merge sha', () => {
    const record = pr({ merge_commit_sha: null, body: '🤖 [M](https://claude.ai/code/session_A)' })
    expect(pullRequestSessionRef(record)?.sha).toBe('pr-649')
  })

  it('is bounded by no time window at all — an arbitrarily old merged PR still yields a candidate', () => {
    const ancient = pr({ merged_at: '2026-01-01T00:00:00Z', body: '🤖 [M](https://claude.ai/code/session_OLD)' })
    expect(pullRequestSessionRef(ancient)?.date).toBe('2026-01-01T00:00:00Z')
  })
})

describe('parseMergedPullRequests()', () => {
  it('keeps only the merged, session-carrying records, in input order', () => {
    const records: RawPullRequestApiRecord[] = [
      { number: 1, merged_at: '2026-07-01T00:00:00Z', merge_commit_sha: 'a', body: '🤖 [M](https://claude.ai/code/session_A)' },
      { number: 2, merged_at: null, merge_commit_sha: null, body: '🤖 [M](https://claude.ai/code/session_B)' },
      { number: 3, merged_at: '2026-07-03T00:00:00Z', merge_commit_sha: 'c', body: 'no marker' },
      { number: 4, merged_at: '2026-07-04T00:00:00Z', merge_commit_sha: 'd', body: '🤖 [M](https://claude.ai/code/session_D)' },
    ]
    expect(parseMergedPullRequests(records).map((r) => r.session)).toEqual(['session_A', 'session_D'])
  })

  it('feeds the unchanged comparison: a PR-derived candidate with no log reads as an orphan', () => {
    const records: RawPullRequestApiRecord[] = [
      { number: 1, merged_at: '2026-07-22T21:01:30Z', merge_commit_sha: 'cc9f82d', body: '🤖 [M](https://claude.ai/code/session_orphan)' },
      { number: 2, merged_at: '2026-07-23T00:00:00Z', merge_commit_sha: 'dd0', body: '🤖 [M](https://claude.ai/code/session_logged)' },
    ]
    const { orphaned } = findOrphanedSessions(parseMergedPullRequests(records), new Set(['session_logged']))
    expect(orphaned).toEqual([
      { session: 'session_orphan', commits: ['cc9f82d'], date: '2026-07-22T21:01:30Z' },
    ])
  })
})

describe('groupSessionReferences()', () => {
  it('groups multiple commits referencing the same session, keeping the earliest date', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'c2', date: '2026-07-12T00:00:00Z', session: 'session_A' },
      { sha: 'c1', date: '2026-07-11T00:00:00Z', session: 'session_A' },
    ]
    const grouped = groupSessionReferences(refs)
    expect(grouped.get('session_A')).toEqual({ commits: ['c2', 'c1'], date: '2026-07-11T00:00:00Z' })
  })

  it('picks the real-time-earliest date across mixed timezone offsets, not the lexically-earliest', () => {
    // `+02:00` 01:00 = 2026-07-11T23:00Z, which is EARLIER than the 2026-07-12T00:00Z
    // commit despite sorting later as a raw string — the epoch comparison must prefer it.
    const refs: SessionTrailerRef[] = [
      { sha: 'zulu', date: '2026-07-12T00:00:00Z', session: 'session_A' },
      { sha: 'plus2', date: '2026-07-12T01:00:00+02:00', session: 'session_A' },
    ]
    const grouped = groupSessionReferences(refs)
    expect(grouped.get('session_A')).toEqual({ commits: ['zulu', 'plus2'], date: '2026-07-12T01:00:00+02:00' })
  })
})

describe('findOrphanedSessions()', () => {
  it('flags a referenced session id with no matching log file', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_orphan' }]
    expect(findOrphanedSessions(refs, new Set()).orphaned).toEqual([
      { session: 'session_orphan', commits: ['c1'], date: '2026-07-12T00:00:00Z' },
    ])
  })

  it('does not flag a session id that has a matching log file', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_logged' }]
    expect(findOrphanedSessions(refs, new Set(['session_logged'])).orphaned).toEqual([])
  })

  it('sorts orphans by earliest referencing commit date, oldest first', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'c2', date: '2026-07-12T00:00:00Z', session: 'session_newer' },
      { sha: 'c1', date: '2026-07-10T00:00:00Z', session: 'session_older' },
    ]
    expect(findOrphanedSessions(refs, new Set()).orphaned.map((o) => o.session)).toEqual(['session_older', 'session_newer'])
  })

  it('still resolves the correct earliest date for a session with mixed-offset refs (item 3)', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'zulu', date: '2026-07-12T00:00:00Z', session: 'session_mixed' },
      { sha: 'plus2', date: '2026-07-12T01:00:00+02:00', session: 'session_mixed' },
    ]
    expect(findOrphanedSessions(refs, new Set()).orphaned).toEqual([
      { session: 'session_mixed', commits: ['zulu', 'plus2'], date: '2026-07-12T01:00:00+02:00' },
    ])
  })

  it('sorts two different sessions correctly across mixed timezone offsets (item 3)', () => {
    // `session_b`'s +02:00 stamp is real-time-earlier than `session_a`'s Z stamp
    // despite sorting later as a raw string — the final cross-session sort must
    // compare by epoch, not lexicographically, to put session_b first.
    const refs: SessionTrailerRef[] = [
      { sha: 'a1', date: '2026-07-12T00:00:00Z', session: 'session_a' },
      { sha: 'b1', date: '2026-07-12T01:00:00+02:00', session: 'session_b' },
    ]
    expect(findOrphanedSessions(refs, new Set()).orphaned.map((o) => o.session)).toEqual(['session_b', 'session_a'])
  })

  it('drops a resolved same-run mis-file: the flagged commit\'s added file was later removed (issue #574)', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_misfiled' },
    ]
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: ['layers/journal/content/current/sessions/wrong-id.yml'], removed: [] },
      { sha: 'c2', date: '2026-07-12T00:05:00Z', added: [], removed: ['layers/journal/content/current/sessions/wrong-id.yml'] },
    ]
    expect(findOrphanedSessions(refs, new Set(), changes).orphaned).toEqual([])
  })

  it('still flags a genuine orphan whose added file was never removed', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_orphan' }]
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: ['layers/journal/content/current/sessions/real.yml'], removed: [] },
    ]
    expect(findOrphanedSessions(refs, new Set(), changes).orphaned).toEqual([
      { session: 'session_orphan', commits: ['c1'], date: '2026-07-12T00:00:00Z' },
    ])
  })

  it('does not resolve on a removal that predates the add (order matters)', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c2', date: '2026-07-12T00:05:00Z', session: 'session_orphan' }]
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: [], removed: ['layers/journal/content/current/sessions/wrong-id.yml'] },
      { sha: 'c2', date: '2026-07-12T00:05:00Z', added: ['layers/journal/content/current/sessions/wrong-id.yml'], removed: [] },
    ]
    expect(findOrphanedSessions(refs, new Set(), changes).orphaned).toEqual([
      { session: 'session_orphan', commits: ['c2'], date: '2026-07-12T00:05:00Z' },
    ])
  })

  it('does not resolve on a path mismatch', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_orphan' }]
    // Both paths are session logs, so the mismatch itself is what must save the
    // orphan here — not `isSessionLogPath` short-circuiting first (issue #747).
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: ['layers/journal/content/current/sessions/a.yml'], removed: [] },
      { sha: 'c2', date: '2026-07-12T00:05:00Z', added: [], removed: ['layers/journal/content/current/sessions/b.yml'] },
    ]
    expect(findOrphanedSessions(refs, new Set(), changes).orphaned).toEqual([
      { session: 'session_orphan', commits: ['c1'], date: '2026-07-12T00:00:00Z' },
    ])
  })

  // End-to-end guard for issue #747, using the real commit shas/timestamps of
  // session_019aeaoPHYWMJVekmUvTMhQ9 — the orphan four daily sweeps suppressed.
  it('still flags an orphan whose only added-then-deleted file was a doc, not a session log (issue #747)', () => {
    const refs: SessionTrailerRef[] = [
      { sha: '7623eac', date: '2026-07-22T20:31:22+00:00', session: 'session_019aeaoPHYWMJVekmUvTMhQ9' },
      { sha: '7111d70', date: '2026-07-22T20:49:58+00:00', session: 'session_019aeaoPHYWMJVekmUvTMhQ9' },
    ]
    const changes: CommitFileChange[] = [
      {
        sha: '7623eac',
        date: '2026-07-22T20:31:22+00:00',
        added: ['docs/agents/github-footer-guard.md', 'scripts/github-footer-guard.ts'],
        removed: [],
      },
      { sha: '7111d70', date: '2026-07-22T20:49:58+00:00', added: [], removed: ['docs/agents/github-footer-guard.md'] },
    ]
    expect(findOrphanedSessions(refs, new Set(), changes).orphaned).toEqual([
      {
        session: 'session_019aeaoPHYWMJVekmUvTMhQ9',
        commits: ['7623eac', '7111d70'],
        date: '2026-07-22T20:31:22+00:00',
      },
    ])
  })

  it('annotates a resolved entry with resolvedBy instead of dropping it (issue #447 item 4)', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'c1', date: '2026-07-10T00:00:00Z', session: 'session_triaged' },
      { sha: 'c2', date: '2026-07-12T00:00:00Z', session: 'session_fresh' },
    ]
    const resolved = new Map([['session_triaged', '#650']])
    expect(findOrphanedSessions(refs, new Set(), [], resolved).orphaned).toEqual([
      { session: 'session_triaged', commits: ['c1'], date: '2026-07-10T00:00:00Z', resolvedBy: '#650' },
      { session: 'session_fresh', commits: ['c2'], date: '2026-07-12T00:00:00Z' },
    ])
  })
})

// The regression #747 could not have caught: the mis-file rule suppressed a
// genuine orphan for four daily sweeps and left no trace that it had. These
// assert the suppression is *reported*, not that it stops happening (issue #754).
describe('findOrphanedSessions() suppression reporting (issue #754)', () => {
  it('reports a mis-file-suppressed candidate, naming the triggering session-log path', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_misfiled' }]
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: ['layers/journal/content/current/sessions/wrong-id.yml'], removed: [] },
      { sha: 'c2', date: '2026-07-12T00:05:00Z', added: [], removed: ['layers/journal/content/current/sessions/wrong-id.yml'] },
    ]
    const { orphaned, suppressed } = findOrphanedSessions(refs, new Set(), changes)
    expect(orphaned).toEqual([])
    expect(suppressed).toEqual([
      {
        session: 'session_misfiled',
        commits: ['c1'],
        date: '2026-07-12T00:00:00Z',
        reason: 'misfile-cleanup',
        path: 'layers/journal/content/current/sessions/wrong-id.yml',
      },
    ])
  })

  it('reports an empty list — not a missing one — when nothing was suppressed', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_orphan' }]
    const { orphaned, suppressed } = findOrphanedSessions(refs, new Set())
    expect(orphaned).toHaveLength(1)
    expect(suppressed).toEqual([])
  })

  it('attributes a resolvedBy-annotated candidate with a reason distinct from the mis-file one', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c1', date: '2026-07-10T00:00:00Z', session: 'session_triaged' }]
    const resolved = new Map([['session_triaged', '#650']])
    const { orphaned, suppressed } = findOrphanedSessions(refs, new Set(), [], resolved)
    // The annotated candidate stays visible in `orphanedSessions` too — only the
    // mis-file path actually removes one (issue #447 item 4).
    expect(orphaned).toEqual([
      { session: 'session_triaged', commits: ['c1'], date: '2026-07-10T00:00:00Z', resolvedBy: '#650' },
    ])
    expect(suppressed).toEqual([
      {
        session: 'session_triaged',
        commits: ['c1'],
        date: '2026-07-10T00:00:00Z',
        reason: 'resolved-annotation',
        resolvedBy: '#650',
      },
    ])
  })

  it('does not let a suppressed candidate reappear in orphanedSessions', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_misfiled' },
      { sha: 'c3', date: '2026-07-13T00:00:00Z', session: 'session_genuine' },
    ]
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: ['layers/journal/content/current/sessions/wrong-id.yml'], removed: [] },
      { sha: 'c2', date: '2026-07-12T00:05:00Z', added: [], removed: ['layers/journal/content/current/sessions/wrong-id.yml'] },
    ]
    const { orphaned, suppressed } = findOrphanedSessions(refs, new Set(), changes)
    expect(orphaned.map((o) => o.session)).toEqual(['session_genuine'])
    expect(suppressed.map((s) => s.session)).toEqual(['session_misfiled'])
  })

  it('sorts suppressed candidates oldest-first, like the orphans themselves', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'b1', date: '2026-07-12T00:00:00Z', session: 'session_newer' },
      { sha: 'a1', date: '2026-07-10T00:00:00Z', session: 'session_older' },
    ]
    const resolved = new Map([
      ['session_newer', '#1'],
      ['session_older', '#2'],
    ])
    const { suppressed } = findOrphanedSessions(refs, new Set(), [], resolved)
    expect(suppressed.map((s) => s.session)).toEqual(['session_older', 'session_newer'])
  })
})

describe('resolvedMisfilePath()', () => {
  it('returns null when the commit has no file-change data at all', () => {
    expect(resolvedMisfilePath(['c1'], [])).toBe(null)
  })

  it('ignores a different commit\'s add/remove of the same-named path when the flagged commit itself added nothing', () => {
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: [], removed: [] },
      { sha: 'c2', date: '2026-07-12T00:05:00Z', added: ['layers/journal/content/current/sessions/x.yml'], removed: [] },
      { sha: 'c3', date: '2026-07-12T00:10:00Z', added: [], removed: ['layers/journal/content/current/sessions/x.yml'] },
    ]
    expect(resolvedMisfilePath(['c1'], changes)).toBe(null)
  })

  // The exact shape of issue #747: session_019aeaoPHYWMJVekmUvTMhQ9 added
  // docs/agents/github-footer-guard.md and deleted it 18 minutes later while
  // folding the explanation into CLAUDE.md — ordinary single-home cleanup that
  // suppressed the genuine orphan on four consecutive daily sweeps.
  it('does not resolve on an added-then-deleted path that is not a session log (issue #747)', () => {
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-22T20:31:22+00:00', added: ['docs/agents/github-footer-guard.md'], removed: [] },
      { sha: 'c2', date: '2026-07-22T20:49:58+00:00', added: [], removed: ['docs/agents/github-footer-guard.md'] },
    ]
    expect(resolvedMisfilePath(['c1'], changes)).toBe(null)
  })

  it('still resolves a mis-filed session log under archived/, returning the path (issue #574 scope, both dirs)', () => {
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: ['layers/journal/content/archived/sessions/wrong-id.yml'], removed: [] },
      { sha: 'c2', date: '2026-07-12T00:05:00Z', added: [], removed: ['layers/journal/content/archived/sessions/wrong-id.yml'] },
    ]
    expect(resolvedMisfilePath(['c1'], changes)).toBe('layers/journal/content/archived/sessions/wrong-id.yml')
  })

  // Both directions of the raw-string date compare this function used to do —
  // the hazard groupSessionReferences/findOrphanedSessions already guard against.
  it('does not resolve when the removal only LOOKS later as a string but is real-time earlier (issue #747)', () => {
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: ['layers/journal/content/current/sessions/wrong-id.yml'], removed: [] },
      // 01:00+02:00 is 23:00Z the previous day — earlier than the add, but
      // string-greater, so the old compare wrongly treated it as a cleanup.
      { sha: 'c2', date: '2026-07-12T01:00:00+02:00', added: [], removed: ['layers/journal/content/current/sessions/wrong-id.yml'] },
    ]
    expect(resolvedMisfilePath(['c1'], changes)).toBe(null)
  })

  it('resolves when the removal is real-time later despite sorting earlier as a string (issue #747)', () => {
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T05:00:00+02:00', added: ['layers/journal/content/current/sessions/wrong-id.yml'], removed: [] },
      // 04:00Z is 06:00+02:00 — later than the add, but string-lesser, so the
      // old compare missed a genuine cleanup.
      { sha: 'c2', date: '2026-07-12T04:00:00Z', added: [], removed: ['layers/journal/content/current/sessions/wrong-id.yml'] },
    ]
    expect(resolvedMisfilePath(['c1'], changes)).toBe('layers/journal/content/current/sessions/wrong-id.yml')
  })
})

describe('isSessionLogPath()', () => {
  it('accepts a .yml under either sessions dir', () => {
    expect(isSessionLogPath('layers/journal/content/current/sessions/a.yml')).toBe(true)
    expect(isSessionLogPath('layers/journal/content/archived/sessions/a.yml')).toBe(true)
  })

  it('rejects a non-session-log path, a non-yml, and a bare filename', () => {
    expect(isSessionLogPath('docs/agents/github-footer-guard.md')).toBe(false)
    expect(isSessionLogPath('layers/journal/content/current/sessions/a.md')).toBe(false)
    expect(isSessionLogPath('a.yml')).toBe(false)
    expect(isSessionLogPath('layers/journal/content/current/pages/a.yml')).toBe(false)
  })
})

describe('parseCommitFileChanges()', () => {
  // Mirrors `git log --name-status --pretty=format:REC%H SEP %aI`.
  function block(sha: string, date: string, statusLines: string[]): string {
    return `${REC}${sha}${SEP}${date}\n${statusLines.join('\n')}`
  }

  it('splits added and removed paths by status letter', () => {
    const raw = block('c1', '2026-07-12T00:00:00Z', ['A\ta.yml', 'D\tb.yml', 'M\tc.yml'])
    expect(parseCommitFileChanges(raw)).toEqual([
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: ['a.yml'], removed: ['b.yml'] },
    ])
  })

  it('treats a rename as removing the old path and adding the new one', () => {
    const raw = block('c1', '2026-07-12T00:00:00Z', ['R100\told.yml\tnew.yml'])
    expect(parseCommitFileChanges(raw)).toEqual([
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: ['new.yml'], removed: ['old.yml'] },
    ])
  })

  it('handles a commit that touched no files', () => {
    const raw = block('c1', '2026-07-12T00:00:00Z', [])
    expect(parseCommitFileChanges(raw)).toEqual([{ sha: 'c1', date: '2026-07-12T00:00:00Z', added: [], removed: [] }])
  })

  it('reads every commit block in the log', () => {
    const raw = [block('c1', '2026-07-11T00:00:00Z', ['A\ta.yml']), block('c2', '2026-07-12T00:00:00Z', ['D\ta.yml'])].join('\n')
    expect(parseCommitFileChanges(raw).map((c) => c.sha)).toEqual(['c1', 'c2'])
  })
})

describe('hasHumanPromptedClosure()', () => {
  it('flags a friction description carrying the exact keyword', () => {
    expect(hasHumanPromptedClosure([`user nudged me — ${HUMAN_PROMPTED_CLOSURE}`])).toBe(true)
  })

  it('does not flag descriptions that never mention it', () => {
    expect(hasHumanPromptedClosure(['a normal friction', 'another one'])).toBe(false)
    expect(hasHumanPromptedClosure([])).toBe(false)
  })
})

describe('findHumanPromptedClosures()', () => {
  it('returns only sessions whose log flagged the keyword, oldest-first', () => {
    const sessions = [
      sess({ session: 'b', endedAt: '2026-07-12T00:00:00Z', humanPromptedClosure: true }),
      sess({ session: 'a', endedAt: '2026-07-10T00:00:00Z', humanPromptedClosure: true }),
      sess({ session: 'c', endedAt: '2026-07-13T00:00:00Z', humanPromptedClosure: false }),
    ]
    expect(findHumanPromptedClosures(sessions)).toEqual([
      { session: 'a', endedAt: '2026-07-10T00:00:00Z' },
      { session: 'b', endedAt: '2026-07-12T00:00:00Z' },
    ])
  })

  it('suppresses a dismissed session id but still surfaces a non-dismissed keyword session (issue #540)', () => {
    const sessions = [
      sess({ session: 'tracked', endedAt: '2026-07-10T00:00:00Z', humanPromptedClosure: true }),
      sess({ session: 'fresh', endedAt: '2026-07-12T00:00:00Z', humanPromptedClosure: true }),
    ]
    expect(findHumanPromptedClosures(sessions, new Set(['tracked']))).toEqual([
      { session: 'fresh', endedAt: '2026-07-12T00:00:00Z' },
    ])
  })

  it('defaults to DISMISSED_HUMAN_PROMPTED_CLOSURES, not an empty set', () => {
    const sessions = [
      sess({ session: 'session_015gQvuX4uBkjpzW9yovabVz', endedAt: '2026-07-14T11:17:23Z', humanPromptedClosure: true }),
      sess({ session: 'session_01Y11Fou1pRvTW2ucEt1dhX8', endedAt: '2026-07-14T13:21:51Z', humanPromptedClosure: true }),
    ]
    expect(findHumanPromptedClosures(sessions)).toEqual([])
  })
})

describe('findManuallyRescuedClosures()', () => {
  it('flags a session whose closure trailed its last work commit past the threshold', () => {
    // Mirrors the motivating orphan: last work commit, then a long idle, then close.
    const refs: SessionTrailerRef[] = [
      { sha: 'c1', date: '2026-07-13T00:58:10Z', session: 'session_rescued' },
      { sha: 'c0', date: '2026-07-12T19:04:14Z', session: 'session_rescued' },
    ]
    const sessions = [sess({ session: 'session_rescued', endedAt: '2026-07-13T17:19:05Z' })]
    expect(findManuallyRescuedClosures(refs, sessions)).toEqual([
      {
        session: 'session_rescued',
        endedAt: '2026-07-13T17:19:05Z',
        lastWorkCommit: '2026-07-13T00:58:10Z',
        gapHours: 16.3,
      },
    ])
  })

  it('does not flag a healthy session that closed soon after its last work commit', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c1', date: '2026-07-13T14:31:40Z', session: 's' }]
    const sessions = [sess({ session: 's', endedAt: '2026-07-13T15:06:10Z' })] // ~35 min gap
    expect(findManuallyRescuedClosures(refs, sessions)).toEqual([])
  })

  it('ignores a session with no work commit in the trailer refs', () => {
    const sessions = [sess({ session: 's', endedAt: '2026-07-13T17:19:05Z' })]
    expect(findManuallyRescuedClosures([], sessions)).toEqual([])
  })

  it('measures the gap from the LATEST work commit, not the earliest', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'early', date: '2026-07-10T00:00:00Z', session: 's' },
      { sha: 'late', date: '2026-07-13T16:00:00Z', session: 's' },
    ]
    const sessions = [sess({ session: 's', endedAt: '2026-07-13T17:00:00Z' })] // 1h from latest
    expect(findManuallyRescuedClosures(refs, sessions)).toEqual([]) // not 3+ days from earliest
  })

  it('sorts multiple rescues by gap, largest first', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'a', date: '2026-07-13T00:00:00Z', session: 'small' },
      { sha: 'b', date: '2026-07-12T00:00:00Z', session: 'big' },
    ]
    const sessions = [
      sess({ session: 'small', endedAt: '2026-07-13T08:00:00Z' }), // 8h
      sess({ session: 'big', endedAt: '2026-07-13T00:00:00Z' }), // 24h
    ]
    expect(findManuallyRescuedClosures(refs, sessions).map((r) => r.session)).toEqual(['big', 'small'])
  })

  it('picks the real-time-latest work commit across mixed timezone offsets', () => {
    // `+02:00` 21:00 = 19:00Z, which is EARLIER than the 20:00Z commit despite
    // sorting later as a raw string — the epoch comparison must prefer 20:00Z.
    const refs: SessionTrailerRef[] = [
      { sha: 'zulu', date: '2026-07-12T20:00:00Z', session: 's' },
      { sha: 'plus2', date: '2026-07-12T21:00:00+02:00', session: 's' },
    ]
    const sessions = [sess({ session: 's', endedAt: '2026-07-13T20:00:00Z' })] // 24h from 20:00Z
    expect(findManuallyRescuedClosures(refs, sessions)).toMatchObject([
      { session: 's', lastWorkCommit: '2026-07-12T20:00:00Z', gapHours: 24 },
    ])
  })

  it('respects a caller-supplied threshold', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'a', date: '2026-07-13T00:00:00Z', session: 's' }]
    const sessions = [sess({ session: 's', endedAt: '2026-07-13T02:00:00Z' })] // 2h gap
    expect(findManuallyRescuedClosures(refs, sessions, RESCUED_GAP_HOURS)).toEqual([]) // below default 6h
    expect(findManuallyRescuedClosures(refs, sessions, 1)).toHaveLength(1) // above a 1h threshold
  })

  it('suppresses a dismissed session id — an already-tracked-and-fixed incident (issue #426)', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'a', date: '2026-07-13T00:00:00Z', session: 'session_fixed' }]
    const sessions = [sess({ session: 'session_fixed', endedAt: '2026-07-14T00:00:00Z' })] // 24h gap — would flag
    expect(
      findManuallyRescuedClosures(refs, sessions, RESCUED_GAP_HOURS, new Set(['session_fixed'])),
    ).toEqual([])
  })

  it('defaults to DISMISSED_MANUALLY_RESCUED_CLOSURES, not an empty set', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'a', date: '2026-07-12T18:32:27Z', session: 'session_019pNrzTQb3EV2SJBWXs1bXG' },
    ]
    const sessions = [sess({ session: 'session_019pNrzTQb3EV2SJBWXs1bXG', endedAt: '2026-07-13T17:19:05Z' })]
    expect(findManuallyRescuedClosures(refs, sessions)).toEqual([])
  })

  it('annotates a resolved entry with resolvedBy, keeping it visible unlike dismissed (issue #447 item 4)', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'a', date: '2026-07-13T00:00:00Z', session: 'session_triaged' }]
    const sessions = [sess({ session: 'session_triaged', endedAt: '2026-07-14T00:00:00Z' })] // 24h gap
    const resolved = new Map([['session_triaged', '#650']])
    expect(
      findManuallyRescuedClosures(refs, sessions, RESCUED_GAP_HOURS, new Set(), resolved),
    ).toEqual([
      {
        session: 'session_triaged',
        endedAt: '2026-07-14T00:00:00Z',
        lastWorkCommit: '2026-07-13T00:00:00Z',
        gapHours: 24,
        resolvedBy: '#650',
      },
    ])
  })
})

describe('findMisclassifiedKind() — issue #449 Gap 2', () => {
  it('flags a remote_trigger session authored as anything other than autonomous', () => {
    const sessions = [
      sess({ session: 'a', kind: 'interactive', entrypoint: 'remote_trigger', endedAt: '2026-07-13T00:00:00Z' }),
    ]
    expect(findMisclassifiedKind(sessions)).toEqual([
      { session: 'a', kind: 'interactive', entrypoint: 'remote_trigger', endedAt: '2026-07-13T00:00:00Z' },
    ])
  })

  it('does not flag a remote_trigger session correctly authored as autonomous', () => {
    const sessions = [sess({ session: 'a', kind: 'autonomous', entrypoint: 'remote_trigger' })]
    expect(findMisclassifiedKind(sessions)).toEqual([])
  })

  it('does not flag a legitimately interactive session that merely lacks remote_trigger', () => {
    const sessions = [
      sess({ session: 'a', kind: 'interactive', entrypoint: 'remote' }),
      sess({ session: 'b', kind: 'interactive', entrypoint: '' }),
    ]
    expect(findMisclassifiedKind(sessions)).toEqual([])
  })

  it('sorts multiple misclassifications oldest-first', () => {
    const sessions = [
      sess({ session: 'newer', kind: 'delegated', entrypoint: 'remote_trigger', endedAt: '2026-07-14T00:00:00Z' }),
      sess({ session: 'older', kind: 'interactive', entrypoint: 'remote_trigger', endedAt: '2026-07-10T00:00:00Z' }),
    ]
    expect(findMisclassifiedKind(sessions).map((m) => m.session)).toEqual(['older', 'newer'])
  })
})
