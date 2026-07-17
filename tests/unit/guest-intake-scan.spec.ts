// Unit tests for the guest-intake scan's pure core: newest-activity
// selection, the guest/owner-steering/agent-footer-skip classification, and
// the per-issue → report reduction. The `gh api` / REST shell is a thin
// wrapper over these, exercised by running the script directly (same split as
// `check-triage-drift.spec.ts`).
import { describe, expect, it } from 'vitest'
import {
  buildReport,
  classifyActivity,
  newestActivity,
  scanIssue,
  type RawCommentRecord,
  type RawIssueRecord,
  type ScannedIssue,
} from '../../scripts/guest-intake-scan.ts'

const FOOTER_COMMENT = `Their story is queued to be built next.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_012KajpP5iqjGPQeVzx8wQVr`

function issue(overrides: Partial<RawIssueRecord> = {}): RawIssueRecord {
  return {
    number: 1,
    title: 'An idea',
    body: 'Please add a thing',
    labels: [],
    user: { login: 'someone' },
    author_association: 'NONE',
    created_at: '2026-07-16T00:00:00Z',
    ...overrides,
  }
}

function comment(overrides: Partial<RawCommentRecord> = {}): RawCommentRecord {
  return {
    html_url: 'https://github.com/feffef/terrarium/issues/1#issuecomment-1',
    body: 'a comment',
    user: { login: 'someone' },
    author_association: 'NONE',
    created_at: '2026-07-16T01:00:00Z',
    ...overrides,
  }
}

describe('newestActivity()', () => {
  it('falls back to the issue body/author when there are no comments', () => {
    expect(newestActivity(issue(), [])).toEqual({
      author: 'someone',
      authorAssociation: 'NONE',
      body: 'Please add a thing',
      createdAt: '2026-07-16T00:00:00Z',
      isComment: false,
    })
  })

  it('picks the most recently created comment, not just the last in array order', () => {
    const older = comment({ body: 'first', created_at: '2026-07-16T01:00:00Z' })
    const newer = comment({ body: 'second', created_at: '2026-07-16T02:00:00Z' })
    expect(newestActivity(issue(), [newer, older]).body).toBe('second')
  })

  it('reports unknown author when user is null (e.g. a deleted account)', () => {
    expect(newestActivity(issue({ user: null }), []).author).toBe('unknown')
  })
})

describe('classifyActivity()', () => {
  it('is agent-footer-skip when the ADR-0017 footer is present, regardless of association', () => {
    expect(
      classifyActivity({ author: 'owner', authorAssociation: 'OWNER', body: FOOTER_COMMENT, createdAt: 'x', isComment: true }),
    ).toBe('agent-footer-skip')
  })

  it('is guest-activity for every Public author_association value', () => {
    for (const assoc of ['NONE', 'CONTRIBUTOR', 'FIRST_TIME_CONTRIBUTOR', 'FIRST_TIMER', 'MANNEQUIN']) {
      expect(
        classifyActivity({ author: 'guest', authorAssociation: assoc, body: 'my idea', createdAt: 'x', isComment: true }),
      ).toBe('guest-activity')
    }
  })

  it('is owner-steering for a Trusted author_association without the footer', () => {
    for (const assoc of ['OWNER', 'MEMBER', 'COLLABORATOR']) {
      expect(
        classifyActivity({ author: 'owner', authorAssociation: assoc, body: 'just build this', createdAt: 'x', isComment: true }),
      ).toBe('owner-steering')
    }
  })

  it('falls back to unrecognized-association for an unknown value', () => {
    expect(
      classifyActivity({ author: 'bot', authorAssociation: 'SOME_NEW_VALUE', body: 'x', createdAt: 'x', isComment: true }),
    ).toBe('unrecognized-association')
  })
})

describe('scanIssue()', () => {
  it('returns null for a record that is actually a pull request', () => {
    expect(scanIssue(issue({ pull_request: { url: 'x' } }), [])).toBeNull()
  })

  it('decodes HTML entities in the title, body, and comment text', () => {
    const result = scanIssue(
      issue({ title: 'Guests &amp; ideas', body: null }),
      [comment({ body: 'It&#39;s a great idea' })],
    )
    expect(result?.title).toBe('Guests & ideas')
    expect(result?.newestActivity.body).toBe("It's a great idea")
  })

  it('counts prior footer-carrying comments for the round-count signal', () => {
    const result = scanIssue(issue(), [
      comment({ body: FOOTER_COMMENT, created_at: '2026-07-16T01:00:00Z' }),
      comment({ body: 'a plain reply', created_at: '2026-07-16T02:00:00Z' }),
    ])
    expect(result?.priorFooterCommentCount).toBe(1)
  })

  it('classifies a guest-authored issue with no comments as guest-activity', () => {
    const result = scanIssue(issue(), [])
    expect(result?.stage).toBe('guest-activity')
    expect(result?.newestActivity.isComment).toBe(false)
  })
})

describe('buildReport()', () => {
  const base: ScannedIssue = {
    number: 1,
    title: 'x',
    labels: [],
    stage: 'agent-footer-skip',
    newestActivity: { author: 'a', authorAssociation: 'OWNER', body: FOOTER_COMMENT, createdAt: 'x', isComment: true },
    priorFooterCommentCount: 1,
  }

  it('counts every stage and only surfaces guest-activity/owner-steering in actionable', () => {
    const scanned: ScannedIssue[] = [
      base,
      { ...base, number: 2, stage: 'owner-steering' },
      { ...base, number: 3, stage: 'guest-activity' },
      { ...base, number: 4, stage: 'unrecognized-association' },
    ]
    const report = buildReport(scanned)
    expect(report.scannedCount).toBe(4)
    expect(report.counts).toEqual({
      'guest-activity': 1,
      'owner-steering': 1,
      'agent-footer-skip': 1,
      'unrecognized-association': 1,
    })
    expect(report.actionable.map((i) => i.number).sort()).toEqual([2, 3])
  })

  it('returns an empty actionable list and zeroed counts for no issues', () => {
    expect(buildReport([])).toEqual({
      scannedCount: 0,
      counts: {
        'guest-activity': 0,
        'owner-steering': 0,
        'agent-footer-skip': 0,
        'unrecognized-association': 0,
      },
      actionable: [],
    })
  })
})
