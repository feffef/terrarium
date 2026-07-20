// The ADR-0017 provenance-footer backstop (issue #346). ADR-0017's Decision said
// "Commits already get this from the harness template — no repo-side change," but
// on cloud `git commit -m` that auto-injection intermittently does not fire (6/20
// sessions in a recent window each paid a manual amend cycle). This is the code
// home for the footer's exact two-line format plus a commit-msg git-hook entry
// point that appends it when absent, reconstructing the model name and session
// URL repo-side — the same two values `buildLogCommit()` derives (both now share
// `provenanceFooter()` and the model/session helpers, so the format is single-homed).
//
// The pure core (`hasProvenanceFooter` / `computeFooterAction` / `applyFooter` /
// `provenanceFooter`) is kept separate from the git-hook I/O (`main`), mirroring
// the `handle`/`main` split in `session-end.ts`. `main()` FAILS OPEN: any error,
// missing transcript, or unresolvable session URL leaves the message untouched and
// the commit proceeds — a guard bug must never wedge a commit (ADR-0017: a
// regression degrades cleanly back to the manual-amend status quo, it is not a
// blocking gate).
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
 *  model — mirrors `log-session.ts`'s `deriveModelName` fallback. ADR-0017 has no
 *  "the trace didn't say" exemption; the footer still needs a value. */
export const FALLBACK_MODEL = 'Claude'

/** The `Co-Authored-By:` half of the ADR-0017 footer — matched loosely (any
 *  model name) but pinned to the `noreply@anthropic.com` address so an unrelated
 *  human co-author line never reads as "footer already present". */
const COAUTHOR_LINE = /^Co-Authored-By:.*<noreply@anthropic\.com>/m

/** True when BOTH footer lines are already present (harness template fired, or a
 *  `git commit -F` path already appended them). The `Claude-Session:` half reuses
 *  the single-homed `SESSION_TRAILER` pattern (git-helpers.ts) rather than coining
 *  a second one. Drives the idempotency guarantee: never double-append. */
export function hasProvenanceFooter(message: string): boolean {
  return COAUTHOR_LINE.test(message) && SESSION_TRAILER.test(message)
}

/** The ADR-0017 two-line footer. The single code home for the format — reused by
 *  `buildLogCommit()` (the direct-to-`main` log commit) and by this guard, so the
 *  two can never drift (issue #346's "reuse, don't fork the footer" invariant). */
export function provenanceFooter(modelName: string, sessionUrl: string): string {
  return [
    `Co-Authored-By: ${modelName} <noreply@anthropic.com>`,
    `Claude-Session: ${sessionUrl}`,
  ].join('\n')
}

/** Append `footer` as its own trailing paragraph (a trailer needs a blank line
 *  before it or git won't parse it as one), with exactly one terminating newline. */
export function applyFooter(message: string, footer: string): string {
  return `${message.replace(/\s+$/, '')}\n\n${footer}\n`
}

export type FooterAction = { action: 'noop' } | { action: 'append'; footer: string }

/** The pure, unit-testable core. Idempotent (present footer → `noop`); and when
 *  the session URL is unresolvable it also `noop`s rather than append half a
 *  footer — the `Claude-Session:` line is the load-bearing recoverable key, and a
 *  footer missing it is worse than none (ADR-0017 degrades to status quo). */
export function computeFooterAction(
  message: string,
  sessionUrl: string | null,
  modelName: string,
): FooterAction {
  if (hasProvenanceFooter(message)) return { action: 'noop' }
  if (!sessionUrl) return { action: 'noop' }
  return { action: 'append', footer: provenanceFooter(modelName, sessionUrl) }
}

/** `<id>` → `https://claude.ai/code/<id>`, or null for a null/empty id. */
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
 *  footer values, and write the amended message back when one is appended. Every
 *  step is wrapped to fail open — see the file header. */
function main(): void {
  const msgFile = process.argv[2]
  if (!msgFile || !existsSync(msgFile)) return
  let message: string
  try {
    message = readFileSync(msgFile, 'utf8')
  } catch {
    return
  }
  // Cheap idempotency check first — the common already-good path never touches
  // the transcript.
  if (hasProvenanceFooter(message)) return

  const env: SessionIdEnv = process.env
  let transcript: string | null = null
  try {
    transcript = findTranscriptContents(env)
  } catch {
    /* fall through to env-only resolution */
  }
  const { sessionUrl, modelName } = reconstructFooterValues(env, transcript)

  const action = computeFooterAction(message, sessionUrl, modelName)
  if (action.action === 'append') {
    try {
      writeFileSync(msgFile, applyFooter(message, action.footer))
    } catch {
      /* fail open: never block the commit */
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch {
    /* A commit-msg hook must never wedge a commit — swallow everything. */
  }
}
