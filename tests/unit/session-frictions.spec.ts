// Unit tests for the session-frictions helper's pure core — the recency-window
// ordering and the raw-log → triage-record reduction where correctness bugs
// would hide. The FS IO is a thin shell over these and is exercised by running
// the `frictions-to-fixes` Skill.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { pickRecencyWindow, SESSIONS_DIR, survey, toTriageSession, type TriageSession } from '../../scripts/session-frictions.ts'

function session(id: string, startedAt: string, opts: Partial<TriageSession> = {}): TriageSession {
  return {
    id,
    file: `layers/journal/content/current/sessions/${id}.yml`,
    startedAt,
    goal: 'g',
    outcome: 'o',
    prs: [],
    frictions: [],
    ...opts,
  }
}

describe('pickRecencyWindow()', () => {
  it('keeps the newest n by startedAt, oldest-of-the-window first', () => {
    const sessions = [
      session('a', '2026-07-01T00:00:00Z'),
      session('b', '2026-07-03T00:00:00Z'),
      session('c', '2026-07-02T00:00:00Z'),
    ]
    expect(pickRecencyWindow(sessions, 2).map((s) => s.id)).toEqual(['c', 'b'])
  })
  it('is not fooled by filename/id order — sorts purely on startedAt', () => {
    const sessions = [
      session('z-earlier', '2026-07-01T00:00:00Z'),
      session('a-later', '2026-07-02T00:00:00Z'),
    ]
    expect(pickRecencyWindow(sessions, 1).map((s) => s.id)).toEqual(['a-later'])
  })
  it('breaks ties on id for a stable, deterministic order', () => {
    const sessions = [
      session('b', '2026-07-01T00:00:00Z'),
      session('a', '2026-07-01T00:00:00Z'),
    ]
    expect(pickRecencyWindow(sessions, 2).map((s) => s.id)).toEqual(['a', 'b'])
  })
  it('returns everything, in order, when n exceeds the count', () => {
    const sessions = [session('a', '2026-07-01T00:00:00Z')]
    expect(pickRecencyWindow(sessions, 20).map((s) => s.id)).toEqual(['a'])
  })
})

describe('toTriageSession()', () => {
  it('carries id/file plus every triage-essential field', () => {
    const raw = {
      session: 'session_abc',
      startedAt: '2026-07-04T12:00:00Z',
      goal: 'fix the thing',
      outcome: 'PR',
      prs: [187],
      frictions: [
        { description: '  a   stale  claim  ', solution: 'fix it', severity: 'minor' },
      ],
    }
    expect(toTriageSession(raw, 'path/to/file.yml')).toEqual({
      id: 'session_abc',
      file: 'path/to/file.yml',
      startedAt: '2026-07-04T12:00:00Z',
      goal: 'fix the thing',
      outcome: 'PR',
      prs: ['187'],
      frictions: [{ description: 'a stale claim', solution: 'fix it', severity: 'minor' }],
    })
  })
  it('defaults missing fields instead of throwing', () => {
    expect(toTriageSession({}, 'f.yml')).toEqual({
      id: '',
      file: 'f.yml',
      startedAt: '',
      goal: '',
      outcome: '',
      prs: [],
      frictions: [],
    })
  })
})

describe('survey() — external exclusion (ADR-0009 amendment)', () => {
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

    const ids = survey(20, dir).map((s) => s.id)
    expect(ids).toEqual(['session_internal'])
  })
})
