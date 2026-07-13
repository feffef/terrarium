// Unit tests for the merged-since helper's pure core — the after-instant
// filter, the UTC normalization, and the isMerge classification, where
// correctness bugs would hide. The git shell is a thin wrapper over these,
// exercised by running the script directly (`tsx scripts/merged-since.ts`).
import { describe, expect, it } from 'vitest'
import { isMergeSubject, mergedSince, toUtcIso, type RawCommit } from '../../scripts/merged-since.ts'

const commits: RawCommit[] = [
  // Strictly after the instant (13:14 UTC after normalization) — a PR merge.
  { hash: 'h1', isoCommitTime: '2026-07-07T17:14:00+00:00', subject: 'Merge pull request #204 from feffef/guardrail-fix' },
  // Exactly at the instant — must be EXCLUDED ("strictly after", not "on or after").
  { hash: 'h2', isoCommitTime: '2026-07-07T15:16:00Z', subject: 'journal(sessions): log session-x' },
  // After the instant, given in a LOCAL OFFSET (+02:00) — must normalize to UTC (17:00Z).
  { hash: 'h3', isoCommitTime: '2026-07-07T19:00:00+02:00', subject: 'Merge branch "hotfix" into main' },
  // After the instant, an ordinary direct commit (not a merge).
  { hash: 'h5', isoCommitTime: '2026-07-07T16:00:00Z', subject: 'fix: patch bug' },
  // Well before the instant — must be excluded.
  { hash: 'h4', isoCommitTime: '2026-07-06T09:00:00Z', subject: 'fix: unrelated' },
]

const SINCE = '2026-07-07T15:16:00Z'

describe('mergedSince() — single instant (issue #412 backward-compat path)', () => {
  it('keeps only commits strictly after the instant, UTC-normalized, newest-first', () => {
    expect(mergedSince(commits, [SINCE])).toEqual([
      { hash: 'h1', isoCommitTime: '2026-07-07T17:14:00.000Z', subject: 'Merge pull request #204 from feffef/guardrail-fix', isMerge: true, afterAll: [SINCE] },
      { hash: 'h3', isoCommitTime: '2026-07-07T17:00:00.000Z', subject: 'Merge branch "hotfix" into main', isMerge: true, afterAll: [SINCE] },
      { hash: 'h5', isoCommitTime: '2026-07-07T16:00:00.000Z', subject: 'fix: patch bug', isMerge: false, afterAll: [SINCE] },
    ])
  })

  it('excludes a commit exactly at the instant (strictly after, not on-or-after)', () => {
    const hashes = mergedSince(commits, [SINCE]).map((c) => c.hash)
    expect(hashes).not.toContain('h2')
  })

  it('normalizes a local-offset commit time to UTC "Z" form', () => {
    const h3 = mergedSince(commits, [SINCE]).find((c) => c.hash === 'h3')
    expect(h3?.isoCommitTime).toBe('2026-07-07T17:00:00.000Z')
    expect(h3?.isoCommitTime.endsWith('Z')).toBe(true)
  })

  it('returns nothing when every commit is at or before the instant', () => {
    expect(mergedSince(commits, ['2026-07-07T17:14:00.000Z'])).toEqual([])
  })
})

describe('mergedSince() — multiple instants (issue #412)', () => {
  // Two candidate friction timestamps: EARLY catches h1/h3/h5; LATE (between
  // h5 and h3) catches only h1/h3.
  const EARLY = SINCE // 2026-07-07T15:16:00Z
  const LATE = '2026-07-07T16:30:00Z'

  it('returns the union across instants, not the intersection', () => {
    const hashes = mergedSince(commits, [EARLY, LATE]).map((c) => c.hash)
    expect(hashes).toEqual(['h1', 'h3', 'h5'])
  })

  it("annotates each commit with the subset of instants it's strictly after", () => {
    const byHash = Object.fromEntries(mergedSince(commits, [EARLY, LATE]).map((c) => [c.hash, c.afterAll]))
    expect(byHash.h1).toEqual([EARLY, LATE]) // 17:14Z — after both
    expect(byHash.h3).toEqual([EARLY, LATE]) // 17:00Z — after both
    expect(byHash.h5).toEqual([EARLY]) // 16:00Z — after EARLY only (before LATE)
  })

  it('excludes a commit that is at-or-before every given instant', () => {
    const hashes = mergedSince(commits, [EARLY, LATE]).map((c) => c.hash)
    expect(hashes).not.toContain('h2')
    expect(hashes).not.toContain('h4')
  })

  it('stays newest-first regardless of instant order', () => {
    const hashes = mergedSince(commits, [LATE, EARLY]).map((c) => c.hash)
    expect(hashes).toEqual(['h1', 'h3', 'h5'])
  })
})

describe('isMergeSubject()', () => {
  it('flags a PR merge commit', () => {
    expect(isMergeSubject('Merge pull request #204 from feffef/guardrail-fix')).toBe(true)
  })
  it('flags a direct branch merge commit', () => {
    expect(isMergeSubject('Merge branch "hotfix" into main')).toBe(true)
  })
  it('does not flag an ordinary direct commit', () => {
    expect(isMergeSubject('journal(sessions): log session-x')).toBe(false)
    expect(isMergeSubject('fix: patch bug')).toBe(false)
  })
})

describe('toUtcIso()', () => {
  it('normalizes a local-offset instant to UTC', () => {
    expect(toUtcIso('2026-07-07T19:00:00+02:00')).toBe('2026-07-07T17:00:00.000Z')
  })
  it('leaves an already-UTC instant equivalent', () => {
    expect(toUtcIso('2026-07-07T17:00:00Z')).toBe('2026-07-07T17:00:00.000Z')
  })
})
