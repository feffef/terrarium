// The session-log landing handler (ADR-0009 amendment): the trigger + commit half
// of automatic session logging. The same script is wired to THREE hook events, all
// carrying `transcript_path` on stdin, so the land happens over a live network
// instead of being bolted to teardown (#148):
//   • `Stop` (primary) — fires at the end of the turn in which the agent invoked
//     `log-session` and wrote the scratch. Live network, so the log lands promptly
//     while the session is healthy — the fix for the freeze-races-a-dead-network case.
//   • `SessionEnd` (fallback) — teardown, including a web freeze (`reason: other`).
//     Best-effort now, not the only chance: on a network-freezing suspend it fails
//     silently as before, but `Stop` already landed the log.
//   • `SessionStart` matcher `resume` (deepest fallback) — a resumed session always
//     has a live network; lands a scratch that no `Stop`/`SessionEnd` managed to.
//
// Flow: read the hook payload on stdin → if no authored scratch exists, do NOTHING
// (the scratch's existence is the wrap-up signal — a freeze mid-work has none) →
// if this exact scratch already landed (the sentinel gate, `isAlreadyLanded`), do
// NOTHING (no fetch/push — this is what makes running on every `Stop` cheap) → else
// derive the mechanical trace from the transcript, stitch it with the scratch,
// validate against the frozen `sessions` schema, and — only if the result differs
// from what is already on `main` (the diff-guard) — land it via the ADR-0009 push
// machinery, then record the sentinel. Idempotent: re-invoking `log-session`
// changes the scratch, so the next event re-derives from the longer transcript and
// overwrites the single log file with the superset.
//
// This is gated code (it steps around the gate, ADR-0004/0009) — a normal PR.
//
// Usage (normally invoked by a hook with the payload on stdin):
//   tsx scripts/session-end.ts [--dry-run] [--transcript <path>] [--scratch <path>]
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { stringify as stringifyYaml } from 'yaml'
import { fetchOriginMain } from './git-helpers.ts'
import {
  extractTrace,
  parseTranscript,
  stitch,
  SCRATCH_FILE,
  STAGING_DIR,
  LAST_LANDED_FILE,
  type AuthoredScratch,
  type MechanicalTrace,
  type SessionIdEnv,
} from './session-trace.ts'
import { validateEntry, expectedFilename, SESSIONS_DIR, land } from './log-session.ts'
import {
  findSessionIdMismatches,
  formatMismatchError,
  readOwnCommits,
  resolveGroundTruthFromTranscript,
  type SessionIdMismatch,
} from './session-id-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function readStdin(): string {
  try {
    return readFileSync(0, 'utf8')
  } catch {
    return ''
  }
}

/** origin/main's current bytes for a path, or null if it does not exist there.
 *  Used by the diff-guard so an unchanged re-derive never commits. */
function mainVersion(relPath: string, remote: string): string | null {
  try {
    fetchOriginMain(root, remote)
  } catch {
    /* offline / no remote / timed out — fall through; the push loop will surface it */
  }
  try {
    return execFileSync('git', ['show', `${remote}/main:${relPath}`], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'], // quiet: a missing path is expected, not an error
    })
  } catch {
    return null // not yet on main
  }
}

export interface HandlerResult {
  action: 'skipped-no-scratch' | 'skipped-unchanged' | 'invalid' | 'landed' | 'dry-run'
  relPath?: string
  detail?: string
}

/** The landing gate (#148). The derived trace grows every turn (durationSec,
 *  toolCounts), so keying on the stitched output would push to `main` on every
 *  turn once a scratch exists. Instead we key on the *authored scratch*: land when
 *  its bytes differ from the last-landed sentinel, no-op otherwise. Re-invoking
 *  `log-session` (a new friction / updated outcome) changes the scratch, so the
 *  next live event re-lands the superset — exactly the "log when done, log again
 *  on a new event" semantics. Pure over the raw bytes: the testable core. */
export function scratchHashOf(scratchRaw: string): string {
  return createHash('sha256').update(scratchRaw).digest('hex')
}

/** True when `scratchRaw` is already on `main` per the sentinel — skip the land.
 *  A missing/garbage sentinel (`null`) always means "not landed": land it. */
export function isAlreadyLanded(scratchRaw: string, sentinelRaw: string | null): boolean {
  if (sentinelRaw === null) return false
  try {
    const sentinel = JSON.parse(sentinelRaw) as { scratchHash?: string }
    return sentinel.scratchHash === scratchHashOf(scratchRaw)
  } catch {
    return false // unreadable sentinel — treat as not landed
  }
}

/** True when the transcript shows the session invoked `log-session` — i.e.
 *  declared its own closure — regardless of whether the authored scratch
 *  survived long enough to be read (issue #449 Gap 3). This is the durable
 *  evidence a dropped scratch leaves behind: the interpretive scratch lives in
 *  gitignored, container-local `.session-logs/` and a container reclaim on
 *  resume can erase it before any hook lands the log, but the transcript
 *  recording the Skill invocation is the more resilient artifact — it is what
 *  let session_01HCnkeyqxf46SjouSPxrazN (2026-07-06) recover its own dropped
 *  log by hand, run against the still-present transcript. */
export function declaredClosure(trace: MechanicalTrace): boolean {
  return trace.skillsUsed.includes('log-session')
}

/** The marker a session-id-mismatch friction carries (issue #387) — greppable,
 *  mirroring `DROPPED_SCRATCH_FRICTION`'s pattern, and distinguishes this
 *  mechanically-detected finding from a friction the agent wrote by hand. */
export const SESSION_ID_MISMATCH_FRICTION = "issue #387: Claude-Session trailer mismatch on this session's own commit(s)"

/** Append a synthetic 'blocker' friction recording a detected `Claude-Session`
 *  trailer mismatch (issue #387) onto the authored scratch — the "recorded
 *  signal" half of the guard's contract (stderr, printed by `main()`, is the
 *  other half). This is how the mismatch survives past the ephemeral Stop-hook
 *  stderr and into the landed session log itself, where a human or
 *  `audit-skills` can find it later — all WITHOUT failing the hook itself
 *  (session-end is deliberately non-fatal to teardown, see the file header).
 *  A no-op (returns `scratch` unchanged) when there is nothing to report. */
export function withSessionIdMismatchFriction(
  scratch: AuthoredScratch,
  mismatches: SessionIdMismatch[],
): AuthoredScratch {
  if (mismatches.length === 0) return scratch
  return {
    ...scratch,
    frictions: [
      ...scratch.frictions,
      {
        description: `${SESSION_ID_MISMATCH_FRICTION}: ${formatMismatchError(mismatches)}`,
        solution:
          "Investigate the offending commit(s): CLAUDE.md forbids predicting/reconstructing a session id " +
          "(never copy one seen elsewhere in context) — resolve the real id from $CLAUDE_CODE_REMOTE_SESSION_ID " +
          "or the transcript at the moment of writing, and escalate per issue #387 if the divergence is unexplained.",
        severity: 'blocker',
      },
    ],
  }
}

/** The marker every dropped-scratch placeholder log's sole friction carries —
 *  greppable, and distinguishes this synthetic entry from a real one. */
export const DROPPED_SCRATCH_FRICTION = 'issue #449 Gap 3: authored scratch dropped before landing'

/** A minimal, clearly-flagged stand-in for the scratch that was lost. `kind` is
 *  a best-effort guess from `entrypoint` (never authoritative — the real intent
 *  went with the scratch); every interpretive field says plainly that it is a
 *  placeholder, not the agent's own words. */
export function buildDroppedScratchScratch(trace: MechanicalTrace): AuthoredScratch {
  return {
    session: trace.session ?? '',
    kind: trace.entrypoint === 'remote_trigger' ? 'autonomous' : 'interactive',
    goal: '(unknown — authored scratch lost before landing)',
    status: 'abandoned',
    outcome: 'authored scratch lost before landing',
    summary:
      'This session invoked log-session (closure was declared) but its authored interpretive scratch — ' +
      'goal, outcome, summary, frictions — was lost before the SessionEnd handler could land it, most likely ' +
      `a container reclaim on resume erasing the gitignored .session-logs/ scratch before teardown committed ` +
      `(${DROPPED_SCRATCH_FRICTION}). Only the mechanical trace could be recovered; nothing in this entry ` +
      "reflects the agent's own words.",
    frictions: [
      {
        description: DROPPED_SCRATCH_FRICTION,
        solution:
          'If the raw transcript is still available, a human or a follow-up session can re-author a faithful ' +
          'scratch from it and re-land a corrected log over this placeholder.',
        severity: 'major',
      },
    ],
  }
}

/** The common tail `handle()` and `recoverDroppedScratch()` share once their
 *  own distinct landing gate (content-diff vs existence-check) has already
 *  decided to proceed: stage the byte source, then hand it to `land()`. The
 *  log lands from a gitignored staging copy, never the working tree — `land`
 *  only needs `absPath` as a byte source for `git hash-object`, and `relPath`
 *  is the commit's tree location, so the tree never holds an untracked log
 *  (#148). */
function stageAndLand(
  relPath: string,
  yaml: string,
  opts: { dryRun: boolean; remote: string; landFn?: typeof land },
): HandlerResult {
  const stagingPath = join(root, STAGING_DIR, basename(relPath))
  mkdirSync(dirname(stagingPath), { recursive: true })
  writeFileSync(stagingPath, yaml)
  const landFn = opts.landFn ?? land
  landFn(relPath, stagingPath, opts.remote, { dryRun: opts.dryRun })
  return { action: opts.dryRun ? 'dry-run' : 'landed', relPath }
}

/** Recovery path for the "authored-then-dropped" case (issue #449 Gap 3),
 *  distinct from a session that never declared closure at all (#397,
 *  unrescuable by any hook). The scratch itself can be lost to a container
 *  reclaim, but `declaredClosure` reads durable evidence straight out of the
 *  transcript. Lands a minimal placeholder log ONLY when nothing exists yet at
 *  the session's expected path — existence-checked, not content-diffed like
 *  `handle`'s normal gate, so this never overwrites a real, richer log (or an
 *  earlier placeholder) that already landed there. Every field the placeholder
 *  carries is explicit placeholder prose (see `buildDroppedScratchScratch`),
 *  and `droppedScratchRecovery: true` additionally marks it structurally, so a
 *  consumer never has to grep friction text to tell it apart from a real log. */
export function recoverDroppedScratch(
  transcriptJsonl: string,
  opts: {
    dryRun: boolean
    remote: string
    landFn?: typeof land
    mainVersionFn?: (relPath: string, remote: string) => string | null
    env?: SessionIdEnv
  },
): HandlerResult {
  const trace = extractTrace(parseTranscript(transcriptJsonl), opts.env)
  if (!trace.session || !declaredClosure(trace)) {
    return { action: 'skipped-no-scratch' }
  }

  const entry = stitch(buildDroppedScratchScratch(trace), trace)
  entry.droppedScratchRecovery = true
  const valid = validateEntry(entry)
  if (!valid.ok) return { action: 'invalid', detail: valid.errors }

  const relPath = join(SESSIONS_DIR, expectedFilename(valid.data))
  const getMain = opts.mainVersionFn ?? mainVersion
  if (getMain(relPath, opts.remote) !== null) {
    // Something already lives at this path — the real log landed (or a prior
    // placeholder already recorded the drop). Never overwrite either.
    return { action: 'skipped-unchanged', relPath }
  }

  const yaml = stringifyYaml(entry, { lineWidth: 0 })
  return stageAndLand(relPath, yaml, opts)
}

/** The testable core: given a scratch and a transcript, produce + (maybe) land
 *  the log. `push`/`build` flow through `land`, injectable for tests via opts. */
export function handle(
  scratch: AuthoredScratch,
  transcriptJsonl: string,
  opts: {
    dryRun: boolean
    remote: string
    landFn?: typeof land
    mainVersionFn?: (relPath: string, remote: string) => string | null
    env?: SessionIdEnv
  },
): HandlerResult {
  const trace = extractTrace(parseTranscript(transcriptJsonl), opts.env)
  const entry = stitch(scratch, trace)

  const valid = validateEntry(entry)
  if (!valid.ok) return { action: 'invalid', detail: valid.errors }

  const relPath = join(SESSIONS_DIR, expectedFilename(valid.data))
  // YAML stringify with generous width so long summaries/paths don't hard-wrap
  // into shapes the parser round-trips differently.
  const yaml = stringifyYaml(entry, { lineWidth: 0 })

  const getMain = opts.mainVersionFn ?? mainVersion
  const current = getMain(relPath, opts.remote)
  if (current !== null && current === yaml) {
    return { action: 'skipped-unchanged', relPath }
  }

  return stageAndLand(relPath, yaml, opts)
}

function main(): void {
  const argv = process.argv.slice(2)
  const dryRun = argv.includes('--dry-run')
  const arg = (flag: string): string | undefined => {
    const i = argv.indexOf(flag)
    return i >= 0 ? argv[i + 1] : undefined
  }

  // Payload on stdin (hook); argv overrides help testing.
  let payload: { transcript_path?: string } = {}
  const stdin = readStdin()
  if (stdin.trim()) {
    try {
      payload = JSON.parse(stdin)
    } catch {
      /* not JSON — rely on argv */
    }
  }
  const transcriptPath = arg('--transcript') ?? payload.transcript_path
  const scratchPath = arg('--scratch') ?? join(root, SCRATCH_FILE)

  // The wrap-up signal: no scratch ⇒ either the session never declared closure
  // (#397, unrescuable — do nothing), or its scratch was authored and then lost
  // (issue #449 Gap 3) — the transcript itself carries the durable evidence to
  // tell the two apart, so check it before giving up silently.
  if (!existsSync(scratchPath)) {
    if (transcriptPath && existsSync(transcriptPath)) {
      const result = recoverDroppedScratch(readFileSync(transcriptPath, 'utf8'), { dryRun, remote: 'origin' })
      if (result.action === 'landed' || result.action === 'dry-run') {
        console.error(
          `session-end: authored scratch was lost before landing — recorded a placeholder log at ${result.relPath} (${DROPPED_SCRATCH_FRICTION})`,
        )
        return
      }
      if (result.action === 'invalid') {
        console.error(`session-end: dropped-scratch recovery produced an invalid entry, skipping:\n${result.detail}`)
      }
    }
    console.error('session-end: no authored scratch — session did not declare closure; skipping')
    return
  }
  if (!transcriptPath || !existsSync(transcriptPath)) {
    console.error(`session-end: transcript not found (${transcriptPath ?? 'unset'}); skipping`)
    return
  }

  const scratchRaw = readFileSync(scratchPath, 'utf8')
  let scratch: AuthoredScratch
  try {
    scratch = JSON.parse(scratchRaw)
  } catch (err) {
    console.error(`session-end: could not read scratch: ${err instanceof Error ? err.message : err}`)
    return
  }

  const transcriptJsonl = readFileSync(transcriptPath, 'utf8')

  // The session-id-fabrication backstop (issue #387): CLAUDE.md's doc-only
  // "never predict/reconstruct a session id" rule has repeatedly failed to
  // hold. Compare this session's own commits (origin/main..HEAD only — never
  // inherited history) against the resolved ground-truth session id and
  // surface any mismatch loudly. Deliberately non-fatal here (this hook must
  // never wedge the log land) — the finding is recorded as a blocker friction
  // on the entry that lands, not by exiting non-zero (see session-id-guard.ts
  // for the standalone CLI that does exit non-zero on this same check).
  const groundTruthId = resolveGroundTruthFromTranscript(transcriptJsonl)
  const mismatches = findSessionIdMismatches(readOwnCommits(root), groundTruthId)
  if (mismatches.length > 0) {
    console.error(formatMismatchError(mismatches))
    scratch = withSessionIdMismatchFriction(scratch, mismatches)
  }

  // The landing gate (#148): if this exact scratch already landed, do nothing —
  // no fetch, no push. This is what lets the same script run on every live `Stop`
  // (and on resume) cheaply; it only does real work when the agent (re)declares
  // closure. `--dry-run` bypasses the gate so a dry run always exercises the path.
  // Note: a session-id mismatch alone (with the scratch otherwise unchanged) does
  // NOT reopen this gate — the mismatch was already reported above via stderr;
  // re-landing needs the scratch itself to change, same as any other new finding.
  const sentinelPath = join(root, LAST_LANDED_FILE)
  const sentinelRaw = existsSync(sentinelPath) ? readFileSync(sentinelPath, 'utf8') : null
  if (!dryRun && isAlreadyLanded(scratchRaw, sentinelRaw)) {
    console.error('session-end: log already landed for this scratch; nothing to do')
    return
  }

  const result = handle(scratch, transcriptJsonl, { dryRun, remote: 'origin' })
  switch (result.action) {
    case 'invalid':
      console.error(`session-end: stitched entry is invalid, not logging:\n${result.detail}`)
      break
    case 'skipped-unchanged':
      console.error(`session-end: ${result.relPath} unchanged on main; nothing to do`)
      break
    default:
      console.error(`session-end: ${result.action} ${result.relPath ?? ''}`)
  }

  // Record what we landed so the next event's gate no-ops until the scratch changes.
  // Both 'landed' and 'skipped-unchanged' mean this scratch's content is on `main`.
  if (!dryRun && (result.action === 'landed' || result.action === 'skipped-unchanged') && result.relPath) {
    mkdirSync(dirname(sentinelPath), { recursive: true })
    writeFileSync(sentinelPath, JSON.stringify({ scratchHash: scratchHashOf(scratchRaw), relPath: result.relPath }, null, 2))
  }
}

// A SessionEnd hook cannot block and its failures are cosmetic — never exit
// non-zero, so a handler bug can't wedge teardown. Errors go to stderr only.
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  try {
    main()
  } catch (err) {
    console.error(`session-end: ${err instanceof Error ? err.message : String(err)}`)
  }
}
