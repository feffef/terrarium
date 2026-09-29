// Unit tests for the audit-skills helper's pure core (ADR-0015) — the window,
// the usage join, the behaviour-check pick, and the closure-completeness
// signals. The FS/GitHub IO is a thin shell over these, exercised by running
// the Skill.
import { describe, expect, it } from 'vitest'
import {
  buildDocReadCounts,
  buildSkillRows,
  findHumanPromptedClosures,
  findManuallyRescuedClosures,
  findOrphanedSessions,
  groupSessionReferences,
  hasHumanPromptedClosure,
  HUMAN_PROMPTED_CLOSURE,
  isSessionLogPath,
  lastUsed,
  parseCommitFileChanges,
  parseMergedPullRequests,
  parseSessionTrailers,
  pickBehaviourChecks,
  pickWindow,
  pullRequestSessionRef,
  REC,
  RESCUED_GAP_HOURS,
  RESOLVED_ORPHANED_SESSIONS,
  resolvedMisfilePath,
  SEP,
  tallyUsage,
  toSession,
  type CommitFileChange,
  type InventoryEntry,
  type OnDiskSkill,
  type RawPullRequestApiRecord,
  type Session,
  type SessionTrailerRef,
  type SkillRow,
} from '../../scripts/audit-skills.ts'

function sess(over: Partial<Session> = {}): Session {
  return {
    session: 's',
    file: 'f.yml',
    kind: 'interactive',
    goal: 'goal',
    endedAt: '2026-07-05T10:00:00Z',
    skillsUsed: [],
    mentioned: [],
    humanInvoked: [],
    humanPromptedClosure: false,
    docsRead: [],
    ...over,
  }
}

describe('pickWindow()', () => {
  const sessions = [
    sess({ session: 'a', endedAt: '2026-07-01T00:00:00Z' }),
    sess({ session: 'b', endedAt: '2026-07-03T00:00:00Z' }),
    sess({ session: 'c', endedAt: '2026-07-02T00:00:00Z' }),
  ]

  it('keeps sessions ending at or after `since`, newest first', () => {
    expect(pickWindow(sessions, '2026-07-02T00:00:00Z').map((s) => s.session)).toEqual(['b', 'c'])
  })

  it('compares instants, not strings, across timezone offsets', () => {
    expect(pickWindow(sessions, '2026-07-03T01:00:00+02:00').map((s) => s.session)).toEqual(['b'])
  })

  it('breaks endedAt ties by session id, deterministically', () => {
    const tied = ['a', 'c', 'b'].map((session) => sess({ session, endedAt: '2026-07-01T00:00:00Z' }))
    expect(pickWindow(tied, '2026-07-01T00:00:00Z').map((s) => s.session)).toEqual(['c', 'b', 'a'])
  })

  it('does not mutate its input', () => {
    const before = sessions.map((s) => s.session)
    pickWindow(sessions, '2026-07-02T00:00:00Z')
    expect(sessions.map((s) => s.session)).toEqual(before)
  })
})

describe('tallyUsage() / lastUsed()', () => {
  const sessions = [
    sess({ session: 's1', endedAt: '2026-07-01T00:00:00Z', skillsUsed: ['blog-post', 'blog-post'] }),
    sess({ session: 's2', endedAt: '2026-07-03T00:00:00Z', skillsUsed: ['blog-post', 'tdd'] }),
  ]

  it('lists each using session once, even when a Skill is named twice in one log', () => {
    expect(tallyUsage(sessions).get('blog-post')).toEqual(['s1', 's2'])
    expect(tallyUsage(sessions).get('tdd')).toEqual(['s2'])
  })

  it('reports the newest endedAt per Skill', () => {
    expect(lastUsed(sessions).get('blog-post')).toBe('2026-07-03T00:00:00Z')
  })
})

describe('buildSkillRows()', () => {
  const onDisk = new Map<string, OnDiskSkill>([
    ['blog-post', { description: 'author a post', modelInvoked: false }],
    ['ghost', { description: 'never inventoried', modelInvoked: true }],
  ])
  const inventory = new Map<string, InventoryEntry>([
    ['blog-post', { category: 'platform-operation', importance: 'routine', role: 'blogs', observations: [{ date: '2026-07-05', note: 'n' }] }],
    ['retired', { category: 'general-engineering', importance: 'peripheral', role: 'gone from disk', observations: [] }],
  ])
  const old = sess({ session: 'old', endedAt: '2026-06-01T00:00:00Z', skillsUsed: ['blog-post'] })
  const recent = sess({ session: 'new', endedAt: '2026-07-05T00:00:00Z', skillsUsed: ['blog-post'] })
  const rows = buildSkillRows(onDisk, inventory, [recent], [old, recent], new Set(['ghost']))
  const row = (n: string) => rows.find((r) => r.name === n)!

  it('unions every name across the sources, sorted', () => {
    expect(rows.map((r) => r.name)).toEqual(['blog-post', 'ghost', 'retired'])
  })

  it('joins description, invocation mode, grade, windowed and all-time usage', () => {
    expect(row('blog-post')).toMatchObject({
      onDisk: true, inventoried: true, external: false, modelInvoked: false, importance: 'routine',
      description: 'author a post', useCount: 1, usedIn: ['new'], allTimeUses: 2, lastUsed: '2026-07-05T00:00:00Z',
      observations: [{ date: '2026-07-05', note: 'n' }],
    })
  })

  it('lists windowed sessions that named or human-invoked a Skill', () => {
    const named = sess({ session: 'named', endedAt: '2026-07-06T00:00:00Z', mentioned: ['blog-post'], humanInvoked: ['blog-post'] })
    const r = buildSkillRows(onDisk, inventory, [named], [named], new Set()).find((x) => x.name === 'blog-post')!
    expect(r).toMatchObject({ mentionedIn: ['named'], humanInvokedIn: ['named'], useCount: 0 })
  })

  it('flags an uninventoried pack Skill, unused', () => {
    expect(row('ghost')).toMatchObject({
      external: true, inventoried: false, modelInvoked: true, useCount: 0, allTimeUses: 0, lastUsed: null, observations: [],
    })
  })

  it('flags an inventoried Skill gone from disk', () => {
    expect(row('retired')).toMatchObject({ onDisk: false, inventoried: true, description: null })
  })
})

describe('pickBehaviourChecks()', () => {
  const r = (name: string, useCount: number, over: Partial<SkillRow> = {}) =>
    ({ name, useCount, external: false, onDisk: true, ...over }) as SkillRow

  it('picks own, on-disk Skills at or above the threshold', () => {
    const rows = [r('often', 3), r('rare', 2), r('pack', 9, { external: true }), r('gone', 9, { onDisk: false })]
    expect(pickBehaviourChecks(rows, 3)).toEqual(['often'])
  })
})

describe('buildDocReadCounts()', () => {
  it('counts sessions per path, descending, and never a doc twice for one session', () => {
    const sessions = [
      sess({ session: 'a', docsRead: ['x.md', 'CLAUDE.md', 'CLAUDE.md'] }),
      sess({ session: 'b', docsRead: ['CLAUDE.md'] }),
    ]
    expect(Object.entries(buildDocReadCounts(sessions))).toEqual([['CLAUDE.md', 2], ['x.md', 1]])
  })
})

describe('toSession() — external exclusion (ADR-0009 amendment)', () => {
  const skillNames = new Set(['tdd'])

  it('reduces an internal log to a Session: real Skill names only, docsRead paths only', () => {
    const raw = {
      session: 'session_internal',
      kind: 'interactive',
      goal: 'do a thing',
      endedAt: '2026-07-20T00:00:00Z',
      skillsUsed: [{ name: 'tdd', reason: 'red-green' }, { name: 'model', reason: 'not a Skill (issue #545)' }],
      frictions: [{ severity: 'minor', description: `nudged — ${HUMAN_PROMPTED_CLOSURE}` }],
      docsRead: [{ path: 'CLAUDE.md', reason: 'conventions' }],
    }
    expect(toSession(raw, 'f.yml', skillNames)).toEqual({
      session: 'session_internal',
      file: 'f.yml',
      kind: 'interactive',
      goal: 'do a thing',
      endedAt: '2026-07-20T00:00:00Z',
      skillsUsed: ['tdd'],
      mentioned: [],
      humanInvoked: [],
      humanPromptedClosure: true,
      docsRead: ['CLAUDE.md'],
    })
  })

  it('finds Skills named in frictions and learnings, and the ones a human invoked', () => {
    const names = new Set(['code-review', 'grilling', 'grill-with-docs', 'tdd'])
    const raw = {
      session: 's',
      endedAt: '2026-07-20T00:00:00Z',
      skillsUsed: [
        { name: 'grill-with-docs', reason: '(invoked as a slash command)' },
        { name: 'grilling', reason: 'its engine' },
        { name: 'tdd', reason: 'owner asked for it' },
      ],
      frictions: [{ severity: 'major', description: 'bug caught only by /code-review', solution: 'run grill-with-docs first' }],
      learnings: ['tdd pays off'],
    }
    const s = toSession(raw, 'f.yml', names)!
    expect(s.mentioned.sort()).toEqual(['code-review', 'grill-with-docs', 'tdd'])
    expect(s.humanInvoked).toEqual(['grill-with-docs', 'tdd'])
  })

  it('tolerates a log with no docsRead at all (older logs predate the field)', () => {
    const raw = { session: 's', kind: 'interactive', goal: 'g', endedAt: '2026-07-20T00:00:00Z' }
    expect(toSession(raw, 'f.yml', skillNames)?.docsRead).toEqual([])
  })

  it('returns null for an external log — excluded from the mining corpus entirely', () => {
    const raw = { session: 'x', endedAt: '2026-07-20T00:00:00Z', external: true, skillsUsed: [{ name: 'tdd', reason: 'r' }] }
    expect(toSession(raw, 'f.yml', skillNames)).toBeNull()
  })

  it('treats external:false as internal (not excluded)', () => {
    const raw = { session: 's', endedAt: '2026-07-20T00:00:00Z', external: false, skillsUsed: [], frictions: [] }
    expect(toSession(raw, 'f.yml', skillNames)).not.toBeNull()
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
  // That same real session id is now also a `RESOLVED_ORPHANED_SESSIONS` entry
  // (issue #1127, resolved by #736), so `resolved` is passed explicitly here
  // as an empty map — this test is about the misfile-cleanup lever only, not
  // the resolved-annotation one, and must stay isolated from the real default.
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
    expect(findOrphanedSessions(refs, new Set(), changes, new Map()).orphaned).toEqual([
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

  it('annotates the two issue #1127 sessions with their resolving issue via the real default map', () => {
    const refs: SessionTrailerRef[] = [
      { sha: 'c1', date: '2026-07-10T00:00:00Z', session: 'session_019aeaoPHYWMJVekmUvTMhQ9' },
      { sha: 'c2', date: '2026-07-11T00:00:00Z', session: 'session_01QdPGeF2hNwJLtnvzv1Rsi1' },
    ]
    expect(findOrphanedSessions(refs, new Set()).orphaned).toEqual([
      { session: 'session_019aeaoPHYWMJVekmUvTMhQ9', commits: ['c1'], date: '2026-07-10T00:00:00Z', resolvedBy: '#736' },
      { session: 'session_01QdPGeF2hNwJLtnvzv1Rsi1', commits: ['c2'], date: '2026-07-11T00:00:00Z', resolvedBy: '#1063' },
    ])
    expect(RESOLVED_ORPHANED_SESSIONS.get('session_019aeaoPHYWMJVekmUvTMhQ9')).toBe('#736')
    expect(RESOLVED_ORPHANED_SESSIONS.get('session_01QdPGeF2hNwJLtnvzv1Rsi1')).toBe('#1063')
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
})
