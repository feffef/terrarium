// The poll-then-merge helper (issue #667): never call `enable_pr_auto_merge`
// (`docs/agents/pr-workflow.md`'s recipe, step 5) — it is no way to land a PR
// that's already green or about to be; calling it there
// throws a misleading error ("required checks are failing" while a check is
// merely `in_progress`, or "protected branch rules not configured" once
// actually green — issue #385). #385's fix was doc-only guidance to manually
// re-check `pull_request_read`/`get_check_runs` and retry — correct, but a
// hand-rolled round-trip every session. This script does that round-trip once:
// poll the PR's check runs with a short interval until they resolve
// (green/red/timeout), then merge directly on green — no `enable_pr_auto_merge`
// call at all.
//
// Fetch/merge strategy is `lib/github-client.ts`'s `gh`/`rest` switch (issue
// #505's `gh`-less fallback): `gh api` (never `gh pr`/`gh issue`, which route
// through GraphQL and can hit this environment's proxy restrictions — see
// `list-open-issues.ts`'s header) when the `gh` binary is present, a direct
// authenticated REST call via `curl` (not `fetch` — issue #567) when it is not.
//
// Usage:  tsx scripts/github/merge-pr.ts <pr-number> [--merge-method merge|squash|rebase] [--interval-ms N] [--timeout-ms N]
//   Refuses up front for a fork or Public-authored PR, a PR labelled
//   `guest-pipeline` (ADR-0023), a PR that changes a Human-only path (ADR-0004),
//   a PR whose closing keywords name an open issue not labelled
//   `ready-for-agent` (#2104, #2691), a PR adding a blog post whose blob is not
//   the one its `Fact-checked:` line names (#2370), or unless this session's
//   verdict, naming the head in a `Reviewed:` line, is on the PR (#1276, #1844). A Dependabot PR skips the Public-author,
//   guest-pipeline and Human-only refusals only when `dependabotBumpRefusal`
//   finds a plain minor/patch bump (#1889); a fork still refuses.
//   Then polls the PR's head-commit check runs every `interval-ms` (default 15s)
//   until they resolve or `timeout-ms` (default 20 minutes) elapses, then:
//     - all green  → merges via the given method (default `merge`, matching
//       this repo's existing merge-commit convention) and prints the result.
//     - any red    → prints the failing check names, does not merge.
//     - timeout    → prints the still-unresolved state, does not merge.
//   Exits 0 only when the merge actually happened; 1 otherwise (no verdict,
//   red, timeout, or a merge-call error) — an unmerged PR is a caller-actionable outcome,
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
import { matchesGlob } from 'node:path'
import { fail, root, runIfMain } from '../lib/cli.ts'
import { git } from '../lib/git.ts'
import { getJson, listAll, PER_PAGE, requestJson, resolveAccess, type Access } from '../lib/github-client.ts'
import { findTranscriptContents } from '../session/commit-trailer.ts'
import { hasAuthorshipMarker, readProvenanceHeader } from '../lib/provenance-header.ts'
import { resolveGroundTruthFromTranscript } from '../session/transcript-trace.ts'
import { TRUSTED_ASSOCIATIONS } from '../lib/author-trust.ts'
import { rulePaths } from '../lib/adr-rules.ts'

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
  /** Refused before polling: `untrusted-origin` — see `prOriginRefusal`;
   *  `human-merge` — see `humanMergeRefusal` and `dependabotBumpRefusal`;
   *  `closes-unready-issue` — see `readyForHumanRefusal`; `unchecked-post` — see
   *  `factCheckedBlobRefusal`; `no-verdict` — see `verdictRefusal`. */
  verdict: ChecksVerdict | 'untrusted-origin' | 'human-merge' | 'closes-unready-issue' | 'unchecked-post' | 'no-verdict'
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

/** The merge PUT's fields, shared by the `gh api` and REST paths. `sha` pins
 *  the polled head, so a push during polling fails the merge (409) instead of
 *  landing an unchecked commit. */
export function mergeRequestFields(method: MergeMethod, sha: string): { merge_method: MergeMethod; sha: string } {
  return { merge_method: method, sha }
}

export interface VerdictBody {
  body: string
  authorAssociation: string
}

/** A verdict's `Reviewed: <sha>` line: the commit its code review covered (#1844). */
const REVIEWED_LINE_RE = /^Reviewed: `?([0-9a-f]{7,40})`?\s*$/gim

/** Why the PR has no verdict this session posted on `headSha`, or null
 *  (`pr-workflow.md` step 4, issues #1276, #1844). A verdict carries an
 *  ADR-0017 marker and — when the session is known — a header naming it. An
 *  unresolvable session accepts any marker rather than blocking a session whose
 *  environment lacks the id. Only Trusted authors count: the marker is
 *  forgeable by anyone (ADR-0020). The verdict must name `headSha` in a
 *  `Reviewed:` line, so a push after the review needs a fresh one. */
export function verdictRefusal(bodies: VerdictBody[], sessionId: string | null, headSha: string): string | null {
  const mine = bodies
    .filter(
      ({ body: b, authorAssociation }) =>
        TRUSTED_ASSOCIATIONS.has(authorAssociation) &&
        (sessionId === null ? hasAuthorshipMarker(b) : readProvenanceHeader(b)?.sessionId === sessionId),
    )
    .map(({ body }) => body)
  const next =
    `Run the code-review Skill on ${headSha}, then post your step-4 verdict (docs/agents/pr-workflow.md) ` +
    `with the line \`Reviewed: ${headSha}\` as a COMMENT-event review or an issue comment — never APPROVE — and re-run.`
  if (mine.length === 0) {
    return (
      `refused: no review or comment on the PR carries this session's provenance header` +
      `${sessionId ? ` (${sessionId})` : ''}. A verdict a subagent posted carries its own session id. ${next}`
    )
  }
  const named = mine.flatMap((b) => [...b.matchAll(REVIEWED_LINE_RE)].map((m) => m[1]!.toLowerCase()))
  if (named.some((sha) => headSha.toLowerCase().startsWith(sha))) return null
  return named.length === 0
    ? `refused: your verdict has no \`Reviewed: <sha>\` line naming the head ${headSha}. ${next}`
    : `refused: your verdict names ${named.join(', ')}, but the head is ${headSha}. ${next}`
}

/** The single home of the Human-only list (ADR-0004): its frontmatter `paths`.
 *  Read from `origin/main`, so a PR cannot shrink the list for itself. */
export const HUMAN_MERGE_RULE = '.claude/rules/adr-0004-human-merge.md'

/** Why this script must leave the PR to a human, or null. An empty list fails
 *  closed: it means the rule could not be read. */
export function humanMergeRefusal(files: string[], globs: string[]): string | null {
  if (globs.length === 0) return `refused: no Human-only paths read from origin/main:${HUMAN_MERGE_RULE}`
  const hits = files.filter((f) => globs.some((g) => matchesGlob(f, g)))
  return hits.length
    ? `refused: a human merges a PR that changes ${hits.join(', ')} (ADR-0004, ${HUMAN_MERGE_RULE})`
    : null
}

/** The label `guest-build` puts on every PR it opens. */
export const GUEST_PIPELINE_LABEL = 'guest-pipeline'

/** A fork PR merges by human hand only, whoever wrote it (ADR-0020). */
function forkRefusal(meta: PrMeta, owner: string, repo: string): string | null {
  return meta.headRepo?.toLowerCase() === `${owner}/${repo}`.toLowerCase()
    ? null
    : `refused: head branch lives in ${meta.headRepo ?? 'a deleted repository'}, not ${owner}/${repo} — a fork PR is merged by a human`
}

/** Why this script must not merge the PR, or null: a fork or Public-authored
 *  PR merges by human hand only (ADR-0020, `guest-contributions.md`), and so
 *  does a guest-pipeline PR, though an agent opens it as the owner (ADR-0023). */
export function prOriginRefusal(meta: PrMeta, owner: string, repo: string): string | null {
  const fork = forkRefusal(meta, owner, repo)
  if (fork) return fork
  if (!TRUSTED_ASSOCIATIONS.has(meta.authorAssociation)) {
    return `refused: PR author is ${meta.authorAssociation} (Public, ADR-0020) — merged by a human`
  }
  if (meta.labels.includes(GUEST_PIPELINE_LABEL)) {
    return `refused: labelled ${GUEST_PIPELINE_LABEL} — the owner merges a guest-pipeline PR (ADR-0023)`
  }
  return null
}

/** GitHub reserves the `[bot]` suffix for Apps, so no user can take this login. */
export const DEPENDABOT_LOGIN = 'dependabot[bot]'

export interface PrFile {
  filename: string
  previousFilename?: string
  /** Absent when GitHub omits a large diff. */
  patch?: string
  status?: string
  /** The file's blob SHA on the PR head. */
  sha?: string
}

/** Every path the PR touches, a rename's old path included, so moving a file
 *  out of a Human-only path still counts. */
function prFilePaths(files: PrFile[]): string[] {
  return files.flatMap((f) => [f.filename, ...(f.previousFilename ? [f.previousFilename] : [])])
}

const DEP_LINE_RE = /^([+-])\s*"([^"]+)":\s*"([^"]*)",?\s*$/
const VERSION_RE = /^[\^~]?(\d+)\.(\d+)\.\d+/

/** Major and minor of a version spec, or null when it is not a plain semver. */
function versionCore(spec: string): [number, number] | null {
  const m = VERSION_RE.exec(spec)
  return m ? [Number(m[1]), Number(m[2])] : null
}

/** Why a Dependabot PR still needs a human, or null when it is a same-repo
 *  `dependabot[bot]` PR that changes only `package.json` (plus its lockfile)
 *  and keeps every changed version within its major, a 0.x minor counting as
 *  a major (ADR-0004, #1889). Every changed `package.json` line must be one
 *  side of such a pair, so a new dependency or any other edit refuses. */
export function dependabotBumpRefusal(meta: PrMeta, files: PrFile[], owner: string, repo: string): string | null {
  if (meta.authorLogin !== DEPENDABOT_LOGIN) return `refused: not authored by ${DEPENDABOT_LOGIN}`
  const fork = forkRefusal(meta, owner, repo)
  if (fork) return fork
  const extra = prFilePaths(files).filter((p) => p !== 'package.json' && p !== 'pnpm-lock.yaml')
  if (extra.length) return `refused: a Dependabot PR that changes ${extra.join(', ')} is merged by a human`
  const pkg = files.find((f) => f.filename === 'package.json')
  if (!pkg) return 'refused: the PR does not change package.json, so its versions cannot be checked'
  if (pkg.patch === undefined) return 'refused: GitHub sent no package.json patch to check'

  const sides: Record<'+' | '-', Map<string, string>> = { '+': new Map(), '-': new Map() }
  for (const line of pkg.patch.split('\n')) {
    if (!/^[+-]/.test(line)) continue
    const m = DEP_LINE_RE.exec(line)
    const notOneChange = `refused: package.json line ${JSON.stringify(line)} is not a single version change`
    if (!m) return notOneChange
    const [, sign, name = '', version = ''] = m
    const side = sides[sign as '+' | '-']
    if (side.has(name)) return notOneChange
    side.set(name, version)
  }
  const names = new Set([...sides['+'].keys(), ...sides['-'].keys()])
  const majors = [...names].filter((name) => {
    const from = versionCore(sides['-'].get(name) ?? '')
    const to = versionCore(sides['+'].get(name) ?? '')
    return !from || !to || from[0] !== to[0] || (from[0] === 0 && from[1] !== to[1])
  })
  return majors.length
    ? `refused: ${majors.join(', ')} added, removed, unreadable or moved a major — a human merges it (ADR-0004)`
    : null
}

/** The PR-body line naming the post blob the blog-post fact-checker read. */
const FACT_CHECKED_LINE_RE = /^Fact-checked: `?([0-9a-f]{40})`?\s*$/gim

/** Why a PR that adds a blog post must not self-merge, or null: the post on
 *  the head must be the blob the fact-checker read, named in a `Fact-checked:`
 *  line, because unchecked later edits shipped under four prose fixes (#2370). */
export function factCheckedBlobRefusal(body: string, files: PrFile[]): string | null {
  const checked = [...body.matchAll(FACT_CHECKED_LINE_RE)].map((m) => m[1]!.toLowerCase())
  const unchecked = files.filter(
    (f) => f.status === 'added' && matchesGlob(f.filename, 'layers/blog/content/*/pages/*.md') && !checked.includes(f.sha ?? ''),
  )
  if (unchecked.length === 0) return null
  return (
    `refused: ${unchecked.map((f) => `${f.filename} (blob ${f.sha})`).join(', ')} is not the post the fact-checker read` +
    ` (${checked.length ? `Fact-checked: ${checked.join(', ')}` : 'no `Fact-checked: <blob>` line in the PR body'}).` +
    ` Re-dispatch the checker on the current post (blog-post step 9), put the blob it returns on the line, and re-run.`
  )
}

// ── Closing-keyword reconciliation (pure, issue #983) ────────────────────────

/** GitHub's documented closing keywords: `close(s|d)`, `fix(es|ed)`,
 *  `resolve(s|d)`, with an optional colon, whatever words or quotes surround
 *  them (#2104). The capture group grabs the keyword's own `#N` plus any
 *  further `#N`s joined by a comma (optionally with "and") — the shape GitHub
 *  itself does *not* treat as additional closing references (only the first
 *  `#N` right after the keyword is), but which this reconciliation step
 *  treats as the same intent and closes in full (see header comment). A bare
 *  `owner/repo#N` cross-repo reference is deliberately not matched — this
 *  reconciliation only ever targets this repo's own issues. */
const CLOSING_KEYWORD_RE = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\b:?((?:\s+#\d+|\s*,\s*(?:and\s+)?#\d+)+)/gi

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

export interface IssueFacts {
  number: number
  state: string
  labels: string[]
}

/** Why merging would auto-close an open issue not labelled `ready-for-agent`,
 *  or null: PR #2030 closed #1819 that way (#2104), and a ledger PR's quoted
 *  "fix #2660" closed an issue it only filed (#2691). */
export function readyForHumanRefusal(issues: IssueFacts[]): string | null {
  const hits = issues.filter((i) => i.state === 'open' && !i.labels.includes('ready-for-agent')).map((i) => i.number)
  if (hits.length === 0) return null
  return (
    `refused: the PR body's closing keywords would close open issue(s) not labelled ready-for-agent: ` +
    `${hits.map((n) => `#${n}`).join(', ')}. Reword each to ${hits.map((n) => `"relates to #${n}"`).join(', ')} and re-run.`
  )
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

/** The fields this script reads off one `pulls/{number}` GET: the head SHA
 *  (polled, then pinned on the merge), the body (issue #983), and the origin
 *  and labels `prOriginRefusal` and `dependabotBumpRefusal` check. */
export interface PrMeta {
  sha: string
  body: string
  headRepo: string | null
  authorLogin: string
  authorAssociation: string
  labels: string[]
}

type RawPull = {
  head: { sha: string; repo: { full_name: string } | null }
  body: string | null
  user: { login: string }
  author_association: string
  labels: { name: string }[]
}

/** `PrMeta` from the `pulls/{number}` JSON both fetch strategies read. */
export function prMetaFromPull(pr: RawPull): PrMeta {
  return {
    sha: pr.head.sha,
    body: pr.body ?? '',
    headRepo: pr.head.repo?.full_name ?? null,
    authorLogin: pr.user.login,
    authorAssociation: pr.author_association,
    labels: pr.labels.map((l) => l.name),
  }
}

function readPrMeta(a: Access, prNumber: number): PrMeta {
  return prMetaFromPull(getJson<RawPull>(a, `pulls/${prNumber}`))
}

function readCheckRuns(a: Access, sha: string): RawCheckRun[] {
  return getJson<{ check_runs: RawCheckRun[] }>(a, `commits/${sha}/check-runs?per_page=${PER_PAGE}`).check_runs
}

function mergePr(a: Access, prNumber: number, mergeMethod: MergeMethod, sha: string): string {
  return requestJson<{ sha: string }>(a, 'PUT', `pulls/${prNumber}/merge`, mergeRequestFields(mergeMethod, sha)).sha
}

type RawIssue = { state: string; labels: { name: string }[] }

function closeIssue(a: Access, issueNumber: number): void {
  requestJson(a, 'PATCH', `issues/${issueNumber}`, { state: 'closed', state_reason: 'completed' })
}

type RawPrFile = { filename: string; previous_filename?: string; patch?: string; status: string; sha: string }

function readPrFiles(a: Access, prNumber: number): PrFile[] {
  return listAll<RawPrFile>(a, `pulls/${prNumber}/files`).map((i) => ({
    filename: i.filename,
    previousFilename: i.previous_filename,
    patch: i.patch,
    status: i.status,
    sha: i.sha,
  }))
}

function readHumanMergeGlobsFromMain(cwd: string): string[] {
  try {
    git(['fetch', 'origin', 'main'], cwd, { stdio: 'ignore' })
    return rulePaths(git(['show', `origin/main:${HUMAN_MERGE_RULE}`], cwd))
  } catch {
    return []
  }
}

type RawVerdictBody = { body: string | null; author_association: string }

/** The PR's review and conversation-comment bodies — one page
 *  each, like the check runs. */
function readVerdictBodies(a: Access, prNumber: number): VerdictBody[] {
  return [`pulls/${prNumber}/reviews`, `issues/${prNumber}/comments`].flatMap((path) =>
    getJson<RawVerdictBody[]>(a, `${path}?per_page=${PER_PAGE}`).map((i) => ({
      body: i.body ?? '',
      authorAssociation: i.author_association,
    })),
  )
}

function readIssue(a: Access, issueNumber: number): IssueFacts {
  const issue = getJson<RawIssue>(a, `issues/${issueNumber}`)
  return { number: issueNumber, state: issue.state, labels: issue.labels.map((l) => l.name) }
}

const realDelay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

/** Verify + close (via `issueCloser`) every issue `prBody` names with a
 *  closing keyword that is not already closed (via `issueStateReader`) —
 *  the issue #983 safety net. Errors on any one issue (a transient API
 *  failure, a since-deleted issue) are swallowed into `failed` rather than
 *  thrown, so one bad number never masks the merge's own success or blocks
 *  reconciling the rest. Injected reader/closer functions keep this
 *  independently testable without a real network call.
 *
 *  A single retry after `delay` guards against GitHub's own auto-close
 *  racing this reconciliation (issue #1181) — `delay` defaults to a real
 *  1.5s wait but is injectable so tests don't pay for it. */
export async function reconcileClosingKeywords(
  prBody: string,
  issueStateReader: (issueNumber: number) => Promise<string> | string,
  issueCloser: (issueNumber: number) => Promise<void> | void,
  delay: (ms: number) => Promise<void> = realDelay,
): Promise<{ closed: number[]; failed: number[] }> {
  const closed: number[] = []
  const failed: number[] = []
  const verifyAndClose = async (issueNumber: number): Promise<void> => {
    const state = await issueStateReader(issueNumber)
    if (state === 'open') {
      await issueCloser(issueNumber)
      closed.push(issueNumber)
    }
  }
  for (const issueNumber of parseClosingKeywordIssues(prBody)) {
    try {
      await verifyAndClose(issueNumber)
    } catch {
      try {
        await delay(1500)
        await verifyAndClose(issueNumber)
      } catch {
        failed.push(issueNumber)
      }
    }
  }
  return { closed, failed }
}

// ── Command ──────────────────────────────────────────────────────────────────

export async function mergePrWhenGreen(
  prNumber: number,
  opts: PollOptions & { mergeMethod: MergeMethod },
  cwd = root,
): Promise<MergeResult> {
  const access = resolveAccess(cwd)
  const { owner, repo } = access

  const meta = readPrMeta(access, prNumber)
  const files = readPrFiles(access, prNumber)
  if (meta.authorLogin === DEPENDABOT_LOGIN) {
    const bumpRefusal = dependabotBumpRefusal(meta, files, owner, repo)
    if (bumpRefusal !== null) {
      return { pr: prNumber, verdict: 'human-merge', merged: false, message: bumpRefusal }
    }
  } else {
    const originRefusal = prOriginRefusal(meta, owner, repo)
    if (originRefusal !== null) {
      return { pr: prNumber, verdict: 'untrusted-origin', merged: false, message: originRefusal }
    }
    const humanRefusal = humanMergeRefusal(prFilePaths(files), readHumanMergeGlobsFromMain(cwd))
    if (humanRefusal !== null) {
      return { pr: prNumber, verdict: 'human-merge', merged: false, message: humanRefusal }
    }
  }

  const closesUnready = readyForHumanRefusal(
    parseClosingKeywordIssues(meta.body).map((n) => readIssue(access, n)),
  )
  if (closesUnready !== null) {
    return { pr: prNumber, verdict: 'closes-unready-issue', merged: false, message: closesUnready }
  }
  const uncheckedPost = factCheckedBlobRefusal(meta.body, files)
  if (uncheckedPost !== null) {
    return { pr: prNumber, verdict: 'unchecked-post', merged: false, message: uncheckedPost }
  }

  const sessionId = resolveGroundTruthFromTranscript(findTranscriptContents(process.env) ?? '')
  const { sha, body: prBody } = meta
  const noVerdict = verdictRefusal(readVerdictBodies(access, prNumber), sessionId, sha)
  if (noVerdict !== null) {
    return { pr: prNumber, verdict: 'no-verdict', merged: false, message: noVerdict }
  }

  const { verdict, runs } = await pollUntilResolved(
    async () => readCheckRuns(access, sha),
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
    mergeCommitSha = mergePr(access, prNumber, opts.mergeMethod, sha)
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
    (issueNumber) => readIssue(access, issueNumber).state,
    (issueNumber) => closeIssue(access, issueNumber),
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

function parseArgsOrFail(argv: string[]): {
  prNumber: number
  mergeMethod: MergeMethod
  intervalMs: number
  timeoutMs: number
} {
  const prArg = argv[0]
  if (!prArg) {
    fail('usage: tsx scripts/github/merge-pr.ts <pr-number> [--merge-method merge|squash|rebase] [--interval-ms N] [--timeout-ms N]')
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

runIfMain(import.meta.url, () => main().catch((err) => fail(err instanceof Error ? err.message : String(err))))
