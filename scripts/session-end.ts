// The SessionEnd handler (ADR-0009 amendment): the trigger + commit half of
// automatic session logging. Wired to the committed `SessionEnd` hook, it runs
// at session teardown (including a web freeze, which fires `reason: other`).
//
// Flow: read the hook payload on stdin → if no authored scratch exists, do
// NOTHING (the scratch's existence is the wrap-up signal — a freeze mid-work has
// none); else derive the mechanical trace from the transcript, stitch it with the
// scratch, validate against the frozen `sessions` schema, and — only if the
// result differs from what is already on `main` (the diff-guard) — land it via
// the ADR-0009 push machinery. Idempotent: a resumed-then-ended session re-derives
// from the longer transcript and overwrites its single log file with the superset.
//
// This is gated code (it steps around the gate, ADR-0004/0009) — a normal PR.
//
// Usage (normally invoked by the hook with the payload on stdin):
//   tsx scripts/session-end.ts [--dry-run] [--transcript <path>] [--scratch <path>]
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { stringify as stringifyYaml } from 'yaml'
import { extractTrace, parseTranscript, stitch, SCRATCH_FILE, type AuthoredScratch } from './session-trace.ts'
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
    execFileSync('git', ['fetch', remote, 'main'], { cwd: root, stdio: 'ignore' })
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
  const absPath = join(root, relPath)
  // YAML stringify with generous width so long summaries/paths don't hard-wrap
  // into shapes the parser round-trips differently.
  const yaml = stringifyYaml(entry, { lineWidth: 0 })

  const getMain = opts.mainVersionFn ?? mainVersion
  const current = getMain(relPath, opts.remote)
  if (current !== null && current === yaml) {
    return { action: 'skipped-unchanged', relPath }
  }

  writeFileSync(absPath, yaml)
  const landFn = opts.landFn ?? land
  landFn(relPath, absPath, opts.remote, { dryRun: opts.dryRun })
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

  let scratch: AuthoredScratch
  try {
    scratch = JSON.parse(readFileSync(scratchPath, 'utf8'))
  } catch (err) {
    console.error(`session-end: could not read scratch: ${err instanceof Error ? err.message : err}`)
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
