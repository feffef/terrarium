// Unit tests for the conflicting-issue cross-check's pure core (issue #798):
// the deletion-keyword matcher, the file-path mention check, the per-issue
// hit finder, and the raw-record screen. The `gh api`/REST shell and the
// `git diff` shell are thin wrappers over these, not exercised here — same
// split `check-triage-drift.spec.ts` uses for its sibling script. The shared
// `gh`/`rest` strategy decision (`pickFetchStrategy`, `parseNextLink`) is
// single-homed in `list-open-issues.ts` (issue #505) and tested there.
import { describe, expect, it } from 'vitest'
import {
  bodyMentionsFilePath,
  DELETION_KEYWORDS,
  findAllConflictHits,
  findConflictHits,
  findDeletionKeywords,
  parseChangedFileList,
  toConflictCandidateIssue,
  type ConflictCandidateIssue,
  type RawConflictIssue,
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
