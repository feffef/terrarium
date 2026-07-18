// Unit tests for the guest-intake scan's pure core: newest-activity
// selection, the guest/owner-steering/agent-footer-skip classification, and
// the per-issue → report reduction. The `gh api` / REST shell is a thin
// wrapper over these, exercised by running the script directly (same split as
// `check-triage-drift.spec.ts`).
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  buildReport,
  classifyActivity,
  commentsSinceCursor,
  newestActivity,
  newestOwnerCommentSince,
  readCursorState,
  scanIssue,
  writeCursorState,
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

describe('commentsSinceCursor()', () => {
  it('returns no comments when there is no cursor yet (no "since" boundary to check against)', () => {
    const a = comment({ created_at: '2026-07-16T01:00:00Z' })
    const b = comment({ created_at: '2026-07-16T02:00:00Z' })
    expect(commentsSinceCursor([a, b], null)).toEqual([])
  })

  it('keeps only comments strictly newer than the cursor', () => {
    const before = comment({ body: 'before', created_at: '2026-07-16T01:00:00Z' })
    const atCursor = comment({ body: 'at cursor', created_at: '2026-07-16T02:00:00Z' })
    const after = comment({ body: 'after', created_at: '2026-07-16T03:00:00Z' })
    expect(commentsSinceCursor([before, atCursor, after], '2026-07-16T02:00:00Z')).toEqual([after])
  })
})

describe('newestOwnerCommentSince() — issue #569', () => {
  it('finds a real OWNER comment sandwiched between two of the agent\'s own footer replies', () => {
    // See scripts/guest-intake-scan.ts's header comment for the reported
    // bug shape this reproduces (issue #569).
    const replyA = comment({ body: FOOTER_COMMENT, author_association: 'OWNER', created_at: '2026-07-17T01:00:00Z' })
    const ownerSteering = comment({
      body: 'make an exception for terrariumdata.duckdns.org',
      author_association: 'OWNER',
      created_at: '2026-07-17T02:00:00Z',
    })
    const replyB = comment({ body: FOOTER_COMMENT, author_association: 'OWNER', created_at: '2026-07-17T03:00:00Z' })
    // Cursor from the prior scan pass: as of then, replyA was the newest seen.
    const found = newestOwnerCommentSince([replyA, ownerSteering, replyB], replyA.created_at)
    expect(found?.body).toBe('make an exception for terrariumdata.duckdns.org')
  })

  it('ignores footer-carrying comments and Public comments', () => {
    const footer = comment({ body: FOOTER_COMMENT, author_association: 'OWNER', created_at: '2026-07-17T01:00:00Z' })
    const guest = comment({ body: 'my idea', author_association: 'NONE', created_at: '2026-07-17T02:00:00Z' })
    expect(newestOwnerCommentSince([footer, guest], null)).toBeNull()
  })

  it('returns null when nothing qualifies since the cursor', () => {
    const owner = comment({ body: 'just build this', author_association: 'OWNER', created_at: '2026-07-17T01:00:00Z' })
    expect(newestOwnerCommentSince([owner], '2026-07-17T02:00:00Z')).toBeNull()
  })
})

describe('readCursorState() / writeCursorState()', () => {
  it('reads an empty object when the file does not exist yet', () => {
    const dir = mkdtempSync(join(tmpdir(), 'guest-intake-scan-state-'))
    try {
      expect(readCursorState(join(dir, '.guest-intake-scan-state.json'))).toEqual({})
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('round-trips a written state', () => {
    const dir = mkdtempSync(join(tmpdir(), 'guest-intake-scan-state-'))
    try {
      const path = join(dir, '.guest-intake-scan-state.json')
      writeCursorState({ '555': '2026-07-17T02:00:00Z' }, path)
      expect(readCursorState(path)).toEqual({ '555': '2026-07-17T02:00:00Z' })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe('scanIssue()', () => {
  it('returns null for a record that is actually a pull request', () => {
    expect(scanIssue(issue({ pull_request: { url: 'x' } }), [])).toBeNull()
  })

  it('surfaces a real OWNER comment buried under the agent\'s own later footer reply (issue #569)', () => {
    const replyA = comment({ body: FOOTER_COMMENT, author_association: 'OWNER', created_at: '2026-07-17T01:00:00Z' })
    const ownerSteering = comment({
      body: 'make an exception for terrariumdata.duckdns.org',
      author_association: 'OWNER',
      created_at: '2026-07-17T02:00:00Z',
    })
    const replyB = comment({ body: FOOTER_COMMENT, author_association: 'OWNER', created_at: '2026-07-17T03:00:00Z' })
    const result = scanIssue(issue(), [replyA, ownerSteering, replyB], replyA.created_at)
    expect(result?.stage).toBe('owner-steering')
    expect(result?.newestActivity.body).toBe('make an exception for terrariumdata.duckdns.org')
  })

  it('behaves exactly as before when there is no missed owner comment (no cursor regression)', () => {
    const result = scanIssue(issue(), [comment({ body: FOOTER_COMMENT, author_association: 'OWNER' })], null)
    expect(result?.stage).toBe('agent-footer-skip')
  })

  it('does not perpetually re-flag an old, already-answered OWNER comment when there is no persisted cursor', () => {
    // A fresh checkout/worktree (no `.guest-intake-scan-state.json` yet) sees
    // cursor === null on every scan. Before this fix, a null cursor scanned
    // an issue's ENTIRE history for the newest qualifying OWNER comment,
    // regardless of how long ago it was already answered — this reproduces
    // that scenario and confirms it now falls back to plain newestActivity()
    // instead.
    const oldOwnerComment = comment({
      body: 'do this thing',
      author_association: 'OWNER',
      created_at: '2026-01-01T00:00:00Z',
    })
    const laterFooterReply = comment({ body: FOOTER_COMMENT, author_association: 'OWNER', created_at: '2026-06-01T00:00:00Z' })
    const result = scanIssue(issue(), [oldOwnerComment, laterFooterReply], null)
    expect(result?.stage).toBe('agent-footer-skip')
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
