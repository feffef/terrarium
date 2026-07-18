// Mechanical backstop for issue #387: CLAUDE.md's doc-only "never predict or
// reconstruct a session id" rule kept failing to hold (4+ recurrences after
// PR #362's strengthened prose, one of which actually landed on `main`).
// Prose alone can't catch "a plausible-looking id seen elsewhere in context" —
// this compares every `Claude-Session:` trailer on the session's OWN commits
// (`origin/main..HEAD`, never inherited history) against the resolved
// ground-truth session id (`resolveGroundTruthSessionId`, session-trace.ts —
// already built for the session log's own `session:` field by PR #533, and
// reused here rather than re-derived) and reports a mismatch.
//
// Pure core (`findSessionIdMismatches`) is kept separate from the git/hook I/O
// (`readOwnCommits`), mirroring the `session-end.ts` `handle()` split and the
// `findTruncatedScalars`/`fail()` precedent in `log-session.ts`. This module's
// own CLI exits non-zero on a mismatch; `scripts/session-end.ts` wires the
// pure check into the Stop-hook path but — per that script's own "never exit
// non-zero, so a handler bug can't wedge teardown" rule — surfaces a mismatch
// loudly (stderr + a recorded friction on the landed log) without failing the
// hook itself.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { fetchOriginMain, SESSION_TRAILER } from './git-helpers.ts'
import { extractTrace, parseTranscript, type SessionIdEnv } from './session-trace.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const REC = '\x1e' // record separator, matching audit-skills.ts's git-log convention

/** One of the session's own commits: its sha, and the session id its
 *  `Claude-Session:` trailer names, if it carries one at all. Most commits on
 *  a feature branch carry no trailer — only a hand-authored one (`git commit
 *  -F`, where the harness template isn't injected) or the log-landing commit
 *  itself does, and an absent trailer is never a mismatch. */
export interface OwnCommit {
  sha: string
  trailerSessionId?: string
}

export interface SessionIdMismatch {
  sha: string
  found: string
  expected: string
}

/** The pure, unit-testable core: `(commits, groundTruthId) → mismatches`.
 *  `groundTruthId` of `null`/`undefined` means no ground truth was resolvable
 *  (e.g. a plain local CLI session with no `CLAUDE_CODE_REMOTE_SESSION_ID` and
 *  no transcript `sessionId`) — the contract is to skip and pass, never a
 *  false failure, so this returns no mismatches in that case regardless of
 *  what the commits carry. */
export function findSessionIdMismatches(
  commits: OwnCommit[],
  groundTruthId: string | null | undefined,
): SessionIdMismatch[] {
  if (!groundTruthId) return []
  const out: SessionIdMismatch[] = []
  for (const { sha, trailerSessionId } of commits) {
    if (!trailerSessionId) continue // no trailer to check — not a mismatch
    if (trailerSessionId !== groundTruthId) {
      out.push({ sha, found: trailerSessionId, expected: groundTruthId })
    }
  }
  return out
}

/** Expects `readOwnCommits`'s `git log` format: one record per commit, a sha
 *  header line followed by the full commit message body. */
export function parseOwnCommits(raw: string): OwnCommit[] {
  const out: OwnCommit[] = []
  for (const block of raw.split(REC).map((b) => b.trim()).filter(Boolean)) {
    const nl = block.indexOf('\n')
    const sha = (nl >= 0 ? block.slice(0, nl) : block).trim()
    const body = nl >= 0 ? block.slice(nl + 1) : ''
    if (!sha) continue
    const m = body.match(SESSION_TRAILER)
    out.push({ sha, trailerSessionId: m ? m[1] : undefined })
  }
  return out
}

/** The session's own commits — `origin/main..HEAD`, never inherited history
 *  already on `main` (CLAUDE.md's git-log-scoping rule). Fails open ([]) on
 *  any git error (detached HEAD, no `origin` remote, offline): this is a
 *  backstop check, not the primary one, and it must never itself break a
 *  session that has nothing wrong with its trailers to report. */
export function readOwnCommits(cwd: string, remote = 'origin'): OwnCommit[] {
  try {
    fetchOriginMain(cwd, remote)
  } catch {
    /* offline / no remote / timed out — fall through and read whatever local ref we have */
  }
  try {
    const raw = execFileSync(
      'git',
      ['log', `${remote}/main..HEAD`, `--pretty=format:${REC}%H%n%B`],
      { cwd, encoding: 'utf8' },
    )
    return parseOwnCommits(raw)
  } catch {
    return []
  }
}

/** `(transcript, env) → sessionId | null` — the ground-truth resolver the
 *  Agent Brief asks for, as a thin wrapper: `extractTrace` already resolves it
 *  via `resolveGroundTruthSessionId` (session-trace.ts, PR #533) from the same
 *  two sources (env var, else transcript `sessionId`), so this reuses that
 *  rather than re-deriving the precedence rule a second time. */
export function resolveGroundTruthFromTranscript(
  transcriptJsonl: string,
  env: SessionIdEnv = process.env,
): string | null {
  return extractTrace(parseTranscript(transcriptJsonl), env).session ?? null
}

/** Human-readable rejection naming every offending commit, the id its trailer
 *  found, and the id it should have carried — mirrors `log-session.ts`'s
 *  `truncationError` shape (issue #387's acceptance criteria: name the
 *  offending commit, the found id, the expected id). */
export function formatMismatchError(mismatches: SessionIdMismatch[]): string {
  const lines = mismatches.map(
    (m) => `  ${m.sha.slice(0, 12)}: Claude-Session trailer says ${m.found}, expected ${m.expected}`,
  )
  return (
    `session-id-guard: fabricated or mismatched Claude-Session trailer(s) on this session's own commit(s) ` +
    `(issue #387 — CLAUDE.md: never predict/reconstruct a session id):\n${lines.join('\n')}`
  )
}

function fail(msg: string): never {
  console.error(`session-id-guard: ${msg}`)
  process.exit(1)
}

/** Standalone CLI: `tsx scripts/session-id-guard.ts [--transcript <path>]`.
 *  Exits non-zero on a mismatch (unlike the Stop-hook integration in
 *  `session-end.ts`, which is deliberately non-fatal to teardown) — this is
 *  the entry point a future tighter boundary (e.g. a pre-push hook) could
 *  call directly for a hard failure. */
function main(): void {
  const argv = process.argv.slice(2)
  const idx = argv.indexOf('--transcript')
  const transcriptPath = idx >= 0 ? argv[idx + 1] : undefined
  if (!transcriptPath) fail('usage: --transcript <path-to-transcript.jsonl>')

  let transcriptJsonl: string
  try {
    transcriptJsonl = readFileSync(transcriptPath, 'utf8')
  } catch (err) {
    fail(`could not read transcript: ${err instanceof Error ? err.message : err}`)
  }

  const groundTruthId = resolveGroundTruthFromTranscript(transcriptJsonl)
  if (!groundTruthId) {
    console.log('session-id-guard: no ground-truth session id available — skipping (pass)')
    return
  }
  const mismatches = findSessionIdMismatches(readOwnCommits(root), groundTruthId)
  if (mismatches.length > 0) fail(formatMismatchError(mismatches))
  console.log(`session-id-guard: ✓ no Claude-Session trailer mismatches against ${groundTruthId}`)
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
}
