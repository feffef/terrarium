// The guest-build pre-filter (issue: token cost of firing the full
// `guest-build` procedure — see `.agents/skills/guest-build/SKILL.md` and
// ADR-0023 — on every `/loop` tick even when there is nothing new to build).
// `guest-build` itself is model-invoked and spends real tokens per tick
// scanning `ready-for-agent`, screening authorship, and checking for an
// already-open PR. This script does the same "is there anything to do at
// all" check as a plain, non-LLM `gh api`/REST call, so a tight polling
// interval only wakes the model when there's an actual guest-authored
// candidate.
//
// Guest vs. Trusted is ADR-0020's line; `scripts/trust.ts` holds the
// `authorAssociation` values.
//
// "Already has a linked PR" is checked via the issue's timeline
// (`cross-referenced` events whose source is a PR that's still open or was
// merged) rather than a local state file — stateless and correct across
// session restarts, at the cost of one extra API call per *candidate* (never
// per issue: only guest-authored `ready-for-agent` issues reach this check,
// which should be rare outside an active guest demo).
//
// Fetch strategy (`gh`, else `curl`): `lib/github-client.ts`.
//
// Usage:  tsx scripts/poll-guest-tickets.ts
//   Prints the guest-authored, not-yet-linked `ready-for-agent` issues as
//   compact JSON: [{ number, title, authorAssociation, htmlUrl }, ...].
//   Empty array when there's nothing for guest-build to do.
//
// Also skips an issue already carrying the `guest-in-flight` marker
// (issue #570) — another session may be actively negotiating/building it.
// See `scripts/guest-marker.ts` for the label name, staleness window, and
// staleness check (single home, shared with `guest-intake-scan.ts`); the
// timeline fetch below already covers this for free — the Timeline API's
// `labeled` events carry the same `created_at`/`label` shape the marker
// check needs, so no second API call is added for it.
import { decodeHtmlEntities, listAll, resolveAccess } from './lib/github-client.ts'
import type { RawIssueApiRecord } from './list-open-issues.ts'
import { hasMarker, isMarkerFresh } from './guest-marker.ts'
import { PUBLIC_ASSOCIATIONS } from './trust.ts'
import { root, runIfMain } from './lib/cli.ts'

const READY_FOR_AGENT_LABEL = 'ready-for-agent'

// ── Types ───────────────────────────────────────────────────────────────────

/** One raw issue record, extended with the `author_association` field the
 *  plain `list-open-issues.ts` shape doesn't need. */
export interface RawReadyIssueApiRecord extends RawIssueApiRecord {
  author_association: string
  html_url: string
}

/** One `ready-for-agent` issue, screened down to what the guest-build
 *  pre-filter needs: enough to decide whether to wake the model, nothing
 *  more (no body, no comments — same deliberate scope limit as
 *  `list-open-issues.ts`). */
export interface GuestReadyIssue {
  number: number
  title: string
  authorAssociation: string
  htmlUrl: string
}

/** One raw timeline-event record, trimmed to the `cross-referenced` shape
 *  the linked-PR check needs, plus the `created_at`/`label` fields the
 *  `guest-in-flight` marker-staleness check (`scripts/guest-marker.ts`)
 *  needs from the same fetch. */
export interface RawTimelineEventRecord {
  event: string
  created_at?: string
  label?: { name: string }
  source?: {
    issue?: {
      pull_request?: { merged_at: string | null }
      state?: string
    }
  }
}

// ── Pure core (unit-tested) ─────────────────────────────────────────────────

/** True when `authorAssociation` is Public (`scripts/trust.ts`). */
export function isPublicAuthor(authorAssociation: string): boolean {
  return PUBLIC_ASSOCIATIONS.has(authorAssociation)
}

/** Turn one raw REST record into a `GuestReadyIssue`, or `null` if it's
 *  actually a pull request (same `pull_request`-key quirk `list-open-issues.ts`
 *  screens for) or not Public-authored. */
export function toGuestReadyIssue(raw: RawReadyIssueApiRecord): GuestReadyIssue | null {
  if (raw.pull_request !== undefined) return null
  if (!isPublicAuthor(raw.author_association)) return null
  return {
    number: raw.number,
    title: decodeHtmlEntities(raw.title),
    authorAssociation: raw.author_association,
    htmlUrl: raw.html_url,
  }
}

/** True when `events` contains a `cross-referenced` event pointing at a pull
 *  request that is still open, or was merged — the "already has an open or
 *  merged linked PR" skip condition `guest-build`'s own procedure names. A
 *  cross-reference to a *closed, unmerged* PR doesn't count: that PR was
 *  abandoned, so the issue is still fair game. */
export function hasOpenOrMergedLinkedPr(events: RawTimelineEventRecord[]): boolean {
  return events.some((e) => {
    if (e.event !== 'cross-referenced') return false
    const pr = e.source?.issue?.pull_request
    if (!pr) return false
    return e.source?.issue?.state === 'open' || pr.merged_at !== null
  })
}

// ── Command ──────────────────────────────────────────────────────────────────

const TIMELINE_ACCEPT = 'application/vnd.github.mockingbird-preview+json'

export async function pollGuestTickets(cwd = root): Promise<GuestReadyIssue[]> {
  const access = resolveAccess(cwd)
  const rawIssues = listAll<RawReadyIssueApiRecord>(access, 'issues', { state: 'open', labels: READY_FOR_AGENT_LABEL })
  const guestIssues = rawIssues.map(toGuestReadyIssue).filter((x): x is GuestReadyIssue => x !== null)
  const rawLabelsByNumber = new Map(
    rawIssues.map((raw) => [raw.number, raw.labels.map((label) => (typeof label === 'string' ? label : label.name))]),
  )

  const candidates: GuestReadyIssue[] = []
  for (const issue of guestIssues) {
    const events = listAll<RawTimelineEventRecord>(access, `issues/${issue.number}/timeline`, {}, { accept: TIMELINE_ACCEPT })
    if (hasOpenOrMergedLinkedPr(events)) continue
    const labels = rawLabelsByNumber.get(issue.number) ?? []
    if (hasMarker(labels) && isMarkerFresh(events)) continue
    candidates.push(issue)
  }
  return candidates
}

// ── CLI ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const candidates = await pollGuestTickets()
  process.stdout.write(JSON.stringify(candidates) + '\n')
}

// Only run when executed directly (not when imported by the unit test).
runIfMain(import.meta.url, main)
