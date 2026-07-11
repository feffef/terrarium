// Unit tests for the recent-prs helper's pure core — PR-number parsing,
// title extraction (with its subject-line fallback), the merge-commit
// filter, and the newest-first/limit behavior — where correctness bugs
// would hide. The git shell is a thin wrapper over these, exercised by
// running the script directly (`tsx scripts/recent-prs.ts`).
import { describe, expect, it } from 'vitest'
import {
  extractTitle,
  parsePrNumber,
  recentPrs,
  toRecentPr,
  type RawMergeCommit,
} from '../../scripts/recent-prs.ts'

describe('parsePrNumber()', () => {
  it('extracts the PR number from a standard GitHub merge-commit subject', () => {
    expect(parsePrNumber('Merge pull request #312 from feffef/journal/audit-docs-adr0010-schedule-2026-07-11')).toBe(312)
  })
  it('returns null for a direct branch merge (not a PR merge)', () => {
    expect(parsePrNumber('Merge branch "hotfix" into main')).toBeNull()
  })
  it('returns null for an ordinary direct/squash commit', () => {
    expect(parsePrNumber('fix: patch bug')).toBeNull()
    expect(parsePrNumber('journal(sessions): log session-x')).toBeNull()
  })
})

describe('extractTitle()', () => {
  it('prefers the first line of the commit body when present', () => {
    expect(extractTitle('Merge pull request #312 from feffef/foo', "adr-0010: stop restating the digest Skill's schedule cadence")).toBe(
      "adr-0010: stop restating the digest Skill's schedule cadence",
    )
  })
  it('takes only the first line when the body has more than one', () => {
    expect(extractTitle('Merge pull request #312 from feffef/foo', 'first line\nsecond line')).toBe('first line')
  })
  it('falls back to the subject line when the body is empty', () => {
    expect(extractTitle('Merge pull request #312 from feffef/foo', '')).toBe('Merge pull request #312 from feffef/foo')
  })
  it('falls back to the subject line when the body is only whitespace', () => {
    expect(extractTitle('Merge pull request #312 from feffef/foo', '   \n  ')).toBe('Merge pull request #312 from feffef/foo')
  })
})

describe('toRecentPr()', () => {
  it('builds a RecentPr for a PR-merge commit, UTC-normalizing the time', () => {
    const commit: RawMergeCommit = {
      hash: 'h1',
      isoCommitTime: '2026-07-11T09:00:00+02:00',
      subject: 'Merge pull request #312 from feffef/foo',
      body: 'adr-0010: stop restating the digest Skill\'s schedule cadence',
    }
    expect(toRecentPr(commit)).toEqual({
      number: 312,
      title: "adr-0010: stop restating the digest Skill's schedule cadence",
      mergedAtUtc: '2026-07-11T07:00:00.000Z',
    })
  })
  it('returns null for a non-PR-merge commit', () => {
    const commit: RawMergeCommit = {
      hash: 'h2',
      isoCommitTime: '2026-07-11T09:00:00Z',
      subject: 'fix: patch bug',
      body: '',
    }
    expect(toRecentPr(commit)).toBeNull()
  })
})

describe('recentPrs()', () => {
  const commits: RawMergeCommit[] = [
    { hash: 'h1', isoCommitTime: '2026-07-11T09:00:00Z', subject: 'Merge pull request #312 from feffef/foo', body: 'third-newest title' },
    { hash: 'h2', isoCommitTime: '2026-07-11T11:00:00Z', subject: 'Merge pull request #310 from feffef/bar', body: 'newest title' },
    { hash: 'h3', isoCommitTime: '2026-07-11T05:00:00Z', subject: 'journal(sessions): log session-x', body: '' },
    { hash: 'h4', isoCommitTime: '2026-07-11T10:00:00Z', subject: 'Merge pull request #308 from feffef/baz', body: 'second-newest title' },
    { hash: 'h5', isoCommitTime: '2026-07-11T12:00:00Z', subject: 'Merge branch "hotfix" into main', body: '' },
  ]

  it('skips non-PR-merge commits and sorts the rest newest-first', () => {
    expect(recentPrs(commits)).toEqual([
      { number: 310, title: 'newest title', mergedAtUtc: '2026-07-11T11:00:00.000Z' },
      { number: 308, title: 'second-newest title', mergedAtUtc: '2026-07-11T10:00:00.000Z' },
      { number: 312, title: 'third-newest title', mergedAtUtc: '2026-07-11T09:00:00.000Z' },
    ])
  })

  it('respects the limit, keeping only the newest N', () => {
    expect(recentPrs(commits, 2)).toEqual([
      { number: 310, title: 'newest title', mergedAtUtc: '2026-07-11T11:00:00.000Z' },
      { number: 308, title: 'second-newest title', mergedAtUtc: '2026-07-11T10:00:00.000Z' },
    ])
  })

  it('defaults to 20 when no limit is given', () => {
    expect(recentPrs(commits)).toHaveLength(3)
  })
})
