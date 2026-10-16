import { describe, expect, it } from 'vitest'
import { paginate, parseRestPage } from '../../scripts/lib/github-client.ts'

describe('paginate()', () => {
  const url = (page: number) => `u${page}`

  it('stops when a page says there is no more, whatever its length', () => {
    const pages = [{ records: [1, 2], more: true }, { records: [3], more: false }]
    expect(paginate<number>(url, (u) => pages[Number(u.slice(1)) - 1]!)).toEqual([1, 2, 3])
  })

  it('without `more`, a page shorter than perPage is the last', () => {
    const pages = [[1, 2], [3]]
    expect(paginate<number>(url, (u) => ({ records: pages[Number(u.slice(1)) - 1]! }), 2)).toEqual([1, 2, 3])
  })

  it('names the page, the records so far and the hint when a page fails', () => {
    const fetchPage = (u: string) => {
      if (u === 'u2') throw new Error('boom')
      return { records: [1], more: true }
    }
    expect(() => paginate<number>(url, fetchPage, 100, ' (hint)')).toThrow(
      'paged listing INCOMPLETE at page 2 after 1 record(s): boom (hint)',
    )
  })
})

describe('parseRestPage()', () => {
  it('reads records and the Link header as the more-signal', () => {
    const link = '<https://api.github.com/x?page=2>; rel="next"'
    expect(parseRestPage<number>({ status: '200', body: '[1]', linkHeader: link }, 'u')).toEqual({ records: [1], more: true })
    expect(parseRestPage<number>({ status: '200', body: '[1]', linkHeader: null }, 'u').more).toBe(false)
  })

  it('rejects a non-2xx status and a malformed body', () => {
    expect(() => parseRestPage({ status: '403', body: '', linkHeader: null }, 'u')).toThrow('HTTP 403')
    expect(() => parseRestPage({ status: '200', body: '<html>', linkHeader: null }, 'u')).toThrow('malformed JSON')
  })
})
