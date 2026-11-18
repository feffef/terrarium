import { describe, expect, it } from 'vitest'
import { withBlogMonths } from '../../app/utils/months'

const post = (publishedAt: string) => ({ publishedAt })

describe('withBlogMonths', () => {
  it('marks the first post of each month, newest-first input', () => {
    const rows = withBlogMonths([
      post('2026-10-20T10:00:00Z'),
      post('2026-10-02T10:00:00Z'),
      post('2026-09-30T10:00:00Z'),
    ])
    expect(rows.map((r) => r.month)).toEqual(['October 2026', undefined, 'September 2026'])
  })

  it('reads the month in UTC', () => {
    const rows = withBlogMonths([post('2026-10-31T23:30:00Z'), post('2026-10-01T00:00:00Z')])
    expect(rows.map((r) => r.month)).toEqual(['October 2026', undefined])
  })

  it('gives every month with posts a heading, across a year boundary', () => {
    const rows = withBlogMonths([post('2027-01-05T00:00:00Z'), post('2026-11-05T00:00:00Z')])
    expect(rows.map((r) => r.month)).toEqual(['January 2027', 'November 2026'])
  })

  it('keeps the posts and returns nothing for no posts', () => {
    const p = post('2026-10-20T10:00:00Z')
    expect(withBlogMonths([p])[0]!.post).toBe(p)
    expect(withBlogMonths([])).toEqual([])
  })
})
