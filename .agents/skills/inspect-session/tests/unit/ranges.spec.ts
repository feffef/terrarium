import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { flatten, parsePage } from '../../scripts/flatten.ts'
import { pageCursors, split } from '../../scripts/ranges.ts'

describe('pageCursors', () => {
  it("reads each page with the newer page's first_id, and the newest with none", () => {
    expect(pageCursors('c true\nb true\na false\n')).toEqual([
      { beforeId: 'none', firstId: 'c' },
      { beforeId: 'c', firstId: 'b' },
      { beforeId: 'b', firstId: 'a' },
    ])
  })
})

describe('split', () => {
  it('cuts contiguous ranges whose sizes differ by at most one', () => {
    expect(split([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5], [6, 7]])
  })

  it('never makes an empty range', () => {
    expect(split([1, 2], 4)).toEqual([[1], [2]])
    expect(split([1], 0)).toEqual([[1]])
  })
})

describe('merging the ranges', () => {
  const page = (name: string) => parsePage(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8'), name)

  it('gives one oldest-first file whatever order the fetchers finished in, and reports a duplicate page', () => {
    const fromRanges = [[page('page-newer.txt')], [page('page-older-repeat.txt'), page('page-older.txt')]]
    const { lines, meta } = flatten(fromRanges.reverse().flat(), 'x', null, 9999)
    expect(lines.map((l) => l.at)).toEqual([...lines.map((l) => l.at)].sort())
    expect(lines).toHaveLength(20)
    expect(meta).toMatchObject({ pages: 2, reachedStart: true, duplicates: [{ firstId: 'o1' }] })
  })
})
