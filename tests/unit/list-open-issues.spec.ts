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
  it('carries a closed issue\'s close reason and leaves an open one without', () => {
    const base = { number: 7, title: 't', labels: [], updated_at: '2026-07-11T09:00:00Z' }
    expect(toOpenIssue({ ...base, state_reason: 'not_planned' })?.stateReason).toBe('not_planned')
    expect(toOpenIssue({ ...base, state_reason: null })).not.toHaveProperty('stateReason')
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
  it('rejects a non-positive limit', () => {
    expect(() => parseArgs(['0'])).toThrow('not a positive integer: 0')
  })
})
