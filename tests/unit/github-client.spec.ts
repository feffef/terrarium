import { describe, expect, it } from 'vitest'
import {
  decodeHtmlEntities,
  ghRequestArgs,
  paginate,
  parseNextLink,
  parseOwnerRepo,
  parseRestPage,
  pickFetchStrategy,
} from '../../scripts/lib/github-client.ts'

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

describe('decodeHtmlEntities()', () => {
  it('decodes the entities GitHub actually emits', () => {
    expect(decodeHtmlEntities('Tools &amp; tests')).toBe('Tools & tests')
    expect(decodeHtmlEntities('&lt;script&gt;')).toBe('<script>')
    expect(decodeHtmlEntities('say &quot;hi&quot;')).toBe('say "hi"')
    expect(decodeHtmlEntities('&#34;quoted&#34;')).toBe('"quoted"')
    expect(decodeHtmlEntities("it&#39;s")).toBe("it's")
  })
  it('leaves plain text untouched', () => {
    expect(decodeHtmlEntities('no entities here')).toBe('no entities here')
  })
})

describe('parseOwnerRepo()', () => {
  it('parses an SSH remote URL', () => {
    expect(parseOwnerRepo('git@github.com:feffef/terrarium.git')).toEqual({
      owner: 'feffef',
      repo: 'terrarium',
    })
  })
  it('parses an HTTPS remote URL', () => {
    expect(parseOwnerRepo('https://github.com/feffef/terrarium.git')).toEqual({
      owner: 'feffef',
      repo: 'terrarium',
    })
  })
  it('parses this environment\'s proxied remote URL', () => {
    expect(parseOwnerRepo('http://local_proxy@127.0.0.1:41729/git/feffef/terrarium')).toEqual({
      owner: 'feffef',
      repo: 'terrarium',
    })
  })
  it('returns null when there are not enough path segments', () => {
    expect(parseOwnerRepo('terrarium')).toBeNull()
  })
})

describe('pickFetchStrategy()', () => {
  it('prefers gh when the binary is present, regardless of token', () => {
    expect(pickFetchStrategy(true, true)).toBe('gh')
    expect(pickFetchStrategy(true, false)).toBe('gh')
  })
  it('falls back to rest when gh is absent but a token is available (issue #505)', () => {
    expect(pickFetchStrategy(false, true)).toBe('rest')
  })
  it('returns null when neither is available', () => {
    expect(pickFetchStrategy(false, false)).toBeNull()
  })
})

describe('parseNextLink()', () => {
  it('extracts the rel="next" URL from a GitHub Link header', () => {
    const header =
      '<https://api.github.com/repos/x/y/issues?page=2>; rel="next", <https://api.github.com/repos/x/y/issues?page=5>; rel="last"'
    expect(parseNextLink(header)).toBe('https://api.github.com/repos/x/y/issues?page=2')
  })
  it('returns null when there is no next link (last page)', () => {
    const header = '<https://api.github.com/repos/x/y/issues?page=1>; rel="prev"'
    expect(parseNextLink(header)).toBeNull()
  })
  it('returns null for a null header', () => {
    expect(parseNextLink(null)).toBeNull()
  })
})

describe('ghRequestArgs()', () => {
  it('sends a write body as flat -f fields', () => {
    expect(ghRequestArgs('PUT', 'repos/o/r/pulls/1/merge', { merge_method: 'merge', sha: 'abc' })).toEqual([
      'api', '--method', 'PUT', 'repos/o/r/pulls/1/merge', '-f', 'merge_method=merge', '-f', 'sha=abc',
    ])
  })
  it('keeps a GET query in the path', () => {
    expect(ghRequestArgs('GET', 'repos/o/r/issues?per_page=100')).toEqual(['api', '--method', 'GET', 'repos/o/r/issues?per_page=100'])
  })
})
