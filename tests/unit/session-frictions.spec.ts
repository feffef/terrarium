// Unit tests for the session-frictions helper's pure core — the recency-window
// ordering and the raw-log → triage-record reduction where correctness bugs
// would hide. The FS IO is a thin shell over these and is exercised by running
// the `frictions-to-fixes` Skill.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ARCHIVED_SESSIONS_DIR, SESSIONS_DIR } from '../../scripts/session-logs.ts'
import { defaultWindowStart, dropLedgered, OUTPUT_FILE_PATH, pickRecencyWindow, resolveOutputTarget, survey, formatCompact, toCompactSession, toTriageSession, type TriageSession } from '../../scripts/session-frictions.ts'

function session(id: string, startedAt: string, opts: Partial<TriageSession> = {}): TriageSession {
  return {
    id,
    file: `layers/journal/content/current/sessions/${id}.yml`,
    startedAt,
    endedAt: '',
    goal: 'g',
    outcome: 'o',
    summary: 's',
    trigger: '',
    prs: [],
    docsRead: [],
    subagents: [],
    frictions: [],
    ...opts,
  }
}

describe('defaultWindowStart()', () => {
  const now = Date.parse('2026-07-10T00:00:00Z')
  it('reaches back 48 hours from the last ledger commit', () => {
    expect(defaultWindowStart(now, Date.parse('2026-07-09T12:00:00Z'))).toBe(Date.parse('2026-07-07T12:00:00Z'))
  })
  it('reaches back 48 hours from an old ledger commit, so a missed run loses no logs', () => {
    expect(defaultWindowStart(now, Date.parse('2026-07-03T00:00:00Z'))).toBe(Date.parse('2026-07-01T00:00:00Z'))
  })
  it('falls back to 48 hours when the ledger has no commit', () => {
    expect(defaultWindowStart(now, null)).toBe(Date.parse('2026-07-08T00:00:00Z'))
  })
})

describe('pickRecencyWindow()', () => {
  const cutoff = Date.parse('2026-07-07T00:00:00Z')
  it('keeps sessions at or after the cutoff, oldest first', () => {
    const sessions = [
      session('old', '2026-07-06T23:59:59Z'),
      session('b', '2026-07-09T00:00:00Z'),
      session('a', '2026-07-07T00:00:00Z'),
    ]
    expect(pickRecencyWindow(sessions, cutoff).map((s) => s.id)).toEqual(['a', 'b'])
  })
  it('is not fooled by filename/id order — sorts purely on startedAt', () => {
    const sessions = [
      session('a-later', '2026-07-09T00:00:00Z'),
      session('z-earlier', '2026-07-08T00:00:00Z'),
    ]
    expect(pickRecencyWindow(sessions, cutoff).map((s) => s.id)).toEqual(['z-earlier', 'a-later'])
  })
  it('keeps a session that started before the cutoff but ended after it', () => {
    const sessions = [
      session('long', '2026-07-05T00:00:00Z', { endedAt: '2026-07-08T00:00:00Z' }),
      session('done', '2026-07-05T00:00:00Z', { endedAt: '2026-07-06T00:00:00Z' }),
    ]
    expect(pickRecencyWindow(sessions, cutoff).map((s) => s.id)).toEqual(['long'])
  })
  it('breaks ties on id for a stable, deterministic order', () => {
    const sessions = [
      session('b', '2026-07-09T00:00:00Z'),
      session('a', '2026-07-09T00:00:00Z'),
    ]
    expect(pickRecencyWindow(sessions, cutoff).map((s) => s.id)).toEqual(['a', 'b'])
  })
})

describe('toTriageSession()', () => {
  it('carries id/file plus every triage-essential field', () => {
    const raw = {
      session: 'session_abc',
      startedAt: '2026-07-04T12:00:00Z',
      endedAt: '2026-07-04T13:00:00Z',
      goal: 'fix the thing',
      outcome: 'PR',
      summary: 'ran the thing',
      trigger: 'frictions-to-fixes',
      prs: [187],
      docsRead: [{ path: 'docs/adr/0009-session-logs.md', reason: 'checked the schema' }],
      subagents: [{ type: 'general-purpose', task: 'Survey frictions', model: 'sonnet' }],
      frictions: [
        { description: '  a   stale  claim  ', solution: 'fix it', severity: 'minor' },
      ],
    }
    expect(toTriageSession(raw, 'path/to/file.yml')).toEqual({
      id: 'session_abc',
      file: 'path/to/file.yml',
      startedAt: '2026-07-04T12:00:00Z',
      endedAt: '2026-07-04T13:00:00Z',
      goal: 'fix the thing',
      outcome: 'PR',
      summary: 'ran the thing',
      trigger: 'frictions-to-fixes',
      prs: ['187'],
      docsRead: [{ path: 'docs/adr/0009-session-logs.md', reason: 'checked the schema' }],
      subagents: [{ type: 'general-purpose', task: 'Survey frictions', model: 'sonnet' }],
      frictions: [{ index: 0, description: 'a stale claim', solution: 'fix it', severity: 'minor' }],
    })
  })
  it('collapses session-log docsRead entries into one count', () => {
    const dir = 'layers/journal/content/current/sessions/'
    const raw = {
      docsRead: [
        { path: `${dir}a.yml`, reason: 'audit' },
        { path: 'docs/adr/0009-session-logs.md', reason: 'schema' },
        { path: `${dir}b.yml`, reason: 'audit' },
      ],
    }
    expect(toTriageSession(raw, 'f.yml').docsRead).toEqual([
      { path: 'docs/adr/0009-session-logs.md', reason: 'schema' },
      { path: '2 session logs', reason: '' },
    ])
  })
  it('defaults missing fields instead of throwing', () => {
    expect(toTriageSession({}, 'f.yml')).toEqual({
      id: '',
      file: 'f.yml',
      startedAt: '',
      endedAt: '',
      goal: '',
      outcome: '',
      summary: '',
      trigger: '',
      prs: [],
      docsRead: [],
      subagents: [],
      frictions: [],
    })
  })
})

describe('formatCompact()', () => {
  it('prints one line per session and counts repeated subagents', () => {
    const many = session('session_a', '2026-07-04T12:00:00Z', { subagents: [{ type: 'impl', task: 'x' }, { type: 'impl', task: 'y' }, { type: 'review', model: 'opus' }] })
    const compact = toCompactSession(many)
    expect(compact.subagents).toEqual([{ type: 'impl', count: 2 }, { type: 'review', model: 'opus', count: 1 }])
    const out = formatCompact([compact, compact])
    expect(out.split('\n')).toHaveLength(4)
    expect(JSON.parse(out)).toHaveLength(2)
  })
})

describe('toCompactSession()', () => {
  it('keeps id/file/startedAt/prs, docsRead paths, subagents and only index/description/severity per friction', () => {
    const s = session('session_abc', '2026-07-04T12:00:00Z', {
      goal: 'fix the thing',
      outcome: 'PR',
      summary: 'ran the thing',
      trigger: 'frictions-to-fixes',
      prs: ['187'],
      docsRead: [{ path: 'docs/a.md', reason: 'why' }],
      subagents: [{ type: 'impl' }],
      frictions: [{ index: 3, description: 'a stale claim', solution: 'fix it', severity: 'minor' }],
    })
    expect(toCompactSession(s)).toEqual({
      id: 'session_abc',
      file: s.file,
      startedAt: '2026-07-04T12:00:00Z',
      prs: ['187'],
      docsRead: ['docs/a.md'],
      subagents: [{ type: 'impl', count: 1 }],
      frictions: [{ index: 3, description: 'a stale claim', severity: 'minor' }],
    })
  })
})

describe('resolveOutputTarget() — --out CLI flag', () => {
  it('keeps default behavior unchanged when --out is omitted', () => {
    expect(resolveOutputTarget([], 10)).toBeNull()
    expect(resolveOutputTarget([], 30_000)).toBe(OUTPUT_FILE_PATH)
  })
  it('lands the output at the given path when --out is provided, regardless of size', () => {
    expect(resolveOutputTarget(['--out', '/scratch/out.json'], 10)).toBe('/scratch/out.json')
    expect(resolveOutputTarget(['--days', '5', '--out', '/scratch/out.json'], 30_000)).toBe('/scratch/out.json')
  })
})

describe('survey() — external exclusion (ADR-0009)', () => {
  let dir: string

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'session-frictions-'))
    mkdirSync(join(dir, SESSIONS_DIR), { recursive: true })
  })
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true })
  })

  function writeLog(name: string, yaml: string): void {
    writeFileSync(join(dir, SESSIONS_DIR, name), yaml)
  }

  it('excludes an external session from the frictions survey but keeps internal ones', () => {
    writeLog(
      'internal.yml',
      'session: session_internal\nstartedAt: 2026-07-20T00:00:00Z\ngoal: internal work\noutcome: done\nfrictions:\n  - description: an internal friction\n    solution: fix it\n    severity: major\n',
    )
    writeLog(
      'external.yml',
      'session: session_external\nstartedAt: 2026-07-21T00:00:00Z\nexternal: true\ngoal: external work\noutcome: done\nfrictions:\n  - description: a toolchain friction\n    solution: n/a\n    severity: blocker\n',
    )

    const ids = survey(Date.parse('2026-07-19T00:00:00Z'), dir).sessions.map((s) => s.id)
    expect(ids).toEqual(['session_internal'])
  })

  it('reads archived logs inside the window too', () => {
    mkdirSync(join(dir, ARCHIVED_SESSIONS_DIR), { recursive: true })
    writeFileSync(
      join(dir, ARCHIVED_SESSIONS_DIR, 'archived.yml'),
      'session: session_archived\nstartedAt: 2026-07-20T00:00:00Z\ngoal: g\noutcome: o\nfrictions: []\n',
    )
    const ids = survey(Date.parse('2026-07-19T00:00:00Z'), dir).sessions.map((s) => s.id)
    expect(ids).toEqual(['session_archived'])
  })

  it('by default starts 48 hours before the last ledger commit', () => {
    const env = { ...process.env, GIT_AUTHOR_DATE: '2026-07-10T00:00:00Z', GIT_COMMITTER_DATE: '2026-07-10T00:00:00Z' }
    const git = (...args: string[]): void => {
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-c', 'core.hooksPath=/dev/null', ...args], { cwd: dir, env, stdio: 'ignore' })
    }
    mkdirSync(join(dir, 'layers/journal/content/current/frictions'), { recursive: true })
    writeFileSync(join(dir, 'layers/journal/content/current/frictions/x.yml'), 'name: x\n')
    git('init', '-q')
    git('add', '.')
    git('commit', '-q', '-m', 'ledger')
    const { since } = survey(undefined, dir, Date.parse('2026-07-20T00:00:00Z'))
    expect(new Date(since).toISOString()).toBe('2026-07-08T00:00:00.000Z')
  })

  it('by default starts 48 hours before now when no ledger commit is visible', () => {
    const { since } = survey(undefined, dir, Date.parse('2026-07-20T00:00:00Z'))
    expect(new Date(since).toISOString()).toBe('2026-07-18T00:00:00.000Z')
  })
})

describe('dropLedgered() — --unledgered', () => {
  it('drops the frictions the ledger carries, keeping their index, and sessions with none left', () => {
    const dir = mkdtempSync(join(tmpdir(), 'session-frictions-'))
    mkdirSync(join(dir, 'layers/journal/content/current/frictions'), { recursive: true })
    writeFileSync(join(dir, 'layers/journal/content/current/frictions/x.yml'), 'name: x\noccurrences:\n  - session: session_a\n    description: "gate ran twice"\n')
    const mk = (id: string, ...descriptions: string[]) => toTriageSession({ session: id, frictions: descriptions.map((description) => ({ description })) }, `${id}.yml`)
    const left = dropLedgered([mk('session_a', 'gate   ran twice', 'push failed'), mk('session_b'), mk('session_c', 'gate ran twice')], dir)
    expect(left.map((s) => [s.id, s.frictions.map((f) => [f.index, f.description])])).toEqual([
      ['session_a', [[1, 'push failed']]],
      ['session_c', [[0, 'gate ran twice']]],
    ])
    rmSync(dir, { recursive: true, force: true })
  })
})
