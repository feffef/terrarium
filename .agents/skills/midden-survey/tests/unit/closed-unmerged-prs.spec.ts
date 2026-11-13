// Unit tests for the closed-unmerged PR lister's pure core: the window filter
// and the stop rule that ends paging. The gh/curl paging is `listAll`'s.
import { describe, expect, it } from 'vitest'
import { closedUnmerged, pastWindow, type RawPull } from '../../scripts/closed-unmerged-prs.ts'

const SINCE = '2026-11-06'
const pr = (number: number, closed: string | null, updated: string, merged: string | null = null): RawPull => ({
  number,
  title: `PR ${number}`,
  head: { ref: `branch-${number}` },
  created_at: '2026-10-01T00:00:00Z',
  closed_at: closed,
  updated_at: updated,
  merged_at: merged,
})

describe('closedUnmerged', () => {
  it('drops merged PRs and PRs closed before the window', () => {
    const out = closedUnmerged(
      [
        pr(1, '2026-11-08T00:00:00Z', '2026-11-08T00:00:00Z', '2026-11-08T00:00:00Z'),
        pr(2, '2026-11-01T00:00:00Z', '2026-11-09T00:00:00Z'), // closed before, commented in-window
        pr(3, '2026-11-07T00:00:00Z', '2026-11-07T00:00:00Z'),
      ],
      SINCE,
    )
    expect(out.map((p) => p.number)).toEqual([3])
  })

  it('keeps a PR closed in the window and commented on later', () => {
    const out = closedUnmerged([pr(4, '2026-11-07T00:00:00Z', '2026-11-12T00:00:00Z')], SINCE)
    expect(out).toEqual([
      { number: 4, title: 'PR 4', headRef: 'branch-4', createdAt: '2026-10-01T00:00:00Z', closedAt: '2026-11-07T00:00:00Z' },
    ])
  })

  it('sorts newest-closed first', () => {
    const out = closedUnmerged(
      [pr(5, '2026-11-07T00:00:00Z', '2026-11-07T00:00:00Z'), pr(6, '2026-11-10T00:00:00Z', '2026-11-10T00:00:00Z')],
      SINCE,
    )
    expect(out.map((p) => p.number)).toEqual([6, 5])
  })
})

describe('pastWindow', () => {
  it('stops when the last record was updated before the window', () => {
    expect(pastWindow([pr(7, null, '2026-11-09T00:00:00Z'), pr(8, null, '2026-11-05T00:00:00Z')], SINCE)).toBe(true)
  })

  it('continues while the last record is inside the window, and on an empty page', () => {
    expect(pastWindow([pr(9, null, '2026-11-06T00:00:00Z')], SINCE)).toBe(false)
    expect(pastWindow([], SINCE)).toBe(false)
  })
})
