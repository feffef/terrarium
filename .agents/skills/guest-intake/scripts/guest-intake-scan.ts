// The guest-intake scan helper: does `guest-intake`'s "scan every open issue,
// check its newest activity for guest authorship" step in one direct
// REST/`gh api` fetch, instead of ~2 MCP calls per issue (~190k tokens for a
// 25-issue pass; see the 2026-07-17 session log). Same fix as
// `list-open-issues.ts` (issue #494) and `check-triage-drift.ts` (issue #507).
//
// Deliberate scope split: this script only *classifies* — it fetches every
// open issue's newest activity and buckets it into a stage per
// `.agents/skills/guest-intake/SKILL.md`'s authorship rules (Public
// `author_association` = guest, Trusted without an ADR-0017 marker = owner
// steering, marker present = this pipeline's own prior reply). It does not
// interview, comment, or label — that judgment (reading a guest's actual
// words, deciding round count, running the ADR-0023 safety screen) stays with
// the calling agent. Only the `guest-activity` and `owner-steering` buckets
// carry full body text in the output; `agent-authored-skip` (the idempotency
// guard — already answered, waiting on the guest) is collapsed to a count, so
// a quiet pass — the common case — returns a handful of bytes instead of
// every issue's full comment history.
//
// Scan cursor (issue #569): a "newest activity only" check can silently skip
// a real OWNER comment that lands between two of the agent's own rapid
// replies — the *overall* newest comment ends up being the agent's own later
// marked reply, which the idempotency guard then treats as "already
// answered," burying the owner comment in between. To catch that, each scan
// persists a per-issue cursor (the newest comment `created_at` this scan
// pass has accounted for, in a local gitignored state file — see "Cursor
// state" below) and surfaces any OWNER-authored, unmarked comment newer
// than that cursor, not just the single newest comment overall.
//
// Usage:  pnpm exec tsx .agents/skills/guest-intake/scripts/guest-intake-scan.ts [N]
//   Scans up to N open issues (default 100) and prints a `ScanReport` JSON:
//   { scannedCount, counts: {guest-activity, owner-steering,
//   agent-authored-skip, bystander-comment, unrecognized-association}, actionable: ScannedIssue[] }
//
// Also skips an issue already carrying the `guest-in-flight` marker
// (issue #570) whose age can't be shown stale — another session may be
// actively negotiating/building it. See `scripts/guest-marker.ts` for the
// label name, staleness window, and staleness check (single home, shared
// with `poll-guest-tickets.ts`). Unlike that script, this one has no reason
// to fetch an issue's Timeline otherwise, so the marker check here costs one
// extra `issues/{n}/events` call, and only for the rare issue that actually
// carries the marker.
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isAiAuthored } from '../../../../scripts/check-triage-drift.ts'
import { decodeHtmlEntities, listAll, resolveAccess, type Access } from '../../../../scripts/lib/github-client.ts'
import { hasMarker, isMarkerFresh, type RawLabelEventRecord } from '../../../../scripts/guest-marker.ts'
import { PUBLIC_ASSOCIATIONS, TRUSTED_ASSOCIATIONS } from '../../../../scripts/trust.ts'
import { root } from '../../../../shared/expand.ts'

const DEFAULT_LIMIT = 100

// ── Types ───────────────────────────────────────────────────────────────────

/** One raw issue record off the GitHub REST `issues` list endpoint, trimmed to
 *  the fields this scan needs (a superset of `list-open-issues.ts`'s own
 *  narrower `RawIssueApiRecord` — this script needs `body`/`user`/
 *  `author_association` too, which that one deliberately omits). */
export interface RawIssueRecord {
  number: number
  title: string
  body: string | null
  labels: Array<{ name: string } | string>
  user: { login: string } | null
  author_association: string
  created_at: string
  pull_request?: unknown
}

/** One raw comment record off the GitHub REST issue-comments endpoint. */
export interface RawCommentRecord {
  html_url: string
  body: string
  user: { login: string } | null
  author_association: string
  created_at: string
}

/** The classification `guest-intake`'s authorship rules reduce every issue's
 *  newest activity to. */
export type Stage =
  | 'guest-activity'
  | 'owner-steering'
  | 'agent-authored-skip'
  | 'bystander-comment'
  | 'unrecognized-association'

/** An issue's newest activity — its most recent comment, or its own body when
 *  it has no comments — with HTML entities already decoded. */
export interface Activity {
  author: string
  authorAssociation: string
  body: string
  createdAt: string
  isComment: boolean
}

/** One scanned issue: its stage plus enough to act on it without a further
 *  fetch — full newest-activity text, and how many prior comments already
 *  carry an ADR-0017 authorship marker (for the Skill's own "≤3 rounds" count). */
export interface ScannedIssue {
  number: number
  title: string
  labels: string[]
  stage: Stage
  newestActivity: Activity
  priorAgentCommentCount: number
}

/** The scan's full result: a per-stage count (cheap to skim even for a large
 *  queue) plus full detail for only the issues that need a judgment call. */
export interface ScanReport {
  scannedCount: number
  counts: Record<Stage, number>
  actionable: ScannedIssue[]
}

// ── Pure core (unit-tested) ─────────────────────────────────────────────────

/** The newest activity on an issue: its most recent comment by `created_at`,
 *  or the issue's own body/author when it has no comments. */
export function newestActivity(issue: RawIssueRecord, comments: RawCommentRecord[]): Activity {
  if (comments.length === 0) {
    return {
      author: issue.user?.login ?? 'unknown',
      authorAssociation: issue.author_association,
      body: issue.body ?? '',
      createdAt: issue.created_at,
      isComment: false,
    }
  }
  const latest = comments.reduce((a, b) => (Date.parse(b.created_at) > Date.parse(a.created_at) ? b : a))
  return {
    author: latest.user?.login ?? 'unknown',
    authorAssociation: latest.author_association,
    body: latest.body,
    createdAt: latest.created_at,
    isComment: true,
  }
}

/** Classify one activity per `guest-intake`'s rules: the ADR-0017 marker
 *  always wins first (it marks this pipeline's own prior reply, regardless of
 *  the shared-connection `author_association` it lands under — see
 *  `check-triage-drift.ts`'s header for why the footer, not the association,
 *  is the authorship signal); otherwise Public is a guest only on their own
 *  Public-authored issue (ADR-0023 — anyone else's Public comment is a
 *  non-actionable `bystander-comment`), and Trusted is the owner steering. */
export function classifyActivity(activity: Activity, issue: Pick<RawIssueRecord, 'user' | 'author_association'>): Stage {
  if (isAiAuthored(activity.body)) return 'agent-authored-skip'
  if (PUBLIC_ASSOCIATIONS.has(activity.authorAssociation)) {
    const ownIssue = PUBLIC_ASSOCIATIONS.has(issue.author_association) && issue.user?.login === activity.author
    return ownIssue ? 'guest-activity' : 'bystander-comment'
  }
  if (TRUSTED_ASSOCIATIONS.has(activity.authorAssociation)) return 'owner-steering'
  return 'unrecognized-association'
}

/** Every comment strictly newer than `cursor` — or none at all, when there is
 *  no cursor yet (an issue's first-ever scan pass, or a session where the
 *  cursor state file didn't persist — see the header comment). Without a
 *  prior cursor there is no "since" boundary to check against, so the safe
 *  choice is to defer to plain `newestActivity()` rather than scan an
 *  issue's entire history: the alternative — treating "no cursor" as "every
 *  comment ever" — would re-surface an owner comment from long ago as
 *  perpetually actionable on every cursor-less scan, even one a later
 *  (unmarked, so invisible to this filter) human action already
 *  resolved. */
export function commentsSinceCursor(comments: RawCommentRecord[], cursor: string | null): RawCommentRecord[] {
  if (cursor === null) return []
  return comments.filter((c) => Date.parse(c.created_at) > Date.parse(cursor))
}

/** The newest real OWNER comment (Trusted `author_association`, no ADR-0017
 *  marker — see `classifyActivity`) among the comments newer than `cursor`,
 *  or `null` when none qualify (including whenever `cursor` is `null` itself
 *  — see `commentsSinceCursor`). See the header comment for issue #569's fix
 *  this implements.
 *
 *  Known limitation: only the newest qualifying comment surfaces. If two real
 *  OWNER comments land in one inter-scan gap, the earlier is never re-offered,
 *  since the cursor advances to the newest activity regardless (see
 *  `guestIntakeScan`). Fixing that needs `scanIssue` to return every missed
 *  comment. */
export function newestOwnerCommentSince(comments: RawCommentRecord[], cursor: string | null): RawCommentRecord | null {
  const candidates = commentsSinceCursor(comments, cursor).filter(
    (c) => TRUSTED_ASSOCIATIONS.has(c.author_association) && !isAiAuthored(c.body),
  )
  if (candidates.length === 0) return null
  return candidates.reduce((a, b) => (Date.parse(b.created_at) > Date.parse(a.created_at) ? b : a))
}

/** Turn one raw issue + its comments into a `ScannedIssue`, or `null` if the
 *  record is actually a pull request (the REST `issues` endpoint mixes both
 *  in — same quirk `list-open-issues.ts` screens for). `cursor` is this
 *  issue's persisted scan cursor (`null` on its first scan) — when a real
 *  OWNER comment landed after it, that comment wins over the plain
 *  newest-overall activity (issue #569). */
export function scanIssue(rawIssue: RawIssueRecord, rawComments: RawCommentRecord[], cursor: string | null = null): ScannedIssue | null {
  if (rawIssue.pull_request !== undefined) return null
  const comments = rawComments.map((c) => ({ ...c, body: decodeHtmlEntities(c.body) }))
  const issue: RawIssueRecord = {
    ...rawIssue,
    title: decodeHtmlEntities(rawIssue.title),
    body: rawIssue.body === null ? null : decodeHtmlEntities(rawIssue.body),
  }
  const missedOwnerComment = newestOwnerCommentSince(comments, cursor)
  const activity: Activity = missedOwnerComment
    ? {
        author: missedOwnerComment.user?.login ?? 'unknown',
        authorAssociation: missedOwnerComment.author_association,
        body: missedOwnerComment.body,
        createdAt: missedOwnerComment.created_at,
        isComment: true,
      }
    : newestActivity(issue, comments)
  return {
    number: rawIssue.number,
    title: issue.title,
    labels: rawIssue.labels.map((label) => (typeof label === 'string' ? label : label.name)),
    stage: classifyActivity(activity, rawIssue),
    newestActivity: activity,
    priorAgentCommentCount: comments.filter((c) => isAiAuthored(c.body)).length,
  }
}

/** The full report: per-stage counts over every scanned issue, plus full
 *  detail for only the `guest-activity`/`owner-steering` subset — the two
 *  stages that need a judgment call from the calling agent. */
export function buildReport(scanned: ScannedIssue[]): ScanReport {
  const counts: Record<Stage, number> = {
    'guest-activity': 0,
    'owner-steering': 0,
    'agent-authored-skip': 0,
    'bystander-comment': 0,
    'unrecognized-association': 0,
  }
  for (const issue of scanned) counts[issue.stage]++
  return {
    scannedCount: scanned.length,
    counts,
    actionable: scanned.filter((issue) => issue.stage === 'guest-activity' || issue.stage === 'owner-steering'),
  }
}

// ── Cursor state (persisted between scan passes) ────────────────────────────

/** Per-issue scan cursors: for each open issue (keyed by its number as a
 *  string, since JSON object keys are always strings), the newest comment
 *  `created_at` the last scan pass accounted for. Local and gitignored — see
 *  the header comment for why this fixes issue #569. */
export type ScanCursorState = Record<string, string>

const CURSOR_STATE_FILENAME = '.guest-intake-scan-state.json'

/** The persisted cursor state at `path`, or `{}` when the file doesn't exist
 *  yet (an issue's first-ever scan) or is unreadable/corrupt — a missing
 *  cursor degrades to plain `newestActivity()`, never to a crash. */
export function readCursorState(path: string): ScanCursorState {
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as ScanCursorState
  } catch {
    return {}
  }
}

/** Persist `state` to `path` as the cursor for the next scan pass. */
export function writeCursorState(state: ScanCursorState, path: string): void {
  writeFileSync(path, JSON.stringify(state, null, 2) + '\n')
}

/** `isMarkerFresh`, but tolerant of the events fetch itself failing (a
 *  transient network/`gh` error) — same fail-closed reasoning as
 *  `isMarkerFresh`'s own missing-timestamp case (see `guest-marker.ts`): a
 *  fetch failure on one issue must not crash the whole scan and must not
 *  risk a double-build by treating an unreadable marker as safe to
 *  reclaim, so it's logged to stderr and treated as still-fresh (skip).
 *  Events come from the stable issue Events API (no preview header), a second
 *  call here rather than folded into a Timeline fetch (see the header). */
function issueMarkerLooksFresh(access: Access, issueNumber: number): boolean {
  try {
    return isMarkerFresh(listAll<RawLabelEventRecord>(access, `issues/${issueNumber}/events`))
  } catch (err) {
    console.error(
      `guest-intake-scan: couldn't fetch events for #${issueNumber} to check its guest-in-flight marker` +
        ` — skipping it this pass rather than risking a double-claim: ${err instanceof Error ? err.message : String(err)}`,
    )
    return true
  }
}

// ── Command ──────────────────────────────────────────────────────────────────

export function guestIntakeScan(limit = DEFAULT_LIMIT, cwd = root): ScanReport {
  const access = resolveAccess(cwd)
  const rawIssues = listAll<RawIssueRecord>(access, 'issues', { state: 'open' })
    .filter((issue) => issue.pull_request === undefined)
    .slice(0, limit)

  const cursorStatePath = join(cwd, CURSOR_STATE_FILENAME)
  const cursorState = readCursorState(cursorStatePath)
  const nextCursorState: ScanCursorState = { ...cursorState }

  const scanned: ScannedIssue[] = []
  for (const raw of rawIssues) {
    const labels = raw.labels.map((label) => (typeof label === 'string' ? label : label.name))
    if (hasMarker(labels) && issueMarkerLooksFresh(access, raw.number)) continue
    const comments = listAll<RawCommentRecord>(access, `issues/${raw.number}/comments`)
    const cursor = cursorState[String(raw.number)] ?? null
    const result = scanIssue(raw, comments, cursor)
    if (result) scanned.push(result)
    nextCursorState[String(raw.number)] = newestActivity(raw, comments).createdAt
  }
  writeCursorState(nextCursorState, cursorStatePath)
  return buildReport(scanned)
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function fail(msg: string): never {
  console.error(`guest-intake-scan: ${msg}`)
  process.exit(1)
}

function main(): void {
  const argv = process.argv.slice(2)
  const limitArg = argv[0]
  let limit = DEFAULT_LIMIT
  if (limitArg !== undefined) {
    limit = Number(limitArg)
    if (!Number.isInteger(limit) || limit <= 0) fail(`not a positive integer: ${limitArg}`)
  }
  const report = guestIntakeScan(limit)
  process.stdout.write(JSON.stringify(report, null, 2) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
