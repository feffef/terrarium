import { describe, expect, it } from 'vitest'
import { pageCursors, splitEvenly } from '../../scripts/ranges.ts'

describe('pageCursors', () => {
  it("reads each page with the newer page's first_id, and the newest with none", () => {
    expect(pageCursors('c\nb\na\n')).toEqual([
      { beforeId: 'none', firstId: 'c' },
      { beforeId: 'c', firstId: 'b' },
      { beforeId: 'b', firstId: 'a' },
    ])
  })

  it('drops a repeated first_id, so no range asks for a page no cursor returns', () => {
    expect(pageCursors('c\nc\nb\n').map((p) => `${p.beforeId} ${p.firstId}`)).toEqual(['none c', 'c b'])
  })
})

describe('splitEvenly', () => {
  it('cuts contiguous ranges whose sizes differ by at most one', () => {
    expect(splitEvenly([1, 2, 3, 4, 5, 6, 7], 3)).toEqual([[1, 2, 3], [4, 5], [6, 7]])
  })

  it('never makes an empty range', () => {
    expect(splitEvenly([1, 2], 4)).toEqual([[1], [2]])
    expect(splitEvenly([1], 0)).toEqual([[1]])
  })
})
