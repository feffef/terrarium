// The ADR-0017 provenance-footer backstop (issue #346). ADR-0017's Decision said
// "Commits already get this from the harness template — no repo-side change," but
// on cloud `git commit -m` that auto-injection intermittently does not fire (the
// recurrence rate and rationale are ADR-0017's 2026-07-20 amendment / issue #346).
// This is the code
// home for the footer's exact two-line format plus a commit-msg git-hook entry
// point that appends it when absent, reconstructing the model name and session
// URL repo-side — the same two values `buildLogCommit()` derives (both now share
// `provenanceFooter()` and the model/session helpers, so the format is single-homed).
//
// The pure core (`hasProvenanceFooter` / `computeFooterAction` / `applyFooter` /
// `correctSessionTrailer` / `correctCoAuthorLine` / `applyCorrections` /
// `provenanceFooter` / `isKnownModelName`) is kept separate from the
// git-hook I/O (`main`), mirroring the `handle`/`main` split in
// `session-end.ts`. `main()` FAILS OPEN: any error, missing transcript, or
// unresolvable session URL leaves the message untouched and the commit
// proceeds — a guard bug must never wedge a commit (ADR-0017: a regression
// degrades cleanly back to the manual-amend status quo, it is not a blocking
// gate).
//
// `computeFooterAction` also catches a *present-but-mismatched* `Claude-Session:`
// trailer (issue #710) — the one commit surface where an agent hand-writes the
// footer itself (`git commit -F`, no harness auto-injection) had zero preventive
// coverage: `session-id-guard.ts`'s Stop-hook backstop only runs at teardown,
// after the commit already landed. This reuses that same comparison shape
// (`findSessionIdMismatches`) inline rather than importing across files, to keep
// the fix a single-file change.
//
// Issue #797 extends that same "already-present footer" check to the
// `Co-Authored-By:` line's model name: it was previously matched loosely (any
// name, pinned only to the `noreply@anthropic.com` address), so a wrong model
// name never got caught mechanically. `computeFooterAction` now also compares
// the existing name against `KNOWN_MODEL_NAMES` and, on a miss, corrects that
// line too — the same auto-correct treatment (never a hard commit failure) the
// session-id mismatch above already gets, generalized so a `correct` action can
// carry either or both trailer lines.
//
// Safety property: the guard is inert unless it can resolve an agent session URL
// (from `CLAUDE_CODE_REMOTE_SESSION_ID` or the transcript's own session id). A
// plain human `git commit` outside an agent session resolves neither, so
// `computeFooterAction` returns `noop` and no Claude footer is ever stamped onto a
// human's commit.
//
// Scope boundary: a git hook only ever covers a local `git commit`. MCP-API commits
// (`create_or_update_file` / `push_files`) bypass local git entirely and are NOT
// covered by this mechanism (documented in the issue #346 PR).
//
// Usage (normally invoked by `.githooks/commit-msg`, installed via `core.hooksPath`):
//   tsx scripts/provenance-footer.ts <commit-msg-file>
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { SESSION_TRAILER } from './git-helpers.ts'
import {
  busiestModelId,
  extractTrace,
  formatModelId,
  normalizeRemoteSessionId,
  parseTranscript,
  type SessionIdEnv,
} from './session-trace.ts'

/** The model-name fallback when no transcript is available to derive the busiest
 *  model — the single home, also consumed by `log-session.ts`'s `deriveModelName`.
 *  ADR-0017 has no "the trace didn't say" exemption; the footer still needs a value. */
export const FALLBACK_MODEL = 'Claude'

/** The current Claude model family display names a `Co-Authored-By:` line is
 *  expected to name (issue #797) — the single named list a future model
 *  release updates, rather than a literal buried inside the validation logic.
 *  Sourced from this harness's own commit-footer template; keep in sync with
 *  it as new models ship. `isKnownModelName` also accepts `FALLBACK_MODEL`
 *  itself, since that's this file's own legitimate stand-in when no transcript
 *  is available to name a specific model. */
export const KNOWN_MODEL_NAMES: readonly string[] = [
  'Claude Opus 5',
  'Claude Sonnet 5',
  'Claude Fable 5',
  'Claude Haiku 4.5',
]

/** True when `name` is a recognized `Co-Authored-By:` model name — a
 *  `KNOWN_MODEL_NAMES` entry, or the generic `FALLBACK_MODEL`. */
export function isKnownModelName(name: string): boolean {
  return name === FALLBACK_MODEL || KNOWN_MODEL_NAMES.includes(name)
}

/** The `Co-Authored-By:` half of the ADR-0017 footer — matched loosely (any
 *  model name) but pinned to the `noreply@anthropic.com` address so an unrelated
 *  human co-author line never reads as "footer already present". Model-name
 *  *validity* is a separate, stricter check (`coAuthorModelName` +
 *  `isKnownModelName`, issue #797) — this one only gates presence. */
const COAUTHOR_LINE = /^Co-Authored-By:.*<noreply@anthropic\.com>/m

/** The model name a `Co-Authored-By:` line names, or `null` if `text` carries
 *  none — the extraction half of the issue #797 allowlist check, mirroring
 *  `trailerSessionId`'s shape for the session half. */
function coAuthorModelName(text: string): string | null {
  const match = text.match(/^Co-Authored-By:\s*(.+?)\s*<noreply@anthropic\.com>/m)
  return match?.[1] ?? null
}

/** True when BOTH footer lines are already present (harness template fired, or a
 *  `git commit -F` path already appended them). The `Claude-Session:` half reuses
 *  the single-homed `SESSION_TRAILER` pattern (git-helpers.ts) rather than coining
 *  a second one. Drives the idempotency guarantee: never double-append. */
export function hasProvenanceFooter(message: string): boolean {
  return COAUTHOR_LINE.test(message) && SESSION_TRAILER.test(message)
}

/** The session id a `Claude-Session:` trailer names, or `null` if `text` carries
 *  none — the same `SESSION_TRAILER` pattern `session-id-guard.ts` compares
 *  against, applied here to either a full commit message or a lone freshly-built
 *  `sessionLine()`, so both sides of the mismatch check share one extraction. */
function trailerSessionId(text: string): string | null {
  const match = text.match(SESSION_TRAILER)
  return match?.[1] ?? null
}

// Each footer line built once (single home for the exact text) so the full-footer
// path and the "append only the missing line" path in computeFooterAction can't
// diverge.
function coAuthorLine(modelName: string): string {
  return `Co-Authored-By: ${modelName} <noreply@anthropic.com>`
}
function sessionLine(sessionUrl: string): string {
  return `Claude-Session: ${sessionUrl}`
}

/** The ADR-0017 two-line footer. The single code home for the format — reused by
 *  `buildLogCommit()` (the direct-to-`main` log commit) and by this guard, so the
 *  two can never drift (issue #346's "reuse, don't fork the footer" invariant). */
export function provenanceFooter(modelName: string, sessionUrl: string): string {
  return [coAuthorLine(modelName), sessionLine(sessionUrl)].join('\n')
}

/** Append `footer` as its own trailing paragraph (a trailer needs a blank line
 *  before it or git won't parse it as one), with exactly one terminating newline. */
export function applyFooter(message: string, footer: string): string {
  return `${message.replace(/\s+$/, '')}\n\n${footer}\n`
}

/** Replace an existing `Claude-Session:` trailer line in place with `footer`
 *  (itself a full `Claude-Session: <url>` line) — used for the issue #710
 *  present-but-mismatched case, where the fix is to correct the one wrong
 *  line, not append a second trailer. Only the first match is replaced;
 *  `hasProvenanceFooter` (and therefore this path) only ever fires with
 *  exactly one trailer line present. */
export function correctSessionTrailer(message: string, footer: string): string {
  return message.replace(/^Claude-Session:.*$/m, footer)
}

/** Replace an existing `Co-Authored-By:` trailer line in place with `footer`
 *  (itself a full `Co-Authored-By: <name> <noreply@anthropic.com>` line) — the
 *  model-name analog of `correctSessionTrailer` (issue #797). Only the first
 *  match is replaced, mirroring that function's contract. */
export function correctCoAuthorLine(message: string, footer: string): string {
  return message.replace(/^Co-Authored-By:.*$/m, footer)
}

/** Apply a `correct` action's replacement footer — one or two full trailer
 *  lines, `\n`-joined — each line replacing its own matching trailer in place
 *  (issue #710's single-line-fix contract, generalized so a session-id fix and
 *  a model-name fix (issue #797) can land together in one pass). */
export function applyCorrections(message: string, footer: string): string {
  let updated = message
  for (const line of footer.split('\n')) {
    updated = line.startsWith('Claude-Session:')
      ? correctSessionTrailer(updated, line)
      : correctCoAuthorLine(updated, line)
  }
  return updated
}

export type FooterAction =
  | { action: 'noop' }
  | { action: 'append'; footer: string }
  | { action: 'correct'; footer: string }

/** The pure, unit-testable core. Idempotent (present-and-matching footer →
 *  `noop`); when the session URL is unresolvable it also `noop`s rather than
 *  append half a footer — the `Claude-Session:` line is the load-bearing
 *  recoverable key, and a footer missing it is worse than none (ADR-0017
 *  degrades to status quo).
 *
 *  A present footer is no longer an unconditional `noop` (issue #710): when
 *  the existing `Claude-Session:` trailer's id doesn't match the resolved
 *  ground-truth session, this returns `correct` instead — the same comparison
 *  `session-id-guard.ts`'s `findSessionIdMismatches` makes at Stop-hook time,
 *  run here at commit time instead so a hand-typed wrong id never lands in
 *  the first place. Any resolution failure (`sessionUrl` null, no trailer id
 *  extractable on either side) still falls through to `noop` — fail-open,
 *  never a false-positive rewrite.
 *
 *  Issue #797 adds the same treatment for the `Co-Authored-By:` line's model
 *  name: an existing name not in `KNOWN_MODEL_NAMES` also earns a `correct`,
 *  replaced with `modelName` (the resolved ground truth, same as the append
 *  path uses). Both checks run independently and their corrected lines are
 *  combined into one `correct` action when both fire, so a footer wrong on
 *  both axes at once is fixed in a single pass rather than needing a second
 *  commit-msg invocation to catch the second one. */
export function computeFooterAction(
  message: string,
  sessionUrl: string | null,
  modelName: string,
): FooterAction {
  if (hasProvenanceFooter(message)) {
    if (!sessionUrl) return { action: 'noop' }
    const corrections: string[] = []

    const existingId = trailerSessionId(message)
    const expectedId = trailerSessionId(sessionLine(sessionUrl))
    if (existingId && expectedId && existingId !== expectedId) {
      corrections.push(sessionLine(sessionUrl))
    }

    const existingModel = coAuthorModelName(message)
    if (existingModel !== null && !isKnownModelName(existingModel)) {
      corrections.push(coAuthorLine(modelName))
    }

    if (corrections.length === 0) return { action: 'noop' }
    return { action: 'correct', footer: corrections.join('\n') }
  }
  if (!sessionUrl) return { action: 'noop' }
  // The harness template can inject the Co-Authored-By half without the
  // Claude-Session half; append only the missing line so a half-present footer
  // never yields a duplicate co-author line (issue #346 review).
  const footer = COAUTHOR_LINE.test(message)
    ? sessionLine(sessionUrl)
    : provenanceFooter(modelName, sessionUrl)
  return { action: 'append', footer }
}

export function sessionUrlFor(sessionId: string | null | undefined): string | null {
  return sessionId ? `https://claude.ai/code/${sessionId}` : null
}

/** Session URL from the environment alone (no transcript): the normalized
 *  `CLAUDE_CODE_REMOTE_SESSION_ID`. This is the reliable fallback when the
 *  transcript can't be located — the remote session id is what the harness's own
 *  template URL is built from, so it reconstructs the same URL. */
export function sessionUrlFromEnv(env: SessionIdEnv): string | null {
  return sessionUrlFor(normalizeRemoteSessionId(env.CLAUDE_CODE_REMOTE_SESSION_ID))
}

/** `~/.claude` (or `$CLAUDE_CONFIG_DIR`) — where Claude Code stores transcripts. */
function configDir(env: SessionIdEnv): string {
  return env.CLAUDE_CONFIG_DIR || join(homedir(), '.claude')
}

/** Best-effort transcript-file lookup: `<config>/projects/<munged-cwd>/<uuid>.jsonl`,
 *  keyed by `CLAUDE_CODE_SESSION_ID` (the transcript's own filename). The munged
 *  project dir is opaque, so scan the one `projects/` level for the uuid filename
 *  rather than reconstruct the mangling. Returns the file's contents, or null on
 *  any miss — the caller then falls back to env-only session resolution. */
export function findTranscriptContents(env: SessionIdEnv): string | null {
  const uuid = env.CLAUDE_CODE_SESSION_ID
  if (!uuid) return null
  const projectsRoot = join(configDir(env), 'projects')
  if (!existsSync(projectsRoot)) return null
  let dirs: string[]
  try {
    dirs = readdirSync(projectsRoot)
  } catch {
    return null
  }
  for (const dir of dirs) {
    const p = join(projectsRoot, dir, `${uuid}.jsonl`)
    if (existsSync(p)) {
      try {
        return readFileSync(p, 'utf8')
      } catch {
        return null
      }
    }
  }
  return null
}

/** Reconstruct `(sessionUrl, modelName)` for the current session: prefer the
 *  transcript (gives both the ground-truth session id and the busiest model),
 *  and fall back to the environment for the session URL when no transcript is
 *  found (model then stays the generic fallback). Pure over its `env`/`transcript`
 *  inputs — the I/O (locating + reading the transcript) is the caller's. */
export function reconstructFooterValues(
  env: SessionIdEnv,
  transcript: string | null,
): { sessionUrl: string | null; modelName: string } {
  let sessionUrl: string | null = null
  let modelName = FALLBACK_MODEL
  if (transcript) {
    const trace = extractTrace(parseTranscript(transcript), env)
    sessionUrl = sessionUrlFor(trace.session)
    const busiest = busiestModelId(trace.models)
    if (busiest) modelName = formatModelId(busiest)
  }
  if (!sessionUrl) sessionUrl = sessionUrlFromEnv(env)
  return { sessionUrl, modelName }
}

/** The thin I/O shell: read the commit-message file (argv), reconstruct the
 *  footer values, and write the amended message back when the core decides to
 *  append or correct it. Every step is wrapped to fail open — see the file
 *  header. Unlike before issue #710, a present footer no longer short-circuits
 *  before resolving the transcript — `computeFooterAction` needs the resolved
 *  ground truth to check an existing trailer for a mismatch, not just its
 *  presence. */
function main(): void {
  const msgFile = process.argv[2]
  if (!msgFile || !existsSync(msgFile)) return
  let message: string
  try {
    message = readFileSync(msgFile, 'utf8')
  } catch {
    return
  }

  const env: SessionIdEnv = process.env
  let transcript: string | null = null
  try {
    transcript = findTranscriptContents(env)
  } catch {
    /* fall through to env-only resolution */
  }
  const { sessionUrl, modelName } = reconstructFooterValues(env, transcript)

  const action = computeFooterAction(message, sessionUrl, modelName)
  if (action.action === 'noop') return
  try {
    const updated =
      action.action === 'append'
        ? applyFooter(message, action.footer)
        : applyCorrections(message, action.footer)
    writeFileSync(msgFile, updated)
  } catch {
    /* fail open: never block the commit */
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch {
    /* A commit-msg hook must never wedge a commit — swallow everything. */
  }
}
