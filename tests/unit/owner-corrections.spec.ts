// Unit tests for owner-corrections.ts's pure core (issue #1515): which
// merged PRs, reviews and comments are candidate owner corrections to a
// `visitor-loop` PR. Fixture data only — the GitHub/git shell is thin.
import { describe, expect, it } from 'vitest'
import { findCandidates, type Comment, type Pr } from '../../scripts/owner-corrections.ts'

const AI_BODY = '🤖 [Claude Opus 5.5](https://claude.ai/code/session_01548Bi1ZiGcknAp8CMLNMZB)\n\nLooks good.'

const VL_1492: Pr = {
  number: 1492,
  url: 'https://github.com/feffef/terrarium/pull/1492',
  title: 'visitor-loop (atlas): fixes',
  body: AI_BODY,
  headRef: 'claude/visitor-loop-fixes-2026-09-29',
  mergedAt: '2026-09-29T17:07:40Z',
  files: ['layers/atlas/app/assets/theme.css', 'layers/atlas/app/components/FoodWeb.vue', 'layers/atlas/README.md'],
}

const PR_1494: Pr = {
  number: 1494,
  url: 'https://github.com/feffef/terrarium/pull/1494',
  title: 'atlas: bring the food & relations webs back on phones',
  body: 'Restores the webs on narrow screens.',
  headRef: 'ccr-d97568dd-z8byz4',
  mergedAt: '2026-09-29T22:16:46Z',
  files: ['layers/atlas/app/assets/theme.css', 'layers/atlas/app/components/FoodWeb.vue'],
}

const UNRELATED: Pr = {
  number: 1500,
  url: 'https://github.com/feffef/terrarium/pull/1500',
  title: 'docs: tidy',
  body: 'Nothing to see.',
  headRef: 'claude/docs-tidy',
  mergedAt: '2026-09-30T10:00:00Z',
  files: ['docs/agents/domain.md'],
}

function comment(over: Partial<Comment>): Comment {
  return {
    url: 'https://github.com/feffef/terrarium/pull/1492#issuecomment-1',
    body: 'Please keep the web on phones.',
    createdAt: '2026-09-30T12:00:00Z',
    login: 'feffef',
    threadNumber: 1492,
    threadText: '',
    ...over,
  }
}

describe('findCandidates', () => {
  it('lists a merged PR that touches a visitor-loop PR’s files as a rework, naming the overlap', () => {
    const out = findCandidates('2026-09-29T20:00:00Z', [VL_1492, PR_1494, UNRELATED], [])
    expect(out).toEqual([
      {
        kind: 'rework',
        url: 'https://github.com/feffef/terrarium/pull/1494',
        relatesTo: 1492,
        files: ['layers/atlas/app/assets/theme.css', 'layers/atlas/app/components/FoodWeb.vue'],
        excerpt: 'atlas: bring the food & relations webs back on phones',
      },
    ])
  })

  it('lists a merged PR that names a visitor-loop PR (revert or follow-up), even with no file overlap', () => {
    const revert: Pr = { ...UNRELATED, number: 1410, title: 'Revert "visitor-loop feature"', body: 'Reverts feffef/terrarium#1492' }
    const out = findCandidates('2026-09-29T20:00:00Z', [VL_1492, revert], [])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ kind: 'rework', relatesTo: 1492, files: [] })
  })

  it('lists a body "Follow-up to #N" but not a bare citation of #N', () => {
    const followUp: Pr = { ...UNRELATED, number: 1501, url: 'https://github.com/feffef/terrarium/pull/1501', body: 'Follow-up to #1492, which hid the web.' }
    const citation: Pr = { ...UNRELATED, number: 1502, url: 'https://github.com/feffef/terrarium/pull/1502', body: 'This post quotes the fix in #1492.' }
    const out = findCandidates('2026-09-29T20:00:00Z', [VL_1492, followUp, citation], [])
    expect(out.map((c) => c.url)).toEqual([followUp.url])
  })

  it('lists a revert of a visitor-loop PR however long ago it merged', () => {
    const old: Pr = { ...VL_1492, mergedAt: '2026-08-01T00:00:00Z' }
    const revert: Pr = { ...UNRELATED, title: 'Revert #1492' }
    expect(findCandidates('2026-09-29T20:00:00Z', [old, revert], [])).toMatchObject([{ kind: 'rework', relatesTo: 1492 }])
  })

  it('ignores a PR merged before the cutoff, and a mention of a longer number (#14920)', () => {
    const early = { ...PR_1494, mergedAt: '2026-09-29T19:00:00Z' }
    const longer: Pr = { ...UNRELATED, body: 'see #14920' }
    expect(findCandidates('2026-09-29T20:00:00Z', [VL_1492, early, longer], [])).toEqual([])
  })

  it('ignores file overlap with a visitor-loop PR merged long before', () => {
    const late = { ...PR_1494, mergedAt: '2026-10-20T00:00:00Z' }
    expect(findCandidates('2026-09-29T20:00:00Z', [VL_1492, late], [])).toEqual([])
  })

  it('keeps an owner comment without provenance on a visitor-loop PR as a review, and drops an AI one', () => {
    const human = comment({})
    const ai = comment({ url: 'https://github.com/feffef/terrarium/pull/1492#issuecomment-2', body: AI_BODY })
    expect(findCandidates('2026-09-29T20:00:00Z', [VL_1492], [human, ai])).toEqual([
      { kind: 'review', url: human.url, relatesTo: 1492, excerpt: 'Please keep the web on phones.' },
    ])
  })

  it('drops comments from before the cutoff, empty review bodies and bots', () => {
    const old = comment({ createdAt: '2026-09-29T00:00:00Z' })
    const empty = comment({ body: '  ' })
    const bot = comment({ login: 'github-actions[bot]' })
    expect(findCandidates('2026-09-29T20:00:00Z', [VL_1492], [old, empty, bot])).toEqual([])
  })

  it('keeps a human issue comment whose thread references a visitor-loop PR, and skips one that does not', () => {
    const onIssue = comment({ url: 'https://github.com/feffef/terrarium/issues/1600#issuecomment-3', threadNumber: 1600, threadText: 'Follow-up to #1492' })
    const elsewhere = comment({ url: 'https://github.com/feffef/terrarium/issues/1601#issuecomment-4', threadNumber: 1601, threadText: 'unrelated' })
    expect(findCandidates('2026-09-29T20:00:00Z', [VL_1492], [onIssue, elsewhere])).toEqual([
      { kind: 'issue-comment', url: onIssue.url, relatesTo: 1492, excerpt: 'Please keep the web on phones.' },
    ])
  })

  it('prints nothing when nothing happened after the cutoff', () => {
    expect(findCandidates('2026-10-25T00:00:00Z', [VL_1492, PR_1494, UNRELATED], [comment({})])).toEqual([])
  })
})
