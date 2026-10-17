// The triage-drift detector (issue #507): an AI-authored comment can assert a
// triage-label transition ("moved to `ready-for-agent`") that the issue's
// live labels never actually picked up — e.g. issue #325's newest AI comment
// claimed `ready-for-agent` while the issue stayed labeled `ready-for-human`.
// Nothing catches that mismatch today; this script does, as a standalone
// periodic-sweep-style check (recommended option 1 in #507) — wiring it into
// an existing sweep is deliberately deferred to a later step once the tool
// exists.
//
// AI-authorship detection deliberately does NOT use `author_association` or
// the GitHub login: `.agents/skills/auto-triage/SKILL.md` already established
// why that field can't be trusted in this repo — every agent-driven GitHub
// write runs under the human owner's own connection (ADR-0017), so an
// AI-authored comment and the owner's own comment both show
// `author_association: OWNER` under the same login. The only reliable signal
// is the ADR-0017 authorship marker (`hasAuthorshipMarker` in
// `provenance-header.ts` decides which shapes count) — its *absence* means human, matching the existing
// `auto-triage` convention rather than inventing a second one. Note it is
// deliberately NOT "contains a session URL": a human pasting one in prose must
// not read as agent-authored, or this pipeline never answers them.
//
// The claimed-transition check is deliberately a small, literal phrase list
// (issue #507's own scoping: "lightweight semantic check ... not an NLP
// solution"), not a parser — a real phrasing this list misses just stays
// silent (a false negative), which is the safe failure direction for a
// *detector*. Grow `TRANSITION_VERB_PATTERNS` when a real missed phrasing
// turns up.
//
// Usage:  tsx scripts/github/check-triage-drift.ts [N]
//   Checks up to N open issues (default 50, newest-updated-first) and prints
//   the flagged subset as JSON: { number, title, claimedLabel, liveLabels,
//   commentUrl, commentCreatedAt }.
import { decodeHtmlEntities, listAll, resolveAccess } from '../lib/github-client.ts'
import type { RawIssueApiRecord } from './list-open-issues.ts'
import { hasAuthorshipMarker } from '../lib/provenance-header.ts'
import { root, fail, runIfMain } from '../lib/cli.ts'

const DEFAULT_LIMIT = 50

// ── Types ───────────────────────────────────────────────────────────────────

/** The five canonical triage-label roles (`docs/agents/triage-labels.md`,
 *  single home for the vocabulary itself — mirrored here as a literal list
 *  since matching against it is this script's whole job). */
export const CANONICAL_LABELS = [
  'needs-triage',
  'needs-info',
  'ready-for-agent',
  'ready-for-human',
  'wontfix',
] as const
export type CanonicalLabel = (typeof CANONICAL_LABELS)[number]

/** One raw comment record as read off the GitHub REST issue-comments endpoint
 *  (shape shared by both `gh api` and a direct REST `fetch`). */
export interface RawCommentApiRecord {
  html_url: string
  body: string
  created_at: string
}

/** One open issue, trimmed to what the drift check needs — no body/comments
 *  beyond what's fetched separately, mirroring `list-open-issues.ts`'s
 *  deliberate scope limit. */
export interface DriftCheckIssue {
  number: number
  title: string
  labels: string[]
}

/** One issue flagged for triage-state drift: its most recent AI-authored
 *  comment claims a label transition the issue's live labels contradict. */
export interface FlaggedIssue {
  number: number
  title: string
  claimedLabel: CanonicalLabel
  liveLabels: string[]
  commentUrl: string
  commentCreatedAt: string
}

// ── Pure core (unit-tested) ─────────────────────────────────────────────────

/** True when `commentBody` carries an ADR-0017 authorship marker in any
 *  recognized shape — see the header comment above for why this, not
 *  `author_association`, is the authorship signal.
 *
 *  Load-bearing in both directions, which is why it delegates to
 *  `hasAuthorshipMarker` rather than "contains a session URL":
 *  `guest-intake-scan.ts` skips the pipeline's own prior replies on this
 *  signal, so a miss makes the intake loop re-answer itself — and a false
 *  positive silently drops a real human comment that merely pasted a session
 *  URL, never answering them at all. */
export function isAiAuthored(commentBody: string): boolean {
  return hasAuthorshipMarker(commentBody)
}

/** The phrasings this repo's AI-authored comments actually use to assert a
 *  label transition (e.g. issue #325's "Update: moved to
 *  `ready-for-agent`.", `auto-triage` SKILL.md's own "Stamp `ready-for-agent`"
 *  language). Deliberately small and literal — see the header comment for why
 *  this isn't an NLP parser. */
const TRANSITION_VERB_PATTERNS = [
  'moved to',
  'moving (?:it |this )?to',
  'move (?:it |this )?to',
  'labell?ed(?: as)?',
  'labell?ing(?: as)?',
  'marked(?: as)?',
  'marking(?: as)?',
  'mark(?:ed|ing)? (?:it |this )?as',
  'stamped',
  'stamping',
  'stamp(?: it| this)?',
  'appl(?:y|ied|ying)(?: the)?',
  'set to',
  'setting to',
  'updated to',
  'updating to',
]

/** One phrase match: `label` is the canonical label the phrase claims, `index`
 *  is its character offset in the comment body (used to find the *last*
 *  claim — see `latestClaimedLabel`). */
export interface ClaimedTransitionMatch {
  label: CanonicalLabel
  index: number
}

/** Every claimed-transition phrase match in `commentBody`, in the order they
 *  appear. A comment can legitimately mention more than one canonical label
 *  (e.g. narrating a prior state before the new one) — this returns every hit
 *  so the caller can decide which one is the actual claim. */
export function findClaimedLabelTransitions(commentBody: string): ClaimedTransitionMatch[] {
  const verbs = TRANSITION_VERB_PATTERNS.join('|')
  const out: ClaimedTransitionMatch[] = []
  for (const label of CANONICAL_LABELS) {
    const re = new RegExp(`\\b(?:${verbs})\\s+\`?${label}\`?\\b`, 'gi')
    for (const m of commentBody.matchAll(re)) {
      out.push({ label, index: m.index })
    }
  }
  return out.sort((a, b) => a.index - b.index)
}

/** The label a comment claims as the issue's *current* state — the
 *  rightmost (last) transition match, on the theory that a comment narrating
 *  "was X, now Y" asserts Y as the live state. `null` when the comment makes
 *  no recognizable claim. */
export function latestClaimedLabel(commentBody: string): CanonicalLabel | null {
  const matches = findClaimedLabelTransitions(commentBody)
  if (matches.length === 0) return null
  return matches[matches.length - 1]!.label
}

/** The most recently created AI-authored comment (see `isAiAuthored`), or
 *  `null` if none of `comments` are AI-authored. */
export function mostRecentAiComment(comments: RawCommentApiRecord[]): RawCommentApiRecord | null {
  const aiComments = comments.filter((c) => isAiAuthored(c.body))
  if (aiComments.length === 0) return null
  return aiComments.reduce((latest, c) =>
    Date.parse(c.created_at) > Date.parse(latest.created_at) ? c : latest,
  )
}

/** The drift check for one issue: does its most recent AI-authored comment
 *  claim a triage label its live labels don't carry? Returns `null` when
 *  there's no AI-authored comment, the comment makes no recognizable claim,
 *  or the claim matches the live labels (no drift). */
export function findTriageDrift(
  issue: DriftCheckIssue,
  comments: RawCommentApiRecord[],
): FlaggedIssue | null {
  const comment = mostRecentAiComment(comments)
  if (comment === null) return null
  const claimedLabel = latestClaimedLabel(comment.body)
  if (claimedLabel === null) return null
  if (issue.labels.includes(claimedLabel)) return null
  return {
    number: issue.number,
    title: issue.title,
    claimedLabel,
    liveLabels: issue.labels,
    commentUrl: comment.html_url,
    commentCreatedAt: comment.created_at,
  }
}

/** Turn one raw REST issue record into a `DriftCheckIssue`, or `null` if it's
 *  actually a pull request (the REST `issues` endpoint mixes both in,
 *  distinguished only by a `pull_request` key — same quirk
 *  `list-open-issues.ts` screens for). */
export function toDriftCheckIssue(raw: RawIssueApiRecord): DriftCheckIssue | null {
  if (raw.pull_request !== undefined) return null
  return {
    number: raw.number,
    title: decodeHtmlEntities(raw.title),
    labels: raw.labels.map((label) => (typeof label === 'string' ? label : label.name)),
  }
}

// ── Command ──────────────────────────────────────────────────────────────────

export async function checkTriageDrift(limit = DEFAULT_LIMIT, cwd = root): Promise<FlaggedIssue[]> {
  const access = resolveAccess(cwd)
  const rawIssues = listAll<RawIssueApiRecord>(access, 'issues', { state: 'open' })
  const issues = rawIssues
    .map(toDriftCheckIssue)
    .filter((x): x is DriftCheckIssue => x !== null)
    .slice(0, limit)

  const flagged: FlaggedIssue[] = []
  for (const issue of issues) {
    const comments = listAll<RawCommentApiRecord>(access, `issues/${issue.number}/comments`)
    const drift = findTriageDrift(issue, comments)
    if (drift !== null) flagged.push(drift)
  }
  return flagged
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const argv = process.argv.slice(2)
  const limitArg = argv[0]
  let limit = DEFAULT_LIMIT
  if (limitArg !== undefined) {
    limit = Number(limitArg)
    if (!Number.isInteger(limit) || limit <= 0) fail(`not a positive integer: ${limitArg}`)
  }
  const flagged = await checkTriageDrift(limit)
  process.stdout.write(JSON.stringify(flagged, null, 2) + '\n')
}

runIfMain(import.meta.url, main)
