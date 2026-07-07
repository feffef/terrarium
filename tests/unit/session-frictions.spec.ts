// Unit tests for the session-frictions helper's pure core — the recency-window
// ordering and the raw-log → triage-record reduction where correctness bugs
// would hide. The FS IO is a thin shell over these and is exercised by running
// the `frictions-to-fixes` Skill.
import { describe, expect, it } from 'vitest'
import { pickRecencyWindow, toTriageSession, type TriageSession } from '../../scripts/session-frictions.ts'

function session(id: string, startedAt: string, opts: Partial<TriageSession> = {}): TriageSession {
  return {
    id,
    file: `tenants/journal/content/current/sessions/${id}.yml`,
    startedAt,
    kind: 'interactive',
    goal: 'g',
    status: 'completed',
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
      kind: 'interactive',
      goal: 'fix the thing',
      status: 'completed',
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
      kind: 'interactive',
      goal: 'fix the thing',
      status: 'completed',
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
      kind: '',
      goal: '',
      status: '',
      outcome: '',
      prs: [],
      frictions: [],
    })
  })
})
