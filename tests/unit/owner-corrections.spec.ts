// Unit tests for owner-corrections.ts's pure core (issue #1515): which
// merged PRs, reviews and comments are candidate owner corrections to a
// `visitor-loop` PR. Fixture data only — the GitHub/git shell is thin.
import { describe, expect, it } from 'vitest'
import { findCandidates, isVisitorLoopPr, unresolved, type Comment, type Pr } from '../../scripts/owner-corrections.ts'

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
    threadNumber: 1492,
    threadText: '',
    isBot: false,
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

  it('drops a rework by a bot account (Dependabot), keeping the same PR from a human', () => {
    const bump: Pr = { ...PR_1494, title: 'chore(deps): bump vue', isBot: true }
    expect(findCandidates('2026-09-29T20:00:00Z', [VL_1492, bump], [])).toEqual([])
    expect(findCandidates('2026-09-29T20:00:00Z', [VL_1492, PR_1494], [])).toHaveLength(1)
  })

  it('lists a merged PR that names a visitor-loop PR (revert or follow-up), even with no file overlap', () => {
    const revert: Pr = { ...UNRELATED, number: 1410, title: 'Revert "visitor-loop feature"', body: 'Reverts feffef/terrarium#1492' }
    const out = findCandidates('2026-09-29T20:00:00Z', [VL_1492, revert], [])
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ kind: 'rework', relatesTo: 1492, files: [] })
  })

  it('lists any body reference to a visitor-loop PR, by #N or by URL, not only after a verb', () => {
    const supersedes: Pr = { ...UNRELATED, number: 1501, url: 'https://github.com/feffef/terrarium/pull/1501', body: 'Supersedes #1492.' }
    const byUrl: Pr = { ...UNRELATED, number: 1502, url: 'https://github.com/feffef/terrarium/pull/1502', body: 'Fixes the layout https://github.com/feffef/terrarium/pull/1492 introduced.' }
    const out = findCandidates('2026-09-29T20:00:00Z', [VL_1492, supersedes, byUrl], [])
    expect(out.map((c) => [c.url, c.relatesTo])).toEqual([
      [supersedes.url, 1492],
      [byUrl.url, 1492],
    ])
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

  it('drops a bot account’s comment even without provenance', () => {
    const ci = comment({ body: '✅ safety-gate green', isBot: true })
    expect(findCandidates('2026-09-29T20:00:00Z', [VL_1492], [ci])).toEqual([])
  })

  it('drops comments from before the cutoff and empty review bodies', () => {
    const old = comment({ createdAt: '2026-09-29T00:00:00Z' })
    const empty = comment({ body: '  ' })
    expect(findCandidates('2026-09-29T20:00:00Z', [VL_1492], [old, empty])).toEqual([])
  })

  it('keeps a human issue comment that links a visitor-loop PR by URL', () => {
    const linked = comment({ url: 'https://github.com/feffef/terrarium/issues/1602#issuecomment-5', threadNumber: 1602, body: 'Undo https://github.com/feffef/terrarium/pull/1492 please' })
    expect(findCandidates('2026-09-29T20:00:00Z', [VL_1492], [linked])).toMatchObject([{ kind: 'issue-comment', relatesTo: 1492 }])
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

  it('treats a pinned-branch PR whose title starts `visitor-loop` + space or `(` as a visitor-loop PR, and reworks of it as candidates', () => {
    const pinned: Pr = { ...VL_1492, number: 1563, title: 'visitor-loop (journal onramp): consensus fixes', headRef: 'ccr-7b24c32f-0nzqez' }
    const unrelatedPinned: Pr = { ...pinned, number: 1564, title: 'journal: tidy', mergedAt: '2026-09-29T17:00:00Z' }
    const out = findCandidates('2026-09-29T20:00:00Z', [unrelatedPinned, pinned, PR_1494], [])
    expect(out).toMatchObject([{ kind: 'rework', url: PR_1494.url, relatesTo: 1563 }])
  })
})

describe('isVisitorLoopPr', () => {
  it('matches the visitor-loop branch prefix, or a title starting `visitor-loop` then a space or `(`, case-insensitively', () => {
    expect(isVisitorLoopPr({ headRef: 'claude/visitor-loop-fixes-2026-10-05', title: 'anything' })).toBe(true)
    expect(isVisitorLoopPr({ headRef: 'claude/adoring-galileo-9pcuh7', title: 'Visitor-loop (blog): fixes' })).toBe(true)
    expect(isVisitorLoopPr({ headRef: 'claude/adoring-galileo-9pcuh7', title: 'visitor-loop fixes' })).toBe(true)
    expect(isVisitorLoopPr({ headRef: 'claude/adoring-galileo-9pcuh7', title: 'visitor-loop: Skill edit' })).toBe(false)
    expect(isVisitorLoopPr({ headRef: 'claude/adoring-galileo-9pcuh7', title: 'visitor-loops (blog)' })).toBe(false)
    expect(isVisitorLoopPr({ headRef: 'claude/adoring-galileo-9pcuh7', title: 'Revert "visitor-loop (blog): fixes"' })).toBe(false)
  })
})

describe('unresolved', () => {
  const [rework] = findCandidates('2026-09-29T20:00:00Z', [VL_1492, PR_1494], [])
  const review = findCandidates('2026-09-29T20:00:00Z', [VL_1492], [comment({})])[0]!
  const both = [rework!, review]

  it('passes when every candidate is named on its own line with a resolution', () => {
    const tally = `- #1494 reworks #1492: decisions.md line added\n- ${review.url} not a ruling (praise)`
    expect(unresolved(both, tally)).toEqual([])
  })

  it('fails a tally that dismisses candidates as a group, listing each one', () => {
    expect(unresolved(both, '10 candidates, all reworks, not rulings')).toEqual(both)
  })

  it('resolves only the first #N or URL on a line, so one line resolves one candidate', () => {
    const second: Pr = { ...PR_1494, number: 1495, url: 'https://github.com/feffef/terrarium/pull/1495' }
    const two = findCandidates('2026-09-29T20:00:00Z', [VL_1492, PR_1494, second], [])
    expect(unresolved(two, '- #1700 reworks #1494: not a ruling')).toEqual(two)
    expect(unresolved(two, '- #1494, #1495: not a ruling (lockfile)')).toEqual([two[1]])
  })

  it('accepts a URL followed by punctuation', () => {
    expect(unresolved([review], `- ${review.url}: not a ruling (praise)`)).toEqual([])
    expect(unresolved([rework!], `- (${rework!.url}) not a ruling`)).toEqual([])
  })

  it('lists a rework PR relating to two visitor-loop PRs once', () => {
    const vl2: Pr = { ...VL_1492, number: 1493, url: 'https://github.com/feffef/terrarium/pull/1493', files: ['layers/atlas/app/components/FoodWeb.vue'] }
    const vl1: Pr = { ...VL_1492, mergedAt: '2026-09-29T16:00:00Z', files: ['layers/atlas/app/assets/theme.css'] }
    const dup = findCandidates('2026-09-29T20:00:00Z', [vl1, vl2, PR_1494], [])
    expect(dup).toHaveLength(2)
    expect(unresolved(dup, 'all reworks')).toEqual([dup[0]])
  })

  it('fails a candidate named without a resolution, or only by a longer comment URL', () => {
    const tally = `- #1494 reworks #1492\n- ${review.url}0 not a ruling (praise)`
    expect(unresolved(both, tally)).toEqual(both)
  })
})
