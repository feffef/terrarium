// Denies an edit to the gated tree, or a `git commit`, while a `pnpm gate:scoped`
// run is live in that checkout: gate.ts `stepAbort` aborts the run on any tree
// or HEAD change (issue #3046). The signal is the gate's own run lock
// (`takeRunLock`: a pid file in the git dir, so each worktree has its own); a
// live pid means running. Paths outside the checkout and git-ignored files are
// not in `snapshotTree`, so they pass. Bash is caught only for `git commit`;
// a file-writing shell command passes. Human-only to merge (ADR-0004).
//
// Usage:
//   tsx scripts/hooks/gate-edit-guard.ts            # payload on stdin
//   tsx scripts/hooks/gate-edit-guard.ts --dry-run --tool Edit --input '<json>'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import {
  buildDenyOutput,
  denyUninspectable,
  printDryRunResult,
  prop,
  readHookJson,
  requireToolFlag,
  resolveDryRunInput,
  runGuard,
} from './hook-io.ts'

const LABEL = 'gate-edit guard'
const REF = 'issue #3046'
const COMMIT = /\bgit\s+(?:-C\s+(\S+)\s+)?commit\b/

function git(dir: string, args: string[]): { ok: boolean; out: string } {
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8' })
  return { ok: r.status === 0, out: r.stdout.trim() }
}

function alive(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/** The pid of a live gate run in the checkout holding `dir`, else null. */
export function liveGatePid(dir: string): number | null {
  const gitDir = git(dir, ['rev-parse', '--absolute-git-dir'])
  if (!gitDir.ok) return null
  try {
    const pid = Number.parseInt(readFileSync(join(gitDir.out, 'terrarium-gate.pid'), 'utf8'), 10)
    return Number.isInteger(pid) && alive(pid) ? pid : null
  } catch {
    return null
  }
}

/** The deny reason when `tool` would change the tree of a checkout mid-gate. */
export function checkGateEdit(tool: string, input: unknown, cwd: string): string | null {
  let dir = cwd
  let path: string | null = null
  if (tool === 'Edit' || tool === 'Write' || tool === 'NotebookEdit') {
    const p = prop(input, 'file_path') ?? prop(input, 'notebook_path')
    if (typeof p !== 'string') return null
    path = resolve(cwd, p)
    dir = dirname(path)
    while (!existsSync(dir) && dir !== dirname(dir)) dir = dirname(dir)
  } else if (tool === 'Bash') {
    const m = COMMIT.exec(String(prop(input, 'command') ?? ''))
    if (!m) return null
    if (m[1]) dir = resolve(cwd, m[1])
  } else return null

  const pid = liveGatePid(dir)
  if (pid === null) return null
  if (path && git(dir, ['check-ignore', '-q', '--', path]).ok) return null
  return (
    `Blocked by the ${LABEL} (${REF}): \`pnpm gate:scoped\` is running here (pid ${pid}) and aborts on any ` +
    `edit or commit to the tree. Wait for it to finish (it removes its lock), then retry; edit files outside ` +
    `the checkout or git-ignored files meanwhile.`
  )
}

export function main(): void {
  const read = readHookJson()
  if (read.kind === 'none') return
  if (read.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  const tool = prop(read.json, 'tool_name')
  if (typeof tool !== 'string') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')
  const cwd = prop(read.json, 'cwd')
  const reason = checkGateEdit(tool, prop(read.json, 'tool_input'), typeof cwd === 'string' ? cwd : process.cwd())
  if (reason) process.stdout.write(JSON.stringify(buildDenyOutput(reason)))
}

function dryRun(argv: string[]): void {
  const tool = requireToolFlag(argv, 'usage: --dry-run --tool <name> [--input <json> | --input-file <path>]')
  const reason = checkGateEdit(tool, resolveDryRunInput(argv), process.cwd())
  printDryRunResult({ tool, decision: reason ? 'deny' : 'allow', reason: reason ?? undefined })
}

runGuard(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
