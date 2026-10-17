// The one GitHub client the issue/PR scripts share (#2185): a `gh` path and a
// `curl` fallback for `gh`-less remote sessions (#505). `curl`, not Node's
// `fetch`: outbound HTTPS goes through an agent proxy that `curl` honors and
// undici only honors with `NODE_USE_ENV_PROXY=1` set before the process
// starts (#567).
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type FetchStrategy = 'gh' | 'rest'

/** The page size every listing asks for (GitHub's maximum). */
export const PER_PAGE = 100

/** GitHub HTML-entity-encodes issue text in this environment (see
 *  `docs/agents/github-integration.md`); decode the entities it emits. */
export function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&#39;/g, "'")
}

/** `{ owner, repo }` from a git remote URL: `git@host:o/r.git`,
 *  `https://host/o/r.git` and the proxied `http://user@host:port/git/o/r`
 *  all end in the same two segments once `:` and `/` both separate. */
export function parseOwnerRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const segments = remoteUrl
    .replace(/\.git$/, '')
    .split(/[/:]+/)
    .filter(Boolean)
  if (segments.length < 2) return null
  return { owner: segments[segments.length - 2]!, repo: segments[segments.length - 1]! }
}

/** `gh` when present; `rest` when only a token is; `null` when neither. */
export function pickFetchStrategy(hasGh: boolean, hasToken: boolean): FetchStrategy | null {
  if (hasGh) return 'gh'
  if (hasToken) return 'rest'
  return null
}

/** The `rel="next"` URL of a `Link` response header, if any. */
export function parseNextLink(linkHeader: string | null): string | null {
  if (!linkHeader) return null
  for (const part of linkHeader.split(',')) {
    const m = part.match(/<([^>]+)>;\s*rel="next"/)
    if (m) return m[1]!
  }
  return null
}

export function hasGhBinary(cwd: string): boolean {
  try {
    execFileSync('gh', ['--version'], { cwd, stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

export function envToken(): string | undefined {
  return process.env.GH_TOKEN || process.env.GITHUB_TOKEN
}

export function readOriginUrl(cwd: string): string {
  return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' }).trim()
}

/** Where to read and how: the origin's repo plus the usable access path. */
export type Access = { owner: string; repo: string; cwd: string } & (
  | { strategy: 'gh' }
  | { strategy: 'rest'; token: string }
)

export const NO_ACCESS_MESSAGE =
  'no GitHub access path available: `gh` is not installed and neither GH_TOKEN nor GITHUB_TOKEN is set'

export function resolveAccess(cwd: string): Access {
  const originUrl = readOriginUrl(cwd)
  const ownerRepo = parseOwnerRepo(originUrl)
  if (ownerRepo === null) throw new Error(`could not parse owner/repo from origin remote: ${originUrl}`)
  const token = envToken()
  const strategy = pickFetchStrategy(hasGhBinary(cwd), Boolean(token))
  if (strategy === null) throw new Error(NO_ACCESS_MESSAGE)
  return strategy === 'gh' ? { ...ownerRepo, cwd, strategy } : { ...ownerRepo, cwd, strategy, token: token! }
}

/** One raw REST page: status code, body text, and the `Link` header. */
export interface RestPage {
  status: string
  body: string
  linkHeader: string | null
}

export type HttpMethod = 'GET' | 'PUT' | 'PATCH'

/** One authenticated request (a GET unless `opts.method` says otherwise). `-D`/`-w`
 *  split the response into a header file (for `Link`) and a status code; the
 *  body goes to its own temp file. */
export function curlPage(
  url: string,
  token: string,
  cwd: string,
  { accept = 'application/vnd.github+json', method, json }: { accept?: string; method?: HttpMethod; json?: unknown } = {},
): RestPage {
  const dir = mkdtempSync(join(tmpdir(), 'github-client-'))
  const headerFile = join(dir, 'headers')
  const bodyFile = join(dir, 'body')
  try {
    const status = execFileSync(
      'curl',
      [
        '-sS',
        '-o',
        bodyFile,
        '-D',
        headerFile,
        '-w',
        '%{http_code}',
        ...(method ? ['-X', method] : []),
        ...(json === undefined ? [] : ['-H', 'Content-Type: application/json', '--data', JSON.stringify(json)]),
        '-H',
        `Authorization: Bearer ${token}`,
        '-H',
        `Accept: ${accept}`,
        '-H',
        'User-Agent: terrarium-scripts',
        url,
      ],
      { cwd, encoding: 'utf8' },
    ).trim()
    const body = readFileSync(bodyFile, 'utf8')
    const linkLine = readFileSync(headerFile, 'utf8')
      .split(/\r?\n/)
      .find((l) => /^link:/i.test(l))
    return { status, body, linkHeader: linkLine ? linkLine.slice(linkLine.indexOf(':') + 1).trim() : null }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function assertOk(status: string, url: string): void {
  if (status[0] !== '2') throw new Error(`GitHub REST API request to ${url} failed: HTTP ${status}`)
}

/** A page's records, and whether another page follows by its `Link` header. */
export function parseRestPage<T>(page: RestPage, url: string): { records: T[]; more: boolean } {
  assertOk(page.status, url)
  let records: T[]
  try {
    records = JSON.parse(page.body) as T[]
  } catch (err) {
    throw new Error(`GitHub REST API request to ${url} returned a malformed JSON body`, { cause: err })
  }
  return { records, more: parseNextLink(page.linkHeader) !== null }
}

/** `gh api` arguments for one request; a body is flat string fields (`-f`), which
 *  GitHub reads as the JSON body of a write. */
export function ghRequestArgs(method: HttpMethod, path: string, fields: Record<string, string> = {}): string[] {
  return ['api', '--method', method, path, ...Object.entries(fields).flatMap(([k, v]) => ['-f', `${k}=${v}`])]
}

/** `repos/{owner}/{repo}/<path>`: every request below takes a repo-relative path. */
export function repoPath(a: Access, path: string): string {
  return `repos/${a.owner}/${a.repo}/${path}`
}

/** One request to a repo-relative path with an optional flat-string JSON body (a
 *  merge, a close), parsed (`undefined` for an empty reply), via the access path
 *  `resolveAccess` chose. A failure's message carries GitHub's reply. */
export function requestJson<T>(a: Access, method: HttpMethod, path: string, fields?: Record<string, string>): T {
  const full = repoPath(a, path)
  if (a.strategy === 'gh') {
    const raw = execFileSync('gh', ghRequestArgs(method, full, fields), {
      cwd: a.cwd,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'], // a failure's stderr rides on the thrown error
    })
    return (raw.trim() ? JSON.parse(raw) : undefined) as T
  }
  const url = `https://api.github.com/${full}`
  const { status, body } = curlPage(url, a.token, a.cwd, { method, json: fields })
  if (status[0] !== '2') throw new Error(`GitHub REST API ${method} ${url} failed: HTTP ${status}: ${body}`)
  return (body.length > 0 ? JSON.parse(body) : undefined) as T
}

/** One GET of a repo-relative path, parsed. */
export function getJson<T>(a: Access, path: string): T {
  return requestJson<T>(a, 'GET', path)
}

/** Walks pages by NUMBER on our own URL and never follows GitHub's `Link` URL:
 *  for `pulls` its `rel="next"` is the numeric `repositories/{id}/…` form this
 *  environment's agent proxy 403s (#848, #1514). A page says whether another
 *  follows (`more`); without that, a page shorter than `perPage` is the last.
 *  Throws on any mid-walk failure rather than return the pages already read: a
 *  partial listing that reads as complete is the failure #738 and #848 removed.
 *  `hint` is appended to that error for callers whose verdict a partial read
 *  would corrupt. */
export function paginate<T>(
  pageUrl: (page: number) => string,
  fetchPage: (url: string) => { records: T[]; more?: boolean },
  perPage = PER_PAGE,
  hint = '',
): T[] {
  const out: T[] = []
  for (let page = 1; ; page++) {
    let result: { records: T[]; more?: boolean }
    try {
      result = fetchPage(pageUrl(page))
    } catch (err) {
      const cause = err instanceof Error ? err.message : String(err)
      throw new Error(`paged listing INCOMPLETE at page ${page} after ${out.length} record(s): ${cause}${hint}`, { cause: err })
    }
    out.push(...result.records)
    if (!(result.more ?? result.records.length >= perPage)) return out
  }
}

/** The paged `repos/{owner}/{repo}/<path>` listing as records, paged by number
 *  through `paginate` on both `gh` and `curl`, so it is safe behind the proxy
 *  (never `gh api --paginate`, which follows `Link`).
 *  `accept` overrides the media type (the timeline API needs a preview one);
 *  `hint` is `paginate`'s; `until` stops after the first page it returns true
 *  for (a newest-first listing past its cutoff). */
export function listAll<T>(
  a: Access,
  path: string,
  params: Record<string, string> = {},
  { accept, hint, until }: { accept?: string; hint?: string; until?: (page: T[]) => boolean } = {},
): T[] {
  const full = repoPath(a, path)
  const url = (page: number) =>
    `${a.strategy === 'gh' ? '' : 'https://api.github.com/'}${full}?${new URLSearchParams({ ...params, per_page: String(PER_PAGE), page: String(page) })}`
  const fetchRaw = (pageUrl: string): { records: T[]; more: boolean } => {
    if (a.strategy === 'rest') return parseRestPage<T>(curlPage(pageUrl, a.token, a.cwd, { accept }), pageUrl)
    const raw = execFileSync('gh', ['api', '--method', 'GET', pageUrl, ...(accept ? ['-H', `Accept: ${accept}`] : [])], {
      cwd: a.cwd,
      encoding: 'utf8',
      maxBuffer: 256 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'], // a failure's stderr rides on the thrown error
    })
    const records = JSON.parse(raw) as T[]
    return { records, more: records.length >= PER_PAGE }
  }
  return paginate<T>(
    url,
    (pageUrl) => {
      const { records, more } = fetchRaw(pageUrl)
      return { records, more: more && records.length > 0 && !until?.(records) }
    },
    PER_PAGE,
    hint,
  )
}
