// A REST-search script escape for `search_issues`/`search_pull_requests`
// (issue #1092): those MCP tools keep hitting 403s in ways the doc's old
// "~2 concurrent / ~49s backoff" prose (issue #952) didn't cover — two
// sessions hit it again after that fix merged. Prose asks an agent to
// self-apply a number; this retries for real instead. Modeled on
// `pushWithRetry` in `log-session.ts` (one immediate attempt, then growing
// delays), reusing `list-open-issues.ts`'s `gh`/REST strategy helpers rather
// than reimplementing them.
//
// Deliberately one page (`per_page=20`), no `Link` pagination: a keyword
// search is supposed to be narrow (`github-integration.md`'s own overflow
// guidance) — no `parseNextLink` needed here.
//
// Usage:  tsx scripts/search-issues.ts <query> [--pulls]
//   Searches this repo's issues (or, with --pulls, PRs) for <query> and
//   prints matches as JSON: { number, title, state, url, updatedAt }[].
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { decodeHtmlEntities, envToken, hasGhBinary, parseOwnerRepo, pickFetchStrategy } from './list-open-issues.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── Types ───────────────────────────────────────────────────────────────────

interface RawSearchRecord {
  number: number
  title: string
  state: string
  html_url: string
  updated_at: string
}

/** One search hit, decoded and trimmed to what a duplicate/lookup check needs. */
export interface SearchHit {
  number: number
  title: string
  state: string
  url: string
  updatedAt: string
}

/** One search attempt's outcome, as data rather than a thrown error — so the
 *  retry loop below decides purely by inspecting `status`, never by parsing
 *  an exception message. */
export type SearchAttempt = { ok: true; hits: RawSearchRecord[] } | { ok: false; status: string; message: string }

// ── Pure core (unit-tested) ──────────────────────────────────────────────────

/** GitHub's search endpoint rate-limits with 403 (primary or secondary limit)
 *  or 429 (abuse detection) — both worth retrying. Anything else (bad query,
 *  auth, 404) is a real failure that should surface right away. */
export function isRetryableStatus(status: string): boolean {
  return status === '403' || status === '429'
}

/** `gh api` wraps a failed call in prose but keeps the numeric status verbatim
 *  (e.g. "HTTP 403: API rate limit exceeded") — pull it back out so the `gh`
 *  and REST paths share one retry decision. */
export function extractHttpStatus(message: string): string | null {
  const m = message.match(/HTTP (\d{3})/)
  return m ? m[1]! : null
}

const RETRY_DELAYS_MS = [2000, 4000, 8000, 16000]

function sleep(ms: number): void {
  // Dependency-free synchronous block — same trick `pushWithRetry` uses, so
  // this stays a plain script with no new runtime dependency.
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/** One immediate attempt, then a growing backoff on a retryable status —
 *  the same shape as `pushWithRetry` in `log-session.ts`. A non-retryable
 *  failure throws immediately; a still-retryable one throws only once the
 *  backoff schedule is exhausted. `wait` is injectable so tests can drive
 *  the decision without actually sleeping. */
export function searchWithRetry(attempt: () => SearchAttempt, wait: (ms: number) => void = sleep): RawSearchRecord[] {
  const backoffs = [0, ...RETRY_DELAYS_MS]
  let last: { status: string; message: string } | null = null
  for (const [i, delay] of backoffs.entries()) {
    if (delay > 0) {
      console.error(`search attempt ${i} got HTTP ${last?.status}; retrying in ${delay / 1000}s…`)
      wait(delay)
    }
    const result = attempt()
    if (result.ok) return result.hits
    if (!isRetryableStatus(result.status)) throw new Error(result.message)
    last = result
  }
  throw new Error(last ? last.message : 'search failed with no attempts made')
}

function toHit(raw: RawSearchRecord): SearchHit {
  return {
    number: raw.number,
    title: decodeHtmlEntities(raw.title),
    state: raw.state,
    url: raw.html_url,
    updatedAt: raw.updated_at,
  }
}

function buildQuery(owner: string, repo: string, term: string, pulls: boolean): string {
  return `repo:${owner}/${repo} is:${pulls ? 'pr' : 'issue'} ${term}`
}

// ── GitHub shell (thin) ──────────────────────────────────────────────────────

function searchViaGh(query: string, cwd: string): SearchAttempt {
  try {
    const raw = execFileSync(
      'gh',
      ['api', '-X', 'GET', 'search/issues', '-f', `q=${query}`, '-f', 'per_page=20'],
      { cwd, encoding: 'utf8' },
    )
    return { ok: true, hits: ((JSON.parse(raw) as { items: RawSearchRecord[] }).items ?? []) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, status: extractHttpStatus(message) ?? 'unknown', message }
  }
}

// `curl`, not Node's built-in `fetch` — this environment's proxy is only
// honored by `curl`, not by `fetch` once the process is already running (see
// `list-open-issues.ts`'s `curlGetPage` for the full reasoning, issue #567).
function curlSearch(url: string, token: string, cwd: string): { status: string; body: string } {
  const dir = mkdtempSync(join(tmpdir(), 'search-issues-'))
  const bodyFile = join(dir, 'body')
  try {
    const status = execFileSync(
      'curl',
      [
        '-sS',
        '-o',
        bodyFile,
        '-w',
        '%{http_code}',
        '-H',
        `Authorization: Bearer ${token}`,
        '-H',
        'Accept: application/vnd.github+json',
        '-H',
        'User-Agent: terrarium-search-issues',
        url,
      ],
      { cwd, encoding: 'utf8' },
    ).trim()
    return { status, body: readFileSync(bodyFile, 'utf8') }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function searchViaRest(query: string, token: string, cwd: string): SearchAttempt {
  const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=20`
  const { status, body } = curlSearch(url, token, cwd)
  if (status[0] !== '2') {
    return { ok: false, status, message: `GitHub REST search failed: HTTP ${status}: ${body}` }
  }
  return { ok: true, hits: ((JSON.parse(body) as { items: RawSearchRecord[] }).items ?? []) }
}

const NO_ACCESS_PATH_MESSAGE =
  '`gh` is not installed and neither GH_TOKEN nor GITHUB_TOKEN is set. Fall back to the ' +
  'mcp__github__search_issues / mcp__github__search_pull_requests MCP tools.'

function readOriginUrl(cwd: string): string {
  return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' }).trim()
}

// ── Command ──────────────────────────────────────────────────────────────────

export function searchIssues(term: string, pulls: boolean, cwd = root): SearchHit[] {
  const ownerRepo = parseOwnerRepo(readOriginUrl(cwd))
  if (ownerRepo === null) throw new Error('could not parse owner/repo from origin remote')
  const query = buildQuery(ownerRepo.owner, ownerRepo.repo, term, pulls)
  const strategy = pickFetchStrategy(hasGhBinary(cwd), Boolean(envToken()))
  if (strategy === null) throw new Error(NO_ACCESS_PATH_MESSAGE)
  const raw =
    strategy === 'gh'
      ? searchWithRetry(() => searchViaGh(query, cwd))
      : searchWithRetry(() => searchViaRest(query, envToken()!, cwd))
  return raw.map(toHit)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`search-issues: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  const pulls = argv.includes('--pulls')
  const term = argv.filter((a) => a !== '--pulls').join(' ')
  if (!term) fail('usage: tsx scripts/search-issues.ts <query> [--pulls]')
  process.stdout.write(JSON.stringify(searchIssues(term, pulls), null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
