// The session-log landing handler (ADR-0009 amendment): the trigger + commit half
// of automatic session logging. The same script is wired to THREE hook events, all
// carrying `transcript_path` on stdin, so the land happens over a live network
// instead of being bolted to teardown (#148):
//   • `Stop` (primary) — fires at the end of the turn in which the agent invoked
//     `log-session` and wrote the scratch. Live network, so the log lands promptly
//     while the session is healthy — the fix for the freeze-races-a-dead-network case.
//   • `SessionEnd` (backstop) — teardown, including a web freeze (`reason: other`).
//     Best-effort now, not the only chance: on a network-freezing suspend it fails
//     silently as before, but `Stop` already landed the log.
//   • `SessionStart` matcher `resume` (deepest backstop) — a resumed session always
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
import {
  extractTrace,
  parseTranscript,
  stitch,
  SCRATCH_FILE,
  STAGING_DIR,
  LAST_LANDED_FILE,
  type AuthoredScratch,
} from './session-trace.ts'
import { validateEntry, expectedFilename, SESSIONS_DIR, land } from './log-session.ts'

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
    execFileSync('git', ['fetch', remote, 'main'], { cwd: root, stdio: 'ignore', timeout: 10_000 })
  } catch {
    /* offline / no remote — fall through; the push loop will surface it */
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
  },
): HandlerResult {
  const trace = extractTrace(parseTranscript(transcriptJsonl))
  const entry = stitch(scratch, trace)

  const valid = validateEntry(entry)
  if (!valid.ok) return { action: 'invalid', detail: valid.errors }

  const relPath = join(SESSIONS_DIR, expectedFilename(valid.data))
  // The log lands from a gitignored staging copy, never the working tree: `land`
  // only needs `absPath` as a byte source for `git hash-object`, and `relPath` is
  // the commit's tree location, so the tree never holds an untracked log (#148).
  const stagingPath = join(root, STAGING_DIR, basename(relPath))
  // YAML stringify with generous width so long summaries/paths don't hard-wrap
  // into shapes the parser round-trips differently.
  const yaml = stringifyYaml(entry, { lineWidth: 0 })

  const getMain = opts.mainVersionFn ?? mainVersion
  const current = getMain(relPath, opts.remote)
  if (current !== null && current === yaml) {
    return { action: 'skipped-unchanged', relPath }
  }

  mkdirSync(dirname(stagingPath), { recursive: true })
  writeFileSync(stagingPath, yaml)
  const landFn = opts.landFn ?? land
  landFn(relPath, stagingPath, opts.remote, { dryRun: opts.dryRun })
  return { action: opts.dryRun ? 'dry-run' : 'landed', relPath }
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

  // The wrap-up signal: no scratch ⇒ the session never declared closure. Do nothing.
  if (!existsSync(scratchPath)) {
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

  // The landing gate (#148): if this exact scratch already landed, do nothing —
  // no fetch, no push. This is what lets the same script run on every live `Stop`
  // (and on resume) cheaply; it only does real work when the agent (re)declares
  // closure. `--dry-run` bypasses the gate so a dry run always exercises the path.
  const sentinelPath = join(root, LAST_LANDED_FILE)
  const sentinelRaw = existsSync(sentinelPath) ? readFileSync(sentinelPath, 'utf8') : null
  if (!dryRun && isAlreadyLanded(scratchRaw, sentinelRaw)) {
    console.error('session-end: log already landed for this scratch; nothing to do')
    return
  }

  const result = handle(scratch, readFileSync(transcriptPath, 'utf8'), { dryRun, remote: 'origin' })
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
