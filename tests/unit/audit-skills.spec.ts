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
  isResolvedMisfile,
  parseCommitFileChanges,
  parseSessionTrailers,
  parseSkillEditLog,
  pickWindow,
  REC,
  RESCUED_GAP_HOURS,
  SEP,
  tallyUsage,
  toSessionFile,
  type CommitFileChange,
  type InventoryEntry,
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

describe('groupSessionReferences()', () => {
  it('groups multiple commits referencing the same session, keeping the earliest date', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'c2', date: '2026-07-12T00:00:00Z', session: 'session_A' },
      { sha: 'c1', date: '2026-07-11T00:00:00Z', session: 'session_A' },
    ]
    const grouped = groupSessionReferences(refs)
    expect(grouped.get('session_A')).toEqual({ commits: ['c2', 'c1'], date: '2026-07-11T00:00:00Z' })
  })
})

describe('findOrphanedSessions()', () => {
  it('flags a referenced session id with no matching log file', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_orphan' }]
    expect(findOrphanedSessions(refs, new Set())).toEqual([
      { session: 'session_orphan', commits: ['c1'], date: '2026-07-12T00:00:00Z' },
    ])
  })

  it('does not flag a session id that has a matching log file', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_logged' }]
    expect(findOrphanedSessions(refs, new Set(['session_logged']))).toEqual([])
  })

  it('sorts orphans by earliest referencing commit date, oldest first', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'c2', date: '2026-07-12T00:00:00Z', session: 'session_newer' },
      { sha: 'c1', date: '2026-07-10T00:00:00Z', session: 'session_older' },
    ]
    expect(findOrphanedSessions(refs, new Set()).map((o) => o.session)).toEqual(['session_older', 'session_newer'])
  })

  it('drops a resolved same-run mis-file: the flagged commit\'s added file was later removed (issue #574)', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_misfiled' },
    ]
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: ['layers/journal/content/current/sessions/wrong-id.yml'], removed: [] },
      { sha: 'c2', date: '2026-07-12T00:05:00Z', added: [], removed: ['layers/journal/content/current/sessions/wrong-id.yml'] },
    ]
    expect(findOrphanedSessions(refs, new Set(), changes)).toEqual([])
  })

  it('still flags a genuine orphan whose added file was never removed', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_orphan' }]
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: ['layers/journal/content/current/sessions/real.yml'], removed: [] },
    ]
    expect(findOrphanedSessions(refs, new Set(), changes)).toEqual([
      { session: 'session_orphan', commits: ['c1'], date: '2026-07-12T00:00:00Z' },
    ])
  })

  it('does not resolve on a removal that predates the add (order matters)', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c2', date: '2026-07-12T00:05:00Z', session: 'session_orphan' }]
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: [], removed: ['layers/journal/content/current/sessions/wrong-id.yml'] },
      { sha: 'c2', date: '2026-07-12T00:05:00Z', added: ['layers/journal/content/current/sessions/wrong-id.yml'], removed: [] },
    ]
    expect(findOrphanedSessions(refs, new Set(), changes)).toEqual([
      { session: 'session_orphan', commits: ['c2'], date: '2026-07-12T00:05:00Z' },
    ])
  })

  it('does not resolve on a path mismatch', () => {
    const refs: SessionTrailerRef[] = [{ sha: 'c1', date: '2026-07-12T00:00:00Z', session: 'session_orphan' }]
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: ['a.yml'], removed: [] },
      { sha: 'c2', date: '2026-07-12T00:05:00Z', added: [], removed: ['b.yml'] },
    ]
    expect(findOrphanedSessions(refs, new Set(), changes)).toEqual([
      { session: 'session_orphan', commits: ['c1'], date: '2026-07-12T00:00:00Z' },
    ])
  })
})

describe('isResolvedMisfile()', () => {
  it('returns false when the commit has no file-change data at all', () => {
    expect(isResolvedMisfile(['c1'], [])).toBe(false)
  })

  it('ignores a different commit\'s add/remove of the same-named path when the flagged commit itself added nothing', () => {
    const changes: CommitFileChange[] = [
      { sha: 'c1', date: '2026-07-12T00:00:00Z', added: [], removed: [] },
      { sha: 'c2', date: '2026-07-12T00:05:00Z', added: ['x.yml'], removed: [] },
      { sha: 'c3', date: '2026-07-12T00:10:00Z', added: [], removed: ['x.yml'] },
    ]
    expect(isResolvedMisfile(['c1'], changes)).toBe(false)
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
