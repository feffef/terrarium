// The ADR-0017 provenance HEADER — the marker agents stamp on GitHub bodies
// (issues, PR descriptions, comments, reviews). Read ADR-0017's 2026-07-31
// amendment for why the convention moved here from a trailing footer; this file
// is only its code home.
//
// The load-bearing property is NOT the format: it is that a full session URL is
// present, so authorship stays recoverable from the content itself. Hence the
// two readers below are deliberately different, and must not be conflated:
//
//   • `sessionIdsIn`      — "which sessions does this text reference?" Reads any
//                           full session URL, wherever it appears. Used by the
//                           guard, which needs to catch a WRONG id anywhere.
//   • `hasAuthorshipMarker` — "did an agent write this?" Matches only a
//                           deliberate marker. A human quoting a session URL in
//                           prose must NOT read as agent-authored: two pipelines
//                           skip their own prior posts on this signal, so a false
//                           positive silently drops a real human comment.
//
// Commits are NOT covered here: a commit message renders no markdown, and the
// harness's own template emits the two-line trailer that `provenance-footer.ts`
// backstops.

/** The bot icon opening the header. */
export const BOT_ICON = '🤖'

/** The ADR-0017 provenance header: bot icon, model name, linked to the session.
 *  The single code home for the format — `reconstructFooterValues()`
 *  (provenance-footer.ts) resolves both arguments for the current session, so a
 *  caller never hand-assembles either (CLAUDE.md: never reconstruct an
 *  identifier from memory). */
export function provenanceHeader(modelName: string, sessionUrl: string): string {
  return `${BOT_ICON} [${modelName}](${sessionUrl})`
}

/** A full session URL, wherever it appears and whatever wraps it. */
const SESSION_URL = String.raw`https:\/\/claude\.ai\/code\/(session_[A-Za-z0-9_-]+)`

const SESSION_URL_GLOBAL = new RegExp(SESSION_URL, 'g')

/** The header, anchored to the START OF THE BODY — not `/m`. The anchor is the
 *  correctness property, not a style choice: with `/m` this matched a header on
 *  any line, so a body QUOTING another agent's post (or this repo's own doc
 *  example, which embeds a real id) had that quote read as its own provenance.
 *  That is issue #692's class of bug, reintroduced through a different marker.
 *  Built from `BOT_ICON` so the builder and the detector genuinely cannot drift. */
export const PROVENANCE_HEADER = new RegExp(
  String.raw`^\s*${BOT_ICON}\s*\[([^\]]+)\]\(${SESSION_URL}\)`,
)

/** The legacy two-line footer's `Co-Authored-By:` half, carried by every
 *  agent-authored GitHub body posted before the 2026-07-31 amendment. Matched
 *  permanently, not as a transition shim: nothing is backfilled (ADR-0017's
 *  "asymmetric history"), so historical content would otherwise stop reading as
 *  agent-authored. Case-insensitive — git trailers conventionally use
 *  `Co-authored-by` and GitHub doesn't normalize case. */
export const LEGACY_PROVENANCE_FOOTER = /co-authored-by:.*noreply@anthropic\.com/i

/** The harness's own attribution footer, which this repo deliberately leaves in
 *  place (ADR-0017 2026-07-31). Its presence is also agent authorship. */
const HARNESS_FOOTER = /Generated (?:by|with) \[Claude Code\]/

/** Every session id `text` references, in order, deduped. Answers "which
 *  sessions does this text name?" — including ones merely quoted. */
export function sessionIdsIn(text: string): string[] {
  return [...new Set([...text.matchAll(SESSION_URL_GLOBAL)].map((m) => m[1]!))]
}

/** True when `text` carries a deliberate agent-authorship marker: the header,
 *  the legacy footer, or the harness's footer. A bare session URL in prose does
 *  NOT qualify — see this file's header for why that distinction is load-bearing. */
export function hasAuthorshipMarker(text: string): boolean {
  return PROVENANCE_HEADER.test(text) || LEGACY_PROVENANCE_FOOTER.test(text) || HARNESS_FOOTER.test(text)
}

/** The model name and session id the body's own header names, or `null` when it
 *  has none. Returns the id rather than the URL because every caller compares it
 *  against a resolved ground-truth id — handing back the URL would just make each
 *  one re-parse it. */
export function readProvenanceHeader(text: string): { modelName: string; sessionId: string } | null {
  const m = PROVENANCE_HEADER.exec(text)
  return m ? { modelName: m[1]!.trim(), sessionId: m[2]! } : null
}
