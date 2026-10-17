import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  decodeHtmlEntities,
  ghRequestArgs,
  listAll,
  PER_PAGE,
  paginate,
  parseNextLink,
  parseOwnerRepo,
  parseRestPage,
  pickFetchStrategy,
  type RestPage,
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

describe('paginate() over REST pages, by number', () => {
  const walkPagesByNumber = <T>(pageUrl: (page: number) => string, fetchPage: (url: string) => RestPage): T[] =>
    paginate<T>(pageUrl, (url) => parseRestPage<T>(fetchPage(url), url))

  // The real shape of GitHub's `rel="next"` on the `pulls` endpoint: the
  // numeric `repositories/{id}/…` form this environment's agent proxy rejects
  // (issue #848). A walker that follows it verbatim 403s on page 2.
  const NUMERIC_NEXT_LINK =
    '<https://api.github.com/repositories/1300192/pulls/42/files?per_page=100&page=2>; rel="next", ' +
    '<https://api.github.com/repositories/1300192/pulls/42/files?per_page=100&page=2>; rel="last"'

  const pageUrl = (page: number) =>
    `https://api.github.com/repos/feffef/terrarium/pulls/42/files?per_page=100&page=${page}`

  /** A fixture fetcher: serves `pages` in order and records every URL asked for. */
  function fixtureFetcher(pages: RestPage[]): { fetchPage: (url: string) => RestPage; requested: string[] } {
    const requested: string[] = []
    let index = 0
    return {
      requested,
      fetchPage: (url) => {
        requested.push(url)
        const page = pages[index++]
        if (!page) throw new Error(`fixture exhausted: unexpected request for ${url}`)
        return page
      },
    }
  }

  it('reaches page 2 by number instead of following the numeric next link', () => {
    const { fetchPage, requested } = fixtureFetcher([
      { status: '200', body: JSON.stringify([{ filename: 'a.ts' }]), linkHeader: NUMERIC_NEXT_LINK },
      { status: '200', body: JSON.stringify([{ filename: 'b.ts' }]), linkHeader: null },
    ])
    expect(walkPagesByNumber(pageUrl, fetchPage)).toEqual([{ filename: 'a.ts' }, { filename: 'b.ts' }])
    expect(requested).toEqual([pageUrl(1), pageUrl(2)])
    expect(requested.some((url) => url.includes('/repositories/'))).toBe(false)
  })

  it('stops after one page when there is no next link', () => {
    const { fetchPage, requested } = fixtureFetcher([
      { status: '200', body: JSON.stringify([{ filename: 'a.ts' }]), linkHeader: null },
    ])
    expect(walkPagesByNumber(pageUrl, fetchPage)).toEqual([{ filename: 'a.ts' }])
    expect(requested).toEqual([pageUrl(1)])
  })

  it('throws an explicit incomplete-scan error on a mid-walk rejection, never the short list', () => {
    const { fetchPage } = fixtureFetcher([
      { status: '200', body: JSON.stringify([{ filename: 'a.ts' }]), linkHeader: NUMERIC_NEXT_LINK },
      { status: '403', body: 'Numeric-ID repository paths are not supported through this proxy', linkHeader: null },
    ])
    expect(() => walkPagesByNumber(pageUrl, fetchPage)).toThrow(/INCOMPLETE at page 2 after 1 record/)
  })

  it('throws an explicit incomplete-scan error on a malformed page body', () => {
    const { fetchPage } = fixtureFetcher([{ status: '200', body: '<html>nope</html>', linkHeader: null }])
    expect(() => walkPagesByNumber(pageUrl, fetchPage)).toThrow(/INCOMPLETE at page 1 after 0 record/)
  })
})

describe('listAll() over REST', () => {
  let dir: string
  const path = process.env.PATH
  afterEach(() => {
    process.env.PATH = path
    rmSync(dir, { recursive: true, force: true })
  })

  it('carries its hint into the error a failed page throws', () => {
    dir = mkdtempSync(join(tmpdir(), 'fake-curl-'))
    // A curl that answers HTTP 500 for every request.
    writeFileSync(join(dir, 'curl'), '#!/bin/sh\nwhile [ $# -gt 0 ]; do [ "$1" = -o ] && : > "$2"; [ "$1" = -D ] && : > "$2"; shift; done\nprintf 500\n')
    chmodSync(join(dir, 'curl'), 0o755)
    process.env.PATH = `${dir}${delimiter}${path}`
    const access = { owner: 'o', repo: 'r', cwd: process.cwd(), strategy: 'rest' as const, token: 't' }
    expect(() => listAll(access, 'issues', {}, { hint: ' (HINT-MARK)' })).toThrow(/INCOMPLETE at page 1.*HTTP 500.*\(HINT-MARK\)/)
  })
})

describe('listAll() over gh', () => {
  let dir: string
  const path = process.env.PATH
  afterEach(() => {
    process.env.PATH = path
    rmSync(dir, { recursive: true, force: true })
  })

  // A `gh` that logs its argv and serves a full first page, then a short one.
  function fakeGh(): string {
    dir = mkdtempSync(join(tmpdir(), 'fake-gh-'))
    const log = join(dir, 'argv.log')
    writeFileSync(
      join(dir, 'gh'),
      `#!/usr/bin/env node
const fs = require('node:fs')
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)) + '\\n')
const url = process.argv.find((a) => a.startsWith('repos/')) ?? ''
const page = Number(new URL('https://x/' + url).searchParams.get('page'))
process.stdout.write(JSON.stringify(page === 1 ? Array.from({ length: ${PER_PAGE} }, (_, i) => i) : [${PER_PAGE}]))
`,
    )
    chmodSync(join(dir, 'gh'), 0o755)
    process.env.PATH = `${dir}${delimiter}${path}`
    return log
  }
  const access = { owner: 'o', repo: 'r', cwd: process.cwd(), strategy: 'gh' as const }

  it('pages by number, one gh call per page, and never uses --paginate', () => {
    const log = fakeGh()
    const records = listAll<number>(access, 'pulls', { state: 'closed' })
    expect(records).toHaveLength(PER_PAGE + 1)
    const calls = readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as string[])
    expect(calls.map((c) => c[3])).toEqual([
      `repos/o/r/pulls?state=closed&per_page=${PER_PAGE}&page=1`,
      `repos/o/r/pulls?state=closed&per_page=${PER_PAGE}&page=2`,
    ])
    expect(calls.flat()).not.toContain('--paginate')
  })

  it('stops early once `until` says the page is past its cutoff', () => {
    const log = fakeGh()
    expect(listAll<number>(access, 'pulls', {}, { until: () => true })).toHaveLength(PER_PAGE)
    expect(readFileSync(log, 'utf8').trim().split('\n')).toHaveLength(1)
  })
})
