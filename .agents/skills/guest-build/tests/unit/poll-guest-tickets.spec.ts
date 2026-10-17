// Unit tests for the guest-build pre-filter's pure core: the Public/Trusted
// screen (ADR-0020's `authorAssociation` split), the PR-record filter, and
// the "already has an open or merged linked PR" timeline check.
import { describe, expect, it } from 'vitest'
import {
  hasOpenOrMergedLinkedPr,
  isPublicAuthor,
  toGuestReadyIssue,
  type RawReadyIssueApiRecord,
  type RawTimelineEventRecord,
} from '../../scripts/poll-guest-tickets.ts'

describe('isPublicAuthor()', () => {
  it('is true for every ADR-0020 Public association', () => {
    for (const assoc of ['CONTRIBUTOR', 'FIRST_TIME_CONTRIBUTOR', 'FIRST_TIMER', 'MANNEQUIN', 'NONE']) {
      expect(isPublicAuthor(assoc)).toBe(true)
    }
  })
  it('is false for every ADR-0020 Trusted association', () => {
    for (const assoc of ['OWNER', 'MEMBER', 'COLLABORATOR']) {
      expect(isPublicAuthor(assoc)).toBe(false)
    }
  })
})

describe('toGuestReadyIssue()', () => {
  const base: RawReadyIssueApiRecord = {
    number: 600,
    title: 'Add a widget &amp; a gadget',
    labels: ['ready-for-agent'],
    updated_at: '2026-07-17T00:00:00Z',
    author_association: 'NONE',
    html_url: 'https://github.com/feffef/terrarium/issues/600',
  }

  it('maps a Public-authored issue, decoding the title', () => {
    expect(toGuestReadyIssue(base)).toEqual({
      number: 600,
      title: 'Add a widget & a gadget',
      authorAssociation: 'NONE',
      htmlUrl: 'https://github.com/feffef/terrarium/issues/600',
    })
  })
  it('returns null for an OWNER-authored issue (Trusted, not a guest)', () => {
    expect(toGuestReadyIssue({ ...base, author_association: 'OWNER' })).toBeNull()
  })
  it('returns null for a COLLABORATOR-authored issue (Trusted, not a guest)', () => {
    expect(toGuestReadyIssue({ ...base, author_association: 'COLLABORATOR' })).toBeNull()
  })
  it('returns null for a record that is actually a pull request', () => {
    expect(
      toGuestReadyIssue({
        ...base,
        pull_request: { url: 'https://api.github.com/repos/feffef/terrarium/pulls/600' },
      }),
    ).toBeNull()
  })
})

describe('hasOpenOrMergedLinkedPr()', () => {
  it('is false with no cross-referenced events', () => {
    expect(hasOpenOrMergedLinkedPr([{ event: 'labeled' }])).toBe(false)
  })
  it('is true for a cross-reference to a still-open PR', () => {
    const events: RawTimelineEventRecord[] = [
      { event: 'labeled' },
      { event: 'cross-referenced', source: { issue: { pull_request: { merged_at: null }, state: 'open' } } },
    ]
    expect(hasOpenOrMergedLinkedPr(events)).toBe(true)
  })
  it('is true for a cross-reference to a merged PR (state closed)', () => {
    const events: RawTimelineEventRecord[] = [
      {
        event: 'cross-referenced',
        source: { issue: { pull_request: { merged_at: '2026-07-17T01:00:00Z' }, state: 'closed' } },
      },
    ]
    expect(hasOpenOrMergedLinkedPr(events)).toBe(true)
  })
  it('is false for a cross-reference to a closed, unmerged PR (abandoned)', () => {
    const events: RawTimelineEventRecord[] = [
      { event: 'cross-referenced', source: { issue: { pull_request: { merged_at: null }, state: 'closed' } } },
    ]
    expect(hasOpenOrMergedLinkedPr(events)).toBe(false)
  })
  it('is false for a cross-reference whose source is not a pull request', () => {
    const events: RawTimelineEventRecord[] = [{ event: 'cross-referenced', source: { issue: { state: 'open' } } }]
    expect(hasOpenOrMergedLinkedPr(events)).toBe(false)
  })
  it('is false for an empty event list', () => {
    expect(hasOpenOrMergedLinkedPr([])).toBe(false)
  })
})
