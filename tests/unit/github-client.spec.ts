import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  decodeHtmlEntities,
  ghRequestArgs,
  listAll,
  PER_PAGE,
  parseNextLink,
  parseOwnerRepo,
  parseRestPage,
  pickFetchStrategy,
} from '../../scripts/lib/github-client.ts'

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

describe('listAll() over REST', () => {
  let dir: string
  const path = process.env.PATH
  afterEach(() => {
    process.env.PATH = path
    rmSync(dir, { recursive: true, force: true })
  })

  const access = { owner: 'o', repo: 'r', cwd: process.cwd(), strategy: 'rest' as const, token: 't' }
  // The real shape of GitHub's `rel="next"` on the `pulls` endpoint: the
  // numeric `repositories/{id}/…` form this environment's agent proxy rejects
  // (issue #848). A walker that follows it verbatim 403s on page 2.
  const NUMERIC_NEXT_LINK =
    '<https://api.github.com/repositories/1/pulls?per_page=100&page=2>; rel="next", ' +
    '<https://api.github.com/repositories/1/pulls?per_page=100&page=2>; rel="last"'
  const pageUrl = (n: number) => `https://api.github.com/repos/o/r/pulls?per_page=${PER_PAGE}&page=${n}`

  // A `curl` serving `pages` in call order and logging each requested URL.
  function fakeCurl(pages: { status: string; body: string; link?: string }[]): () => string[] {
    dir = mkdtempSync(join(tmpdir(), 'fake-curl-'))
    writeFileSync(join(dir, 'pages.json'), JSON.stringify(pages))
    writeFileSync(
      join(dir, 'curl'),
      `#!/usr/bin/env node
const fs = require('node:fs')
const a = process.argv.slice(2)
const val = (f) => a[a.indexOf(f) + 1]
fs.appendFileSync(${JSON.stringify(join(dir, 'urls.log'))}, a[a.length - 1] + '\\n')
const n = fs.readFileSync(${JSON.stringify(join(dir, 'urls.log'))}, 'utf8').trim().split('\\n').length - 1
const p = JSON.parse(fs.readFileSync(${JSON.stringify(join(dir, 'pages.json'))}, 'utf8'))[n]
if (!p) process.exit(7)
fs.writeFileSync(val('-o'), p.body)
fs.writeFileSync(val('-D'), p.link ? 'HTTP/2 ' + p.status + '\\r\\nLink: ' + p.link + '\\r\\n' : '')
process.stdout.write(p.status)
`,
    )
    chmodSync(join(dir, 'curl'), 0o755)
    process.env.PATH = `${dir}${delimiter}${path}`
    return () => readFileSync(join(dir, 'urls.log'), 'utf8').trim().split('\n')
  }

  it('reaches page 2 by number instead of following the numeric next link', () => {
    const requested = fakeCurl([
      { status: '200', body: '[1]', link: NUMERIC_NEXT_LINK },
      { status: '200', body: '[2]' },
    ])
    expect(listAll<number>(access, 'pulls')).toEqual([1, 2])
    expect(requested()).toEqual([pageUrl(1), pageUrl(2)])
  })

  it('stops after one page when there is no next link, whatever its length', () => {
    const requested = fakeCurl([{ status: '200', body: '[1]' }])
    expect(listAll<number>(access, 'pulls')).toEqual([1])
    expect(requested()).toEqual([pageUrl(1)])
  })

  it('throws an incomplete-listing error on a mid-walk rejection, never the short list', () => {
    fakeCurl([
      { status: '200', body: '[1]', link: NUMERIC_NEXT_LINK },
      { status: '403', body: 'Numeric-ID repository paths are not supported through this proxy' },
    ])
    expect(() => listAll(access, 'pulls')).toThrow(/INCOMPLETE at page 2 after 1 record.*HTTP 403/)
  })

  it('throws an incomplete-listing error on a malformed page body', () => {
    fakeCurl([{ status: '200', body: '<html>nope</html>' }])
    expect(() => listAll(access, 'pulls')).toThrow(/INCOMPLETE at page 1 after 0 record/)
  })

  it('carries its hint into the error a failed page throws', () => {
    fakeCurl([{ status: '500', body: '' }])
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

  // A `gh` that logs its argv and serves a full first page, then page 2 per `second`.
  function fakeGh(second: 'short' | 'empty' | 'fail' = 'short'): string {
    dir = mkdtempSync(join(tmpdir(), 'fake-gh-'))
    const log = join(dir, 'argv.log')
    writeFileSync(
      join(dir, 'gh'),
      `#!/usr/bin/env node
const fs = require('node:fs')
fs.appendFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)) + '\\n')
const url = process.argv.find((a) => a.startsWith('repos/')) ?? ''
const page = Number(new URL('https://x/' + url).searchParams.get('page'))
if (page > 1 && ${JSON.stringify(second)} === 'fail') { console.error('boom'); process.exit(1) }
const rest = ${JSON.stringify(second)} === 'empty' ? [] : [${PER_PAGE}]
process.stdout.write(JSON.stringify(page === 1 ? Array.from({ length: ${PER_PAGE} }, (_, i) => i) : rest))
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

  it('stops on an empty page when the last full page was exactly per_page long', () => {
    const log = fakeGh('empty')
    expect(listAll<number>(access, 'pulls')).toHaveLength(PER_PAGE)
    expect(readFileSync(log, 'utf8').trim().split('\n')).toHaveLength(2)
  })

  it('throws on a later-page failure instead of returning the pages already read', () => {
    fakeGh('fail')
    expect(() => listAll(access, 'pulls')).toThrow(new RegExp(`INCOMPLETE at page 2 after ${PER_PAGE} record\\(s\\)`))
  })

  it('stops early once `until` says the page is past its cutoff', () => {
    const log = fakeGh()
    expect(listAll<number>(access, 'pulls', {}, { until: () => true })).toHaveLength(PER_PAGE)
    expect(readFileSync(log, 'utf8').trim().split('\n')).toHaveLength(1)
  })
})
