// Unit tests for the list-open-issues helper's pure core — the pull-request
// filter and the newest-first/limit behavior. The `gh api` / REST `curl`
// shell is a thin wrapper over these, exercised by running the script
// directly (`tsx scripts/github/list-open-issues.ts`).
import { describe, expect, it } from 'vitest'
import { openIssues, parseArgs, toOpenIssue, type RawIssueApiRecord } from '../../scripts/github/list-open-issues.ts'

describe('toOpenIssue()', () => {
  it('maps a plain issue record to an OpenIssue, decoding the title', () => {
    const record: RawIssueApiRecord = {
      number: 494,
      title: 'list_issues &amp; search_issues overflow',
      labels: [{ name: 'needs-triage' }, 'enhancement'],
      updated_at: '2026-07-15T01:13:49Z',
    }
    expect(toOpenIssue(record)).toEqual({
      number: 494,
      title: 'list_issues & search_issues overflow',
      labels: ['needs-triage', 'enhancement'],
      updatedAt: '2026-07-15T01:13:49Z',
    })
  })
  it('returns null for a record that is actually a pull request', () => {
    const record: RawIssueApiRecord = {
      number: 319,
      title: 'Add scripts/git/list-recent-prs.ts',
      labels: [],
      updated_at: '2026-07-11T09:00:00Z',
      pull_request: { url: 'https://api.github.com/repos/feffef/terrarium/pulls/319' },
    }
    expect(toOpenIssue(record)).toBeNull()
  })
})

describe('openIssues()', () => {
  const records: RawIssueApiRecord[] = [
    { number: 1, title: 'oldest', labels: [], updated_at: '2026-07-11T09:00:00Z' },
    { number: 2, title: 'newest', labels: [], updated_at: '2026-07-11T12:00:00Z' },
    { number: 3, title: 'a pr', labels: [], updated_at: '2026-07-11T13:00:00Z', pull_request: {} },
    { number: 4, title: 'middle', labels: [], updated_at: '2026-07-11T10:00:00Z' },
  ]

  it('skips pull requests and sorts the rest newest-updated-first', () => {
    expect(openIssues(records)).toEqual([
      { number: 2, title: 'newest', labels: [], updatedAt: '2026-07-11T12:00:00Z' },
      { number: 4, title: 'middle', labels: [], updatedAt: '2026-07-11T10:00:00Z' },
      { number: 1, title: 'oldest', labels: [], updatedAt: '2026-07-11T09:00:00Z' },
    ])
  })

  it('respects the limit, keeping only the newest N', () => {
    expect(openIssues(records, 1)).toEqual([
      { number: 2, title: 'newest', labels: [], updatedAt: '2026-07-11T12:00:00Z' },
    ])
  })

  it('defaults to 50 when no limit is given', () => {
    expect(openIssues(records)).toHaveLength(3)
  })

  describe('with a label', () => {
    const labelled: RawIssueApiRecord[] = [
      { number: 10, title: 'newest, unlabelled', labels: [], updated_at: '2026-07-11T12:00:00Z' },
      { number: 11, title: 'bugfix only', labels: [{ name: 'bugfix' }], updated_at: '2026-07-11T11:00:00Z' },
      { number: 12, title: 'bug', labels: [{ name: 'Bug' }, 'ui'], updated_at: '2026-07-11T10:00:00Z' },
      { number: 13, title: 'older bug', labels: ['bug'], updated_at: '2026-07-11T09:00:00Z' },
    ]

    it('matches the label exactly and case-insensitively, never as a substring', () => {
      expect(openIssues(labelled, 50, 'BUG').map((i) => i.number)).toEqual([12, 13])
    })

    it('filters before the cap, so a newer unlabelled issue does not use up the limit', () => {
      expect(openIssues(labelled, 1, 'bug').map((i) => i.number)).toEqual([12])
    })
  })
})

describe('parseArgs()', () => {
  it('defaults to open issues, limit 50', () => {
    expect(parseArgs([])).toEqual({ state: 'open', limit: 50 })
  })
  it('--closed selects closed issues, in any position beside the limit', () => {
    expect(parseArgs(['--closed'])).toEqual({ state: 'closed', limit: 50 })
    expect(parseArgs(['20', '--closed'])).toEqual({ state: 'closed', limit: 20 })
    expect(parseArgs(['--closed', '20'])).toEqual({ state: 'closed', limit: 20 })
  })
  it('--label takes its value in any position beside the limit and --closed', () => {
    const want = { state: 'closed', limit: 20, label: 'bug' }
    expect(parseArgs(['--label', 'bug', '20', '--closed'])).toEqual(want)
    expect(parseArgs(['20', '--closed', '--label', 'bug'])).toEqual(want)
    expect(parseArgs(['--closed', '--label', 'bug', '20'])).toEqual(want)
    expect(parseArgs(['--label', '20'])).toEqual({ state: 'open', limit: 50, label: '20' })
  })
  it('rejects --label without a value', () => {
    expect(() => parseArgs(['--label'])).toThrow('--label needs a value')
    expect(() => parseArgs(['--label', '--closed'])).toThrow('--label needs a value')
    expect(() => parseArgs(['--label', ''])).toThrow('--label needs a value')
  })
  it('rejects a non-positive limit', () => {
    expect(() => parseArgs(['0'])).toThrow('not a positive integer: 0')
  })
})
