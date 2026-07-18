// Unit tests for the list-open-issues helper's pure core — HTML-entity
// decoding, the pull-request filter, the newest-first/limit behavior,
// owner/repo parsing off a git remote URL, and the shared `gh`/`rest`
// fetch-strategy decision (`pickFetchStrategy`, `parseNextLink`) this module is
// the single home for (issue #505). The `gh api` / REST `curl` shell is a thin
// wrapper over these, exercised by running the script directly
// (`tsx scripts/list-open-issues.ts`).
import { describe, expect, it } from 'vitest'
import {
  decodeHtmlEntities,
  openIssues,
  parseNextLink,
  parseOwnerRepo,
  pickFetchStrategy,
  toOpenIssue,
  type RawIssueApiRecord,
} from '../../scripts/list-open-issues.ts'

describe('decodeHtmlEntities()', () => {
  it('decodes the entities GitHub actually emits', () => {
    expect(decodeHtmlEntities('Tools &amp; tests')).toBe('Tools & tests')
    expect(decodeHtmlEntities('&lt;script&gt;')).toBe('<script>')
    expect(decodeHtmlEntities('say &quot;hi&quot;')).toBe('say "hi"')
    expect(decodeHtmlEntities('&#34;quoted&#34;')).toBe('"quoted"')
    expect(decodeHtmlEntities("it&#39;s")).toBe("it's")
  })
  it('leaves plain text untouched', () => {
    expect(decodeHtmlEntities('no entities here')).toBe('no entities here')
  })
})

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
      title: 'Add scripts/recent-prs.ts',
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

describe('parseOwnerRepo()', () => {
  it('parses an SSH remote URL', () => {
    expect(parseOwnerRepo('git@github.com:feffef/terrarium.git')).toEqual({
      owner: 'feffef',
      repo: 'terrarium',
    })
  })
  it('parses an HTTPS remote URL', () => {
    expect(parseOwnerRepo('https://github.com/feffef/terrarium.git')).toEqual({
      owner: 'feffef',
      repo: 'terrarium',
    })
  })
  it('parses this environment\'s proxied remote URL', () => {
    expect(parseOwnerRepo('http://local_proxy@127.0.0.1:41729/git/feffef/terrarium')).toEqual({
      owner: 'feffef',
      repo: 'terrarium',
    })
  })
  it('returns null when there are not enough path segments', () => {
    expect(parseOwnerRepo('terrarium')).toBeNull()
  })
})

describe('pickFetchStrategy()', () => {
  it('prefers gh when the binary is present, regardless of token', () => {
    expect(pickFetchStrategy(true, true)).toBe('gh')
    expect(pickFetchStrategy(true, false)).toBe('gh')
  })
  it('falls back to rest when gh is absent but a token is available (issue #505)', () => {
    expect(pickFetchStrategy(false, true)).toBe('rest')
  })
  it('returns null when neither is available', () => {
    expect(pickFetchStrategy(false, false)).toBeNull()
  })
})

describe('parseNextLink()', () => {
  it('extracts the rel="next" URL from a GitHub Link header', () => {
    const header =
      '<https://api.github.com/repos/x/y/issues?page=2>; rel="next", <https://api.github.com/repos/x/y/issues?page=5>; rel="last"'
    expect(parseNextLink(header)).toBe('https://api.github.com/repos/x/y/issues?page=2')
  })
  it('returns null when there is no next link (last page)', () => {
    const header = '<https://api.github.com/repos/x/y/issues?page=1>; rel="prev"'
    expect(parseNextLink(header)).toBeNull()
  })
  it('returns null for a null header', () => {
    expect(parseNextLink(null)).toBeNull()
  })
})
