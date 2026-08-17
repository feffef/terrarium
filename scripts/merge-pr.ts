// The poll-then-merge helper (issue #667): `enable_pr_auto_merge` is for
// arming a still-pending PR (`docs/agents/pr-workflow.md`'s recipe, step 5),
// not for landing one that's already green or about to be — calling it there
// throws a misleading error ("required checks are failing" while a check is
// merely `in_progress`, or "protected branch rules not configured" once
// actually green — issue #385). #385's fix was doc-only guidance to manually
// re-check `pull_request_read`/`get_check_runs` and retry — correct, but a
// hand-rolled round-trip every session. This script does that round-trip once:
// poll the PR's check runs with a short interval until they resolve
// (green/red/timeout), then merge directly on green — no `enable_pr_auto_merge`
// call at all.
//
// Fetch/merge strategy mirrors `list-open-issues.ts`'s `gh`/`rest` switch
// (issue #505's `gh`-less fallback): `gh api` (never `gh pr`/`gh issue`, which
// route through GraphQL and can hit this environment's proxy restrictions —
// see `list-open-issues.ts`'s header) when the `gh` binary is present, a
// direct authenticated REST call via `curl` (not `fetch` — issue #567) when it
// is not. The strategy switch itself (`pickFetchStrategy`, `hasGhBinary`,
// `envToken`) is single-homed in `list-open-issues.ts` and imported below.
//
// Usage:  tsx scripts/merge-pr.ts <pr-number> [--merge-method merge|squash|rebase] [--interval-ms N] [--timeout-ms N]
//   Polls the PR's head-commit check runs every `interval-ms` (default 15s)
//   until they resolve or `timeout-ms` (default 20 minutes) elapses, then:
//     - all green  → merges via the given method (default `merge`, matching
//       this repo's existing merge-commit convention) and prints the result.
//     - any red    → prints the failing check names, does not merge.
//     - timeout    → prints the still-unresolved state, does not merge.
//   Exits 0 only when the merge actually happened; 1 otherwise (red, timeout,
//   or a merge-call error) — an unmerged PR is a caller-actionable outcome,
//   not a script bug, but still worth a non-zero exit for CI/scripting.
//
// Closing-keyword reconciliation (issue #983): GitHub's own auto-close on
// merge does not always close every issue a PR's `Closes #N`/`Fixes #N`
// keywords name. Confirmed on PR #955 (four issues, one `Closes #N` per
// line — a well-formed body by GitHub's own documented syntax): only #948
// auto-closed; #950/#952/#954 sat open for two days until a human closed
// them by hand. Two theories were checked and *ruled out* against fresh
// evidence rather than assumed: it is not a missing-keyword-repetition
// formatting problem (#955's body already repeated `Closes` before every
// number), and it is not the merge commit's own message driving the close —
// PR #985 (two issues, same script, same default `--merge-method merge`)
// closed both correctly on merge even though its underlying commit carries
// no closing keyword at all, proving the close comes from the PR
// *description*, not the commit that lands on `main`. #985 also rules out a
// systemic defect in this script's REST/`gh api` merge call itself: the
// identical call closed 2-for-2 there. What's actually left unconfirmed is
// why #955 specifically dropped 3 of its 4 well-formed references — the
// evidence points at an intermittent reliability limit in GitHub's own
// multi-issue-closing pipeline, not anything this script's request shape
// controls, but that mechanism itself is unverified. Rather than chase it
// further, this script re-checks every issue its own merged PR named with a
// closing keyword and closes any GitHub's auto-close left open — a
// self-healing safety net that doesn't depend on ever nailing the exact
// GitHub-side trigger.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  envToken,
  hasGhBinary,
  parseOwnerRepo,
  pickFetchStrategy,
  type FetchStrategy,
} from './list-open-issues.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const DEFAULT_INTERVAL_MS = 15_000
const DEFAULT_TIMEOUT_MS = 20 * 60_000

// ── Types ───────────────────────────────────────────────────────────────────

export type MergeMethod = 'merge' | 'squash' | 'rebase'

/** One raw check-run record off the GitHub REST/`gh api`
 *  `commits/{ref}/check-runs` endpoint, trimmed to what a verdict needs. */
export interface RawCheckRun {
  name: string
  status: 'queued' | 'in_progress' | 'completed'
  conclusion: string | null
}

export type ChecksVerdict = 'pending' | 'green' | 'red'

export interface PollOptions {
  intervalMs: number
  timeoutMs: number
}

export interface MergeResult {
  pr: number
  verdict: ChecksVerdict
  merged: boolean
  mergeCommitSha?: string
  message: string
  /** Issues this run's closing-keyword reconciliation closed itself because
   *  GitHub's own auto-close didn't (issue #983) — empty when the PR named no
   *  issues, or when every named issue was already closed by GitHub. */
  reconciledClosedIssues?: number[]
}

// ── Pure core (unit-tested) ──────────────────────────────────────────────────

/** `completed` conclusions that count as a real failure — mirrors
 *  `docs/agents/pr-workflow.md`'s "a check reporting `in_progress` is not the
 *  same as failing" guidance from the other direction: only these conclusions
 *  fail a check; `success`/`neutral`/`skipped` do not. */
const FAILING_CONCLUSIONS = new Set(['failure', 'cancelled', 'timed_out', 'action_required', 'stale'])

/** The overall verdict for a set of check runs on one commit: `pending` while
 *  any run hasn't reported `completed` yet (including no runs at all — a
 *  workflow that hasn't started reporting is not the same as "nothing to
 *  check"), `red` once any completed run's conclusion is a real failure, and
 *  `green` only once every run is completed with a non-failing conclusion. */
export function verdictFromCheckRuns(runs: RawCheckRun[]): ChecksVerdict {
  if (runs.length === 0) return 'pending'
  // A real failure is final regardless of what else is still running — no
  // point waiting out a slow sibling job once one check has already failed.
  if (runs.some((r) => r.conclusion !== null && FAILING_CONCLUSIONS.has(r.conclusion))) return 'red'
  if (runs.some((r) => r.status !== 'completed')) return 'pending'
  return 'green'
}

/** The names of the runs that make a `red` verdict red — for the failure
 *  message a caller sees instead of a bare "checks failed". */
export function failingCheckNames(runs: RawCheckRun[]): string[] {
  return runs.filter((r) => r.conclusion !== null && FAILING_CONCLUSIONS.has(r.conclusion)).map((r) => r.name)
}

/** The `gh pr merge`-style boolean flag for a merge method — pure mapping,
 *  kept separate from the `gh api` call below (which uses the equivalent
 *  `merge_method` REST field instead, see the header comment for why `gh api`
 *  over `gh pr`) so this stays independently testable. */
export function mergeMethodFlag(method: MergeMethod): string {
  return `--${method}`
}

// ── Closing-keyword reconciliation (pure, issue #983) ────────────────────────

/** GitHub's documented closing keywords: `close(s|d)`, `fix(es|ed)`,
 *  `resolve(s|d)`. The capture group grabs the keyword's own `#N` plus any
 *  further `#N`s joined by a comma (optionally with "and") — the shape GitHub
 *  itself does *not* treat as additional closing references (only the first
 *  `#N` right after the keyword is), but which this reconciliation step
 *  treats as the same intent and closes in full (see header comment). A bare
 *  `owner/repo#N` cross-repo reference is deliberately not matched — this
 *  reconciliation only ever targets this repo's own issues. */
const CLOSING_KEYWORD_RE = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\b((?:\s+#\d+|\s*,\s*(?:and\s+)?#\d+)+)/gi

/** Every issue number named by a closing keyword anywhere in `body`,
 *  deduplicated and ascending. Pure and independently testable — the actual
 *  network calls to verify/close each number happen only in `mergePrWhenGreen`. */
export function parseClosingKeywordIssues(body: string): number[] {
  const found = new Set<number>()
  for (const match of body.matchAll(CLOSING_KEYWORD_RE)) {
    for (const numMatch of match[1]!.matchAll(/#(\d+)/g)) {
      found.add(Number(numMatch[1]))
    }
  }
  return [...found].sort((a, b) => a - b)
}

// ── Poll loop ─────────────────────────────────────────────────────────────────

const sleep = (ms: number): Promise<void> => new Promise((res) => setTimeout(res, ms))

/** Poll `fetchRuns` every `intervalMs` until `verdictFromCheckRuns` resolves to
 *  something other than `pending`, or `timeoutMs` elapses (in which case the
 *  last-seen `pending` verdict and runs are returned rather than throwing —
 *  a timeout is a caller-actionable outcome, not an error). */
export async function pollUntilResolved(
  fetchRuns: () => Promise<RawCheckRun[]>,
  opts: PollOptions,
): Promise<{ verdict: ChecksVerdict; runs: RawCheckRun[] }> {
  const deadline = Date.now() + opts.timeoutMs
  for (;;) {
    const runs = await fetchRuns()
    const verdict = verdictFromCheckRuns(runs)
    if (verdict !== 'pending') return { verdict, runs }
    if (Date.now() >= deadline) return { verdict: 'pending', runs }
    await sleep(opts.intervalMs)
  }
}

// ── GitHub shell (thin) ──────────────────────────────────────────────────────

function readOriginUrl(cwd: string): string {
  return execFileSync('git', ['remote', 'get-url', 'origin'], { cwd, encoding: 'utf8' }).trim()
}

/** A PR's head SHA (for check-run polling) and body (for closing-keyword
 *  reconciliation, issue #983) — one GET, both fields, since both are read
 *  from the same `pulls/{number}` record. */
export interface PrMeta {
  sha: string
  body: string
}

function readPrMetaViaGh(owner: string, repo: string, prNumber: number, cwd: string): PrMeta {
  const raw = execFileSync(
    'gh',
    ['api', '--method', 'GET', `repos/${owner}/${repo}/pulls/${prNumber}`, '--jq', '{sha: .head.sha, body: .body}'],
    { cwd, encoding: 'utf8' },
  )
  const parsed = JSON.parse(raw) as { sha: string; body: string | null }
  return { sha: parsed.sha, body: parsed.body ?? '' }
}

function readCheckRunsViaGh(owner: string, repo: string, sha: string, cwd: string): RawCheckRun[] {
  const raw = execFileSync(
    'gh',
    [
      'api',
      '--method',
      'GET',
      `repos/${owner}/${repo}/commits/${sha}/check-runs`,
      '-f',
      'per_page=100',
      '--jq',
      '.check_runs',
    ],
    { cwd, encoding: 'utf8' },
  )
  return JSON.parse(raw) as RawCheckRun[]
}

function mergePrViaGh(owner: string, repo: string, prNumber: number, mergeMethod: MergeMethod, cwd: string): string {
  return execFileSync(
    'gh',
    [
      'api',
      '--method',
      'PUT',
      `repos/${owner}/${repo}/pulls/${prNumber}/merge`,
      '-f',
      `merge_method=${mergeMethod}`,
      '--jq',
      '.sha',
    ],
    { cwd, encoding: 'utf8' },
  ).trim()
}

// `curl`, not Node's built-in `fetch`: same proxy-auth reason
// `poll-guest-tickets.ts`'s `curlGetPage` documents (issue #567). Unlike the
// sibling scripts' `curlGetPage`, this also needs a `PUT` with a JSON body
// (the merge call) — folded into one helper since neither of this script's
// two REST reads (`pulls/{number}`, `commits/{sha}/check-runs`) need `Link`
// pagination (a single PR's check-run set fits in one `per_page=100` page).
function curlRequestJson(
  method: 'GET' | 'PUT' | 'PATCH',
  url: string,
  token: string,
  cwd: string,
  body?: unknown,
): unknown {
  const dir = mkdtempSync(join(tmpdir(), 'merge-pr-'))
  const bodyFile = join(dir, 'body')
  try {
    const args = [
      '-sS',
      '-o',
      bodyFile,
      '-w',
      '%{http_code}',
      '-X',
      method,
      '-H',
      `Authorization: Bearer ${token}`,
      '-H',
      'Accept: application/vnd.github+json',
      '-H',
      'User-Agent: terrarium-merge-pr',
    ]
    if (body !== undefined) {
      args.push('-H', 'Content-Type: application/json', '--data', JSON.stringify(body))
    }
    args.push(url)
    const status = execFileSync('curl', args, { cwd, encoding: 'utf8' }).trim()
    const responseBody = readFileSync(bodyFile, 'utf8')
    if (status[0] !== '2') {
      throw new Error(`GitHub REST API ${method} ${url} failed: HTTP ${status}: ${responseBody}`)
    }
    return responseBody.length > 0 ? JSON.parse(responseBody) : undefined
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

function readPrMetaViaRest(owner: string, repo: string, prNumber: number, token: string, cwd: string): PrMeta {
  const pr = curlRequestJson('GET', `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, token, cwd) as {
    head: { sha: string }
    body: string | null
  }
  return { sha: pr.head.sha, body: pr.body ?? '' }
}

function readCheckRunsViaRest(owner: string, repo: string, sha: string, token: string, cwd: string): RawCheckRun[] {
  const result = curlRequestJson(
    'GET',
    `https://api.github.com/repos/${owner}/${repo}/commits/${sha}/check-runs?per_page=100`,
    token,
    cwd,
  ) as { check_runs: RawCheckRun[] }
  return result.check_runs
}

function mergePrViaRest(
  owner: string,
  repo: string,
  prNumber: number,
  mergeMethod: MergeMethod,
  token: string,
  cwd: string,
): string {
  const result = curlRequestJson(
    'PUT',
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`,
    token,
    cwd,
    { merge_method: mergeMethod },
  ) as { sha: string }
  return result.sha
}

function readIssueStateViaGh(owner: string, repo: string, issueNumber: number, cwd: string): string {
  return execFileSync(
    'gh',
    ['api', '--method', 'GET', `repos/${owner}/${repo}/issues/${issueNumber}`, '--jq', '.state'],
    { cwd, encoding: 'utf8' },
  ).trim()
}

function readIssueStateViaRest(owner: string, repo: string, issueNumber: number, token: string, cwd: string): string {
  const issue = curlRequestJson(
    'GET',
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    token,
    cwd,
  ) as { state: string }
  return issue.state
}

function closeIssueViaGh(owner: string, repo: string, issueNumber: number, cwd: string): void {
  execFileSync(
    'gh',
    [
      'api',
      '--method',
      'PATCH',
      `repos/${owner}/${repo}/issues/${issueNumber}`,
      '-f',
      'state=closed',
      '-f',
      'state_reason=completed',
    ],
    { cwd, encoding: 'utf8' },
  )
}

function closeIssueViaRest(owner: string, repo: string, issueNumber: number, token: string, cwd: string): void {
  curlRequestJson(
    'PATCH',
    `https://api.github.com/repos/${owner}/${repo}/issues/${issueNumber}`,
    token,
    cwd,
    { state: 'closed', state_reason: 'completed' },
  )
}

function readPrMeta(strategy: FetchStrategy, owner: string, repo: string, prNumber: number, cwd: string): PrMeta {
  if (strategy === 'gh') return readPrMetaViaGh(owner, repo, prNumber, cwd)
  return readPrMetaViaRest(owner, repo, prNumber, envToken()!, cwd)
}

function readIssueState(strategy: FetchStrategy, owner: string, repo: string, issueNumber: number, cwd: string): string {
  if (strategy === 'gh') return readIssueStateViaGh(owner, repo, issueNumber, cwd)
  return readIssueStateViaRest(owner, repo, issueNumber, envToken()!, cwd)
}

function closeIssue(strategy: FetchStrategy, owner: string, repo: string, issueNumber: number, cwd: string): void {
  if (strategy === 'gh') return closeIssueViaGh(owner, repo, issueNumber, cwd)
  return closeIssueViaRest(owner, repo, issueNumber, envToken()!, cwd)
}

/** Verify + close (via `issueCloser`) every issue `prBody` names with a
 *  closing keyword that is not already closed (via `issueStateReader`) —
 *  the issue #983 safety net. Errors on any one issue (a transient API
 *  failure, a since-deleted issue) are swallowed into `failed` rather than
 *  thrown, so one bad number never masks the merge's own success or blocks
 *  reconciling the rest. Injected reader/closer functions keep this
 *  independently testable without a real network call. */
export async function reconcileClosingKeywords(
  prBody: string,
  issueStateReader: (issueNumber: number) => Promise<string> | string,
  issueCloser: (issueNumber: number) => Promise<void> | void,
): Promise<{ closed: number[]; failed: number[] }> {
  const closed: number[] = []
  const failed: number[] = []
  for (const issueNumber of parseClosingKeywordIssues(prBody)) {
    try {
      const state = await issueStateReader(issueNumber)
      if (state === 'open') {
        await issueCloser(issueNumber)
        closed.push(issueNumber)
      }
    } catch {
      failed.push(issueNumber)
    }
  }
  return { closed, failed }
}

function readCheckRuns(strategy: FetchStrategy, owner: string, repo: string, sha: string, cwd: string): RawCheckRun[] {
  if (strategy === 'gh') return readCheckRunsViaGh(owner, repo, sha, cwd)
  return readCheckRunsViaRest(owner, repo, sha, envToken()!, cwd)
}

function mergePr(
  strategy: FetchStrategy,
  owner: string,
  repo: string,
  prNumber: number,
  mergeMethod: MergeMethod,
  cwd: string,
): string {
  if (strategy === 'gh') return mergePrViaGh(owner, repo, prNumber, mergeMethod, cwd)
  return mergePrViaRest(owner, repo, prNumber, mergeMethod, envToken()!, cwd)
}

// ── Command ──────────────────────────────────────────────────────────────────

export async function mergePrWhenGreen(
  prNumber: number,
  opts: PollOptions & { mergeMethod: MergeMethod },
  cwd = root,
): Promise<MergeResult> {
  const originUrl = readOriginUrl(cwd)
  const ownerRepo = parseOwnerRepo(originUrl)
  if (ownerRepo === null) {
    throw new Error(`could not parse owner/repo from origin remote: ${originUrl}`)
  }
  const strategy = pickFetchStrategy(hasGhBinary(cwd), Boolean(envToken()))
  if (strategy === null) {
    throw new Error('no GitHub access path available: `gh` is not installed and neither GH_TOKEN nor GITHUB_TOKEN is set')
  }
  const { owner, repo } = ownerRepo

  const { sha, body: prBody } = readPrMeta(strategy, owner, repo, prNumber, cwd)
  const { verdict, runs } = await pollUntilResolved(
    async () => readCheckRuns(strategy, owner, repo, sha, cwd),
    opts,
  )

  if (verdict === 'pending') {
    return {
      pr: prNumber,
      verdict,
      merged: false,
      message: `timed out after ${opts.timeoutMs}ms — checks still not all resolved (${runs.length} run(s))`,
    }
  }
  if (verdict === 'red') {
    return {
      pr: prNumber,
      verdict,
      merged: false,
      message: `checks failed: ${failingCheckNames(runs).join(', ')}`,
    }
  }

  let mergeCommitSha: string
  try {
    mergeCommitSha = mergePr(strategy, owner, repo, prNumber, opts.mergeMethod, cwd)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return {
      pr: prNumber,
      verdict,
      merged: false,
      message: `checks were green but the merge call itself failed: ${msg}`,
    }
  }

  // Merge succeeded — reconcile closing keywords (issue #983) as a
  // best-effort follow-up. A reconciliation failure never turns a successful
  // merge into a reported failure; it's folded into the message instead.
  const { closed, failed } = await reconcileClosingKeywords(
    prBody,
    (issueNumber) => readIssueState(strategy, owner, repo, issueNumber, cwd),
    (issueNumber) => closeIssue(strategy, owner, repo, issueNumber, cwd),
  )
  const reconcileNote =
    closed.length > 0
      ? ` — closed ${closed.length} referenced issue(s) GitHub's own auto-close missed: ${closed.map((n) => `#${n}`).join(', ')}`
      : ''
  const failNote = failed.length > 0 ? ` (failed to verify/close: ${failed.map((n) => `#${n}`).join(', ')})` : ''
  return {
    pr: prNumber,
    verdict,
    merged: true,
    mergeCommitSha,
    message: `merged${reconcileNote}${failNote}`,
    reconciledClosedIssues: closed,
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`merge-pr: ${msg}`)
  process.exit(1)
}

function parseArgsOrFail(argv: string[]): { prNumber: number; mergeMethod: MergeMethod; intervalMs: number; timeoutMs: number } {
  const prArg = argv[0]
  if (!prArg) {
    fail('usage: tsx scripts/merge-pr.ts <pr-number> [--merge-method merge|squash|rebase] [--interval-ms N] [--timeout-ms N]')
  }
  const prNumber = Number(prArg)
  if (!Number.isInteger(prNumber) || prNumber <= 0) fail(`not a positive integer PR number: ${prArg}`)

  let mergeMethod: MergeMethod = 'merge'
  let intervalMs = DEFAULT_INTERVAL_MS
  let timeoutMs = DEFAULT_TIMEOUT_MS
  for (let i = 1; i < argv.length; i += 2) {
    const flag = argv[i]
    const value = argv[i + 1]
    if (flag === '--merge-method') {
      if (value !== 'merge' && value !== 'squash' && value !== 'rebase') fail(`invalid --merge-method: ${value}`)
      mergeMethod = value
    } else if (flag === '--interval-ms') {
      intervalMs = Number(value)
      if (!Number.isInteger(intervalMs) || intervalMs <= 0) fail(`invalid --interval-ms: ${value}`)
    } else if (flag === '--timeout-ms') {
      timeoutMs = Number(value)
      if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) fail(`invalid --timeout-ms: ${value}`)
    } else {
      fail(`unknown flag: ${flag}`)
    }
  }
  return { prNumber, mergeMethod, intervalMs, timeoutMs }
}

async function main(): Promise<void> {
  const { prNumber, mergeMethod, intervalMs, timeoutMs } = parseArgsOrFail(process.argv.slice(2))
  const result = await mergePrWhenGreen(prNumber, { mergeMethod, intervalMs, timeoutMs })
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  if (!result.merged) process.exitCode = 1
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((err) => fail(err instanceof Error ? err.message : String(err)))
}
