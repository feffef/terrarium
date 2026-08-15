// Unit tests for the conflicting-issue cross-check's pure core (issue #798):
// the deletion-keyword matcher, the file-path mention check, the per-issue
// hit finder, and the raw-record screen — plus the page walker (issue #848),
// driven by a fixture fetcher so no request leaves the test. The `gh api`/REST
// transport and the `git diff` shell are thin wrappers over these, not
// exercised here — same split `check-triage-drift.spec.ts` uses for its sibling
// script. The shared `gh`/`rest` strategy decision (`pickFetchStrategy`,
// `parseNextLink`) is single-homed in `list-open-issues.ts` (issue #505) and
// tested there.
import { describe, expect, it } from 'vitest'
import {
  bodyMentionsFilePath,
  DELETION_KEYWORDS,
  findAllConflictHits,
  findClosingIssueNumbers,
  findConflictHits,
  findDeletionKeywords,
  parseChangedFileList,
  toConflictCandidateIssue,
  walkPagesByNumber,
  type ConflictCandidateIssue,
  type RawConflictIssue,
  type RestPage,
} from '../../scripts/check-conflicting-issues.ts'

// The motivating case from issue #798: issue #784 instructs deleting
// `SESSION_TRAILER_GLOBAL` as unused, while PR #789 repurposes it.
const ISSUE_784_BODY =
  '`SESSION_TRAILER_GLOBAL` in `shared/session-trailer.ts` is unused now that ' +
  'the per-model trailer landed. Delete it and its call sites.'

describe('findDeletionKeywords()', () => {
  it('finds "delete" and "unused" in issue #784\'s real body', () => {
    expect(findDeletionKeywords(ISSUE_784_BODY)).toEqual(
      expect.arrayContaining(['delete', 'unused']),
    )
  })
  it('is case-insensitive', () => {
    expect(findDeletionKeywords('REMOVE this constant, it is dead code.')).toEqual(['remove'])
  })
  it('matches "no longer needed"', () => {
    expect(findDeletionKeywords('This helper is no longer needed.')).toEqual(['no longer needed'])
  })
  it('returns every matched keyword, not just the first', () => {
    expect(findDeletionKeywords('Please delete and remove this unused helper, no longer needed.')).toEqual([
      'delete',
      'remove',
      'unused',
      'no longer needed',
    ])
  })
  it('returns an empty array when no keyword is present', () => {
    expect(findDeletionKeywords('This adds a new helper for the digest pipeline.')).toEqual([])
  })
  it('matches every keyword in DELETION_KEYWORDS, not a hardcoded subset', () => {
    for (const keyword of DELETION_KEYWORDS) {
      expect(findDeletionKeywords(`... ${keyword} ...`)).toContain(keyword)
    }
  })
})

describe('findClosingIssueNumbers()', () => {
  it('finds a single "Closes #N" reference (issue #967\'s motivating case)', () => {
    expect(findClosingIssueNumbers('This PR fixes the bug.\n\nCloses #967')).toEqual(new Set([967]))
  })
  it('is case-insensitive on the keyword', () => {
    expect(findClosingIssueNumbers('closes #12')).toEqual(new Set([12]))
    expect(findClosingIssueNumbers('CLOSES #12')).toEqual(new Set([12]))
  })
  it('matches every GitHub auto-close keyword form', () => {
    for (const keyword of ['close', 'closes', 'closed', 'fix', 'fixes', 'fixed', 'resolve', 'resolves', 'resolved']) {
      expect(findClosingIssueNumbers(`${keyword} #1`)).toEqual(new Set([1]))
    }
  })
  it('matches a colon variant ("Closes: #N")', () => {
    expect(findClosingIssueNumbers('Closes: #42')).toEqual(new Set([42]))
  })
  it('matches multiple comma- and "and"-separated references after one keyword', () => {
    expect(findClosingIssueNumbers('Fixes #1, #2 and #3')).toEqual(new Set([1, 2, 3]))
  })
  it('does not match a keyword embedded in a larger word', () => {
    expect(findClosingIssueNumbers('This is enclosed and prefixed weirdly #99')).toEqual(new Set())
  })
  it('does not match a bare #N with no closing keyword nearby', () => {
    expect(findClosingIssueNumbers('See #99 for background.')).toEqual(new Set())
  })
  it('returns an empty set for a body with no closing references', () => {
    expect(findClosingIssueNumbers('Just an ordinary PR description.')).toEqual(new Set())
  })
  it('returns an empty set for an empty body', () => {
    expect(findClosingIssueNumbers('')).toEqual(new Set())
  })
})

describe('bodyMentionsFilePath()', () => {
  it('is true when the exact path appears in the body', () => {
    expect(bodyMentionsFilePath(ISSUE_784_BODY, 'shared/session-trailer.ts')).toBe(true)
  })
  it('is false when the path does not appear', () => {
    expect(bodyMentionsFilePath(ISSUE_784_BODY, 'scripts/gate.ts')).toBe(false)
  })
  it('is case-sensitive (a path is a literal identifier)', () => {
    expect(bodyMentionsFilePath('See Shared/Session-Trailer.ts', 'shared/session-trailer.ts')).toBe(false)
  })
})

describe('findConflictHits()', () => {
  const issue784: ConflictCandidateIssue = {
    number: 784,
    title: 'Delete unused SESSION_TRAILER_GLOBAL',
    body: ISSUE_784_BODY,
    htmlUrl: 'https://github.com/feffef/terrarium/issues/784',
  }

  it('flags the PR #789-shaped conflict: file named + deletion keyword present', () => {
    const hits = findConflictHits(issue784, ['shared/session-trailer.ts', 'scripts/other.ts'])
    expect(hits).toEqual(
      expect.arrayContaining([
        {
          issueNumber: 784,
          issueTitle: 'Delete unused SESSION_TRAILER_GLOBAL',
          issueUrl: 'https://github.com/feffef/terrarium/issues/784',
          filePath: 'shared/session-trailer.ts',
          matchedKeyword: 'delete',
        },
        {
          issueNumber: 784,
          issueTitle: 'Delete unused SESSION_TRAILER_GLOBAL',
          issueUrl: 'https://github.com/feffef/terrarium/issues/784',
          filePath: 'shared/session-trailer.ts',
          matchedKeyword: 'unused',
        },
      ]),
    )
    // Only the named file gets a hit — the unrelated changed file doesn't.
    expect(hits.every((h) => h.filePath === 'shared/session-trailer.ts')).toBe(true)
  })

  it('does not flag a file the issue never mentions', () => {
    expect(findConflictHits(issue784, ['scripts/other.ts'])).toEqual([])
  })

  it('does not flag when the issue body has no deletion keyword at all', () => {
    const issue: ConflictCandidateIssue = {
      number: 1,
      title: 'Add a new feature touching shared/session-trailer.ts',
      body: 'This proposes extending shared/session-trailer.ts with a new field.',
      htmlUrl: 'https://github.com/feffef/terrarium/issues/1',
    }
    expect(findConflictHits(issue, ['shared/session-trailer.ts'])).toEqual([])
  })

  it('returns no hits for an empty changed-file list', () => {
    expect(findConflictHits(issue784, [])).toEqual([])
  })
})

describe('findAllConflictHits()', () => {
  it('aggregates hits across multiple issues, skipping ones with no match', () => {
    const conflicting: ConflictCandidateIssue = {
      number: 784,
      title: 'Delete unused SESSION_TRAILER_GLOBAL',
      body: ISSUE_784_BODY,
      htmlUrl: 'https://github.com/feffef/terrarium/issues/784',
    }
    const unrelated: ConflictCandidateIssue = {
      number: 2,
      title: 'Unrelated issue',
      body: 'Nothing to see here.',
      htmlUrl: 'https://github.com/feffef/terrarium/issues/2',
    }
    const hits = findAllConflictHits([unrelated, conflicting], ['shared/session-trailer.ts'])
    expect(hits.every((h) => h.issueNumber === 784)).toBe(true)
    expect(hits.length).toBeGreaterThan(0)
  })

  it('returns an empty array when no issue conflicts', () => {
    expect(findAllConflictHits([], ['shared/session-trailer.ts'])).toEqual([])
  })
})

describe('toConflictCandidateIssue()', () => {
  it('maps a plain issue record, decoding title and body', () => {
    const record: RawConflictIssue = {
      number: 784,
      title: 'Delete unused SESSION_TRAILER_GLOBAL &amp; friends',
      body: 'Delete `shared/session-trailer.ts` — it is unused.',
      html_url: 'https://github.com/feffef/terrarium/issues/784',
    }
    expect(toConflictCandidateIssue(record)).toEqual({
      number: 784,
      title: 'Delete unused SESSION_TRAILER_GLOBAL & friends',
      body: 'Delete `shared/session-trailer.ts` — it is unused.',
      htmlUrl: 'https://github.com/feffef/terrarium/issues/784',
    })
  })

  it('returns null for a record that is actually a pull request', () => {
    const record: RawConflictIssue = {
      number: 789,
      title: 'a pr',
      body: 'some body',
      html_url: 'https://github.com/feffef/terrarium/pull/789',
      pull_request: { url: 'https://api.github.com/repos/feffef/terrarium/pulls/789' },
    }
    expect(toConflictCandidateIssue(record)).toBeNull()
  })

  it('returns null for an issue with no body', () => {
    const record: RawConflictIssue = {
      number: 5,
      title: 'no body',
      body: null,
      html_url: 'https://github.com/feffef/terrarium/issues/5',
    }
    expect(toConflictCandidateIssue(record)).toBeNull()
  })
})

describe('parseChangedFileList()', () => {
  it('splits on newlines and drops blank lines', () => {
    expect(parseChangedFileList('shared/kinds.ts\n\nscripts/gate.ts\n')).toEqual([
      'shared/kinds.ts',
      'scripts/gate.ts',
    ])
  })
  it('returns an empty array for empty input', () => {
    expect(parseChangedFileList('')).toEqual([])
  })
})

describe('walkPagesByNumber()', () => {
  // The real shape of GitHub's `rel="next"` on the `pulls` endpoint: the
  // numeric `repositories/{id}/…` form this environment's agent proxy rejects
  // (issue #848). A walker that follows it verbatim 403s on page 2.
  const NUMERIC_NEXT_LINK =
    '<https://api.github.com/repositories/1300192/pulls/42/files?per_page=100&page=2>; rel="next", ' +
    '<https://api.github.com/repositories/1300192/pulls/42/files?per_page=100&page=2>; rel="last"'

  const pageUrl = (page: number) =>
    `https://api.github.com/repos/feffef/terrarium/pulls/42/files?per_page=100&page=${page}`

  /** A fixture fetcher: serves `pages` in order and records every URL asked for. */
  function fixtureFetcher(pages: RestPage[]): { fetchPage: (url: string) => RestPage; requested: string[] } {
    const requested: string[] = []
    let index = 0
    return {
      requested,
      fetchPage: (url) => {
        requested.push(url)
        const page = pages[index++]
        if (!page) throw new Error(`fixture exhausted: unexpected request for ${url}`)
        return page
      },
    }
  }

  it('reaches page 2 by number instead of following the numeric next link', () => {
    const { fetchPage, requested } = fixtureFetcher([
      { status: '200', body: JSON.stringify([{ filename: 'a.ts' }]), linkHeader: NUMERIC_NEXT_LINK },
      { status: '200', body: JSON.stringify([{ filename: 'b.ts' }]), linkHeader: null },
    ])
    expect(walkPagesByNumber(pageUrl, fetchPage)).toEqual([{ filename: 'a.ts' }, { filename: 'b.ts' }])
    expect(requested).toEqual([pageUrl(1), pageUrl(2)])
    expect(requested.some((url) => url.includes('/repositories/'))).toBe(false)
  })

  it('stops after one page when there is no next link', () => {
    const { fetchPage, requested } = fixtureFetcher([
      { status: '200', body: JSON.stringify([{ filename: 'a.ts' }]), linkHeader: null },
    ])
    expect(walkPagesByNumber(pageUrl, fetchPage)).toEqual([{ filename: 'a.ts' }])
    expect(requested).toEqual([pageUrl(1)])
  })

  it('throws an explicit incomplete-scan error on a mid-walk rejection, never the short list', () => {
    const { fetchPage } = fixtureFetcher([
      { status: '200', body: JSON.stringify([{ filename: 'a.ts' }]), linkHeader: NUMERIC_NEXT_LINK },
      { status: '403', body: 'Numeric-ID repository paths are not supported through this proxy', linkHeader: null },
    ])
    expect(() => walkPagesByNumber(pageUrl, fetchPage)).toThrow(/INCOMPLETE at page 2 after 1 record/)
  })

  it('throws an explicit incomplete-scan error on a malformed page body', () => {
    const { fetchPage } = fixtureFetcher([{ status: '200', body: '<html>nope</html>', linkHeader: null }])
    expect(() => walkPagesByNumber(pageUrl, fetchPage)).toThrow(/INCOMPLETE at page 1 after 0 record/)
  })
})
