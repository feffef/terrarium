// Unit tests for the last-comment-authorship report's pure core (issue
// #637): picking the most recent comment out of a fetched batch, building
// its compact record, and filtering/sorting open issue numbers. The `gh api`
// / REST shell is a thin wrapper over these, exercised by running the script
// directly — same split `check-triage-drift.spec.ts` uses. Provenance-footer
// detection itself is `check-triage-drift.ts`'s `isAiAuthored`, tested there.
import { describe, expect, it } from 'vitest'
import {
  openIssueNumbers,
  toLastCommentAuthor,
  type RawCommentAuthorApiRecord,
} from '../../scripts/last-comment-authors.ts'
import type { RawIssueApiRecord } from '../../scripts/list-open-issues.ts'

const AI_COMMENT: RawCommentAuthorApiRecord = {
  html_url: 'https://github.com/feffef/terrarium/issues/1#issuecomment-1',
  body: 'Update: took a look.\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>\nClaude-Session: https://claude.ai/code/session_01VhL2mH3yYgkDqrMv61qe11',
  created_at: '2026-07-11T23:41:13Z',
  user: { login: 'feffef' },
  author_association: 'OWNER',
}

const HUMAN_COMMENT: RawCommentAuthorApiRecord = {
  html_url: 'https://github.com/feffef/terrarium/issues/1#issuecomment-2',
  body: 'sounds good, thanks',
  created_at: '2026-07-12T01:00:00Z',
  user: { login: 'someuser' },
  author_association: 'CONTRIBUTOR',
}

describe('toLastCommentAuthor()', () => {
  it('returns null for an issue with no comments', () => {
    expect(toLastCommentAuthor(1, [])).toBeNull()
  })

  it('picks the single comment when there is only one', () => {
    expect(toLastCommentAuthor(1, [AI_COMMENT])).toEqual({
      number: 1,
      lastCommenterLogin: 'feffef',
      authorAssociation: 'OWNER',
      commentCreatedAt: AI_COMMENT.created_at,
      hasProvenanceFooter: true,
      commentUrl: AI_COMMENT.html_url,
    })
  })

  it('picks the most recently created comment, not the last in array order', () => {
    // HUMAN_COMMENT is newer than AI_COMMENT but listed first here.
    expect(toLastCommentAuthor(1, [HUMAN_COMMENT, AI_COMMENT])).toEqual({
      number: 1,
      lastCommenterLogin: 'someuser',
      authorAssociation: 'CONTRIBUTOR',
      commentCreatedAt: HUMAN_COMMENT.created_at,
      hasProvenanceFooter: false,
      commentUrl: HUMAN_COMMENT.html_url,
    })
  })

  it('never includes the comment body in the output', () => {
    const record = toLastCommentAuthor(1, [AI_COMMENT])
    expect(record).not.toHaveProperty('body')
    expect(JSON.stringify(record)).not.toContain('took a look')
  })

  it('falls back to "(unknown)" when the comment has no user (e.g. a deleted account)', () => {
    const noUser: RawCommentAuthorApiRecord = { ...AI_COMMENT, user: null }
    expect(toLastCommentAuthor(1, [noUser])?.lastCommenterLogin).toBe('(unknown)')
  })
})

describe('openIssueNumbers()', () => {
  const issue1: RawIssueApiRecord = {
    number: 1,
    title: 'older',
    labels: [],
    updated_at: '2026-07-10T00:00:00Z',
  }
  const issue2: RawIssueApiRecord = {
    number: 2,
    title: 'newer',
    labels: [],
    updated_at: '2026-07-15T00:00:00Z',
  }
  const pr: RawIssueApiRecord = {
    number: 3,
    title: 'a pr',
    labels: [],
    updated_at: '2026-07-20T00:00:00Z',
    pull_request: { url: 'https://api.github.com/repos/feffef/terrarium/pulls/3' },
  }

  it('filters out pull requests and sorts newest-updated-first', () => {
    expect(openIssueNumbers([issue1, pr, issue2])).toEqual([2, 1])
  })

  it('respects the limit', () => {
    expect(openIssueNumbers([issue1, issue2], 1)).toEqual([2])
  })
})
