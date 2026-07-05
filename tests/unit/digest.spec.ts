// Unit tests for the digest helper's pure core (ADR-0010) — the UTC-boundary,
// day-attribution, PR-parsing and rollup logic where correctness bugs would hide.
// The git/FS IO is a thin shell over these and is exercised by running the Skill.
import { describe, expect, it } from 'vitest'
import {
  buildDayMaterials,
  closedUndigestedDays,
  dayIsClosed,
  prFromCommit,
  utcDay,
  type Commit,
  type SessionMaterial,
} from '../../scripts/digest.ts'

function commit(subject: string, opts: Partial<Commit> = {}): Commit {
  return { sha: 'abc', at: new Date('2026-07-04T12:00:00Z'), subject, body: '', isMerge: false, ...opts }
}

describe('utcDay()', () => {
  it('is the UTC calendar day, regardless of time', () => {
    expect(utcDay(new Date('2026-07-04T23:59:59Z'))).toBe('2026-07-04')
    expect(utcDay(new Date('2026-07-05T00:00:00Z'))).toBe('2026-07-05')
  })
})

describe('dayIsClosed()', () => {
  const now = new Date('2026-07-05T09:38:00Z')
  it('a past day is closed', () => {
    expect(dayIsClosed('2026-07-04', now)).toBe(true)
  })
  it('today is never closed (still open until its midnight passes)', () => {
    expect(dayIsClosed('2026-07-05', now)).toBe(false)
  })
  it('a future day is not closed', () => {
    expect(dayIsClosed('2026-07-06', now)).toBe(false)
  })
  it('closes exactly at the next midnight UTC, not before', () => {
    expect(dayIsClosed('2026-07-05', new Date('2026-07-05T23:59:59Z'))).toBe(false)
    expect(dayIsClosed('2026-07-05', new Date('2026-07-06T00:00:00Z'))).toBe(true)
  })
})

describe('prFromCommit()', () => {
  it('reads a GitHub merge commit, taking the title from the first body line', () => {
    const c = commit('Merge pull request #22 from feffef/branch', {
      body: '\ntest(routing): extract the resolver\n',
      isMerge: true,
    })
    expect(prFromCommit(c)).toEqual({ number: 22, title: 'test(routing): extract the resolver' })
  })
  it('falls back to the subject when a merge commit has no body', () => {
    const c = commit('Merge pull request #7 from x/y', { isMerge: true })
    expect(prFromCommit(c)).toEqual({ number: 7, title: 'Merge pull request #7 from x/y' })
  })
  it('reads a squash-merge subject and strips the (#N)', () => {
    expect(prFromCommit(commit('feat: add digests (#23)'))).toEqual({
      number: 23,
      title: 'feat: add digests',
    })
  })
  it('returns null for an ordinary commit', () => {
    expect(prFromCommit(commit('docs: tidy CONTEXT.md'))).toBeNull()
  })
})

describe('buildDayMaterials()', () => {
  const commits: Commit[] = [
    commit('Merge pull request #22 from x/y', { body: 'route resolver tests', isMerge: true }),
    commit('journal(sessions): log 2026-07-04-session_abc'), // a session log — not shipped work
    commit('docs: fix a stale reference'),
    commit('Merge branch main', { isMerge: true }), // merge without a PR ref — noise
  ]
  const sessions: SessionMaterial[] = [
    {
      session: 's1', kind: 'interactive', goal: 'ship X', outcome: 'done', status: 'completed',
      prs: [22],
      frictions: [
        { severity: 'nit', description: 'a' },
        { severity: 'minor', description: 'b' },
      ],
    },
    {
      session: 's2', kind: 'interactive', goal: 'ship Y', outcome: 'done', status: 'completed',
      prs: [], frictions: [{ severity: 'nit', description: 'c' }],
    },
  ]
  const m = buildDayMaterials('2026-07-04', commits, sessions)

  it('pulls PRs out of merge/squash commits', () => {
    expect(m.prs).toEqual([{ number: 22, title: 'route resolver tests' }])
  })
  it('keeps direct work but drops session-log commits and ref-less merges from otherCommits', () => {
    expect(m.otherCommits).toEqual(['docs: fix a stale reference'])
  })
  it('rolls up frictions by severity across the day’s sessions', () => {
    expect(m.rollup.frictionsBySeverity).toEqual({ nit: 2, minor: 1 })
  })
  it('counts prs, commits and sessions', () => {
    expect(m.rollup).toMatchObject({ prsMerged: 1, commits: 4, sessions: 2 })
  })
})

describe('closedUndigestedDays()', () => {
  const now = new Date('2026-07-06T00:00:00Z')
  it('keeps only closed days that lack a digest, oldest first, deduped', () => {
    const active = ['2026-07-04', '2026-07-04', '2026-07-05', '2026-07-06']
    const existing = new Set(['2026-07-04'])
    // 07-04 already digested; 07-06 is today (not closed) → only 07-05 remains.
    expect(closedUndigestedDays(active, existing, now)).toEqual(['2026-07-05'])
  })
  it('is empty when nothing is both closed and undigested', () => {
    expect(closedUndigestedDays(['2026-07-06'], new Set(), now)).toEqual([])
  })
})
