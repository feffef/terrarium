// The guest-demo in-flight marker (issue #570): `guest-intake` and
// `guest-build` can independently act on the same issue with no visibility
// into each other's in-flight state — this already caused two sessions to
// nearly ship contradictory PRs for issue #555 before a human intervened.
// The fix is a GitHub label both Skills add when they start actively
// negotiating/building against an issue and remove when they finish or hand
// off (success or escalation); `poll-guest-tickets.ts` and
// `guest-intake-scan.ts` both import this module as the single home for the
// label name, the staleness window, and the staleness check itself, rather
// than each re-deriving them (CLAUDE.md's single-home rule). The write side
// (adding/removing the label) lives in `.agents/skills/guest-intake/SKILL.md`
// and `.agents/skills/guest-build/SKILL.md`; this module is the read side
// both scan scripts share.
//
// Staleness, and why an issue Events fetch: a plain issue/label read doesn't
// carry an "added at" timestamp, but GitHub's issue Events API
// (`GET /repos/{owner}/{repo}/issues/{number}/events`, stable — no preview
// header) does: each `labeled` event record carries its own `created_at` and
// the label it applied. There's no session-liveness signal available to
// these scripts (no heartbeat, no lock lease) — the marker's own age is the
// only proxy, so a marker older than `MARKER_STALE_MINUTES` is treated as
// abandoned (the owning session died mid-flight, crashed before hand-off, or
// simply forgot to clean up) and becomes re-claimable rather than a
// permanent block.
//
// The 45-minute window is chosen to comfortably outlast the slower of the
// two write paths — `guest-build`'s dispatch-a-Sonnet-impl-agent +
// clear-the-safety-gate + code-review cycle (`guest-build/SKILL.md`), which
// is the long pole of ordinary, non-stuck latency — while still being short
// enough that an actually-abandoned issue doesn't sit blocked for the rest
// of a bounded demo window (ADR-0023). `guest-intake`'s single-comment round
// is far shorter and never approaches this window in the ordinary case. It
// sits inside issue #570's own suggested 30-60 minute range.

/** The in-flight marker label both `guest-intake` and `guest-build` apply
 *  while actively working an issue. Chosen fresh against the repo's existing
 *  label set (verified via `get_label` while building this fix — no
 *  collision) and matches the name issue #570 itself proposed. */
export const MARKER_LABEL = 'guest-in-flight'

/** How long the marker may sit on an issue before a scan treats it as stale
 *  and re-claimable. See the header comment for why 45 minutes. */
export const MARKER_STALE_MINUTES = 45

/** One raw GitHub issue-event record, trimmed to the `labeled` shape this
 *  module needs — satisfied by both the plain issue Events API
 *  (`guest-intake-scan.ts`) and the richer Timeline API
 *  (`poll-guest-tickets.ts`, which already fetches it for the
 *  cross-referenced-PR check and can reuse that same fetch here instead of
 *  paying for a second API call). */
export interface RawLabelEventRecord {
  event: string
  created_at?: string
  label?: { name: string }
}

// ── Pure core (unit-tested) ─────────────────────────────────────────────────

/** True when `labels` (an issue's live label-name list) currently carries
 *  the marker. */
export function hasMarker(labels: string[]): boolean {
  return labels.includes(MARKER_LABEL)
}

/** The most recent time the marker label was applied to an issue, per its
 *  event history — `null` when no `labeled` event for it is found. Multiple
 *  add/remove cycles are possible (a session claims, releases, another
 *  claims again); the *latest* `labeled` timestamp is what matters, since
 *  the caller only calls this once `hasMarker` has already confirmed the
 *  label is live right now. */
export function mostRecentMarkerLabeledAt(events: RawLabelEventRecord[]): string | null {
  const timestamps = events
    .filter((e) => e.event === 'labeled' && e.label?.name === MARKER_LABEL && e.created_at !== undefined)
    .map((e) => e.created_at!)
  if (timestamps.length === 0) return null
  return timestamps.reduce((latest, t) => (Date.parse(t) > Date.parse(latest) ? t : latest))
}

/** True when `labeledAt` (an ISO timestamp the marker was applied) is older
 *  than `MARKER_STALE_MINUTES` relative to `now`. */
export function isMarkerStale(labeledAt: string, now: Date = new Date()): boolean {
  const ageMs = now.getTime() - Date.parse(labeledAt)
  return ageMs > MARKER_STALE_MINUTES * 60 * 1000
}

/** The full "is another session still actively holding this issue" check for
 *  an issue already known to carry the marker (see `hasMarker`). `true`
 *  means skip it — a concurrent session may still own it; `false` means it's
 *  safe to (re-)claim, because the marker is provably older than
 *  `MARKER_STALE_MINUTES`.
 *
 *  A missing timestamp fails *closed* toward "still fresh" (skip) rather
 *  than toward reclaiming: this marker exists specifically to prevent the
 *  double-build that already happened once (issue #555) before a human
 *  intervened, so an undated marker is treated as "can't prove it's safe to
 *  take" rather than "assume it's safe." The failure mode this trades away —
 *  a marker stuck forever because its event data is unexpectedly missing —
 *  is visible (the pipeline stalls) and human-fixable (remove the label by
 *  hand); a silent double-build is the harder-to-catch failure and the one
 *  this whole mechanism exists to close off. */
export function isMarkerFresh(events: RawLabelEventRecord[], now: Date = new Date()): boolean {
  const labeledAt = mostRecentMarkerLabeledAt(events)
  if (labeledAt === null) return true
  return !isMarkerStale(labeledAt, now)
}
