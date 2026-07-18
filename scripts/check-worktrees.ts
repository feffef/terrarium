// The worktree sweep (issue #427): a mechanical replacement for CLAUDE.md's
// doc-only "orchestrator must check each returned worktree for uncommitted
// work" guard (#317). That guard only ever caught a stop-with-uncommitted-work
// three times as an after-the-fact safety net (#427) — and being keyed on the
// orchestrator remembering to inspect a *returned* worktree, it can't catch one
// left behind by a subagent that never returned at all (a silent platform
// "session limit" abort). This script enumerates worktrees from git state
// itself, so an orphaned worktree is caught the same way a returned one is.
//
// Usage:  tsx scripts/check-worktrees.ts
//   Exits non-zero iff any LINKED (non-primary) worktree has uncommitted
//   changes (staged, unstaged, or untracked — any `git status --porcelain`
//   output) or unpushed commits (commits on its HEAD absent from its upstream;
//   for a branch with no upstream, every commit beyond its merge-base with
//   `origin/main`). The primary worktree's own in-progress edits are reported
//   for visibility but never fail the sweep — the orchestrator manages its own
//   tree directly.
import { execFileSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── Types ───────────────────────────────────────────────────────────────────

/** One worktree block as read off `git worktree list --porcelain`, parsed but
 *  not yet joined with any per-worktree git status. */
export interface RawWorktree {
  path: string
  head: string
  /** Branch shorthand (e.g. `main`), or `null` when detached. */
  branch: string | null
  bare: boolean
  detached: boolean
  locked: boolean
  prunable: boolean
}

/** A `RawWorktree` joined with its working-tree/push state — the input the
 *  pure `sweep()` decision is made from. */
export interface WorktreeState {
  path: string
  branch: string | null
  isPrimary: boolean
  /** Any `git status --porcelain` output for this worktree (staged, unstaged,
   *  or untracked files all count — a bare worktree has no working tree to be
   *  dirty, so this is always `false` for one). */
  dirty: boolean
  /** Commits reachable from this worktree's HEAD absent from its remote — via
   *  its upstream when one is configured, else via its merge-base with
   *  `origin/main` (never-pushed branch). `null` when undeterminable (e.g. no
   *  `origin/main` to compare against) — treated as "can't say," not a pass. */
  unpushedCount: number | null
}

/** The sweep's verdict for one worktree. */
export interface Finding {
  path: string
  branch: string | null
  isPrimary: boolean
  uncommitted: boolean
  unpushed: boolean
}

export interface SweepResult {
  /** Every worktree, primary included — for the visibility report. */
  findings: Finding[]
  /** The subset that fails the sweep: linked (non-primary) AND (uncommitted
   *  OR unpushed). Drives the exit code. */
  failures: Finding[]
}

// ── Pure core (unit-tested against fixture strings) ─────────────────────────

/** Parse `git worktree list --porcelain`'s block format: one blank-line
 *  separated block per worktree, each block a run of `<key> [value]` lines
 *  (`worktree`, `HEAD`, `branch`, and the bare `bare`/`detached`/`locked`/
 *  `prunable` flag lines that carry no value or a trailing reason). */
export function parseWorktreeList(porcelain: string): RawWorktree[] {
  const blocks = porcelain
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0)
  return blocks.map((block) => {
    const lines = block.split('\n')
    let path = ''
    let head = ''
    let branch: string | null = null
    let bare = false
    let detached = false
    let locked = false
    let prunable = false
    for (const line of lines) {
      if (line.startsWith('worktree ')) path = line.slice('worktree '.length).trim()
      else if (line.startsWith('HEAD ')) head = line.slice('HEAD '.length).trim()
      else if (line.startsWith('branch ')) branch = line.slice('branch '.length).trim().replace(/^refs\/heads\//, '')
      else if (line === 'bare' || line.startsWith('bare ')) bare = true
      else if (line === 'detached' || line.startsWith('detached ')) detached = true
      else if (line === 'locked' || line.startsWith('locked ')) locked = true
      else if (line === 'prunable' || line.startsWith('prunable ')) prunable = true
    }
    return { path, head, branch, bare, detached, locked, prunable }
  })
}

/** The primary worktree's path always sits one directory above the shared
 *  `.git` common dir (a linked worktree's `.git` is a file pointing *into*
 *  that common dir; the primary's `.git` *is* it) — so this needs no
 *  filesystem stat, just the already-known common-dir path. */
export function primaryWorktreePath(gitCommonDir: string): string {
  return dirname(gitCommonDir)
}

/** Decide pass/fail per worktree. A worktree fails the sweep only when it is
 *  linked (not primary) AND either dirty or carrying unpushed commits — the
 *  primary's own in-progress edits are reported but never fail it (the
 *  orchestrator manages its own tree directly), and an undeterminable
 *  unpushed count (`null`) is treated as "not proven unpushed," not a pass. */
export function sweep(states: WorktreeState[]): SweepResult {
  const findings: Finding[] = states.map((s) => ({
    path: s.path,
    branch: s.branch,
    isPrimary: s.isPrimary,
    uncommitted: s.dirty,
    unpushed: (s.unpushedCount ?? 0) > 0,
  }))
  const failures = findings.filter((f) => !f.isPrimary && (f.uncommitted || f.unpushed))
  return { findings, failures }
}

// ── Git shell (thin) ─────────────────────────────────────────────────────────

function git(args: string[], cwd: string): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

/** Like `git()`, but for a probe that's *expected* to fail some of the time
 *  (e.g. no upstream configured) — `null` on failure instead of throwing, and
 *  stderr suppressed so an expected failure doesn't read as a live error. */
function tryGit(args: string[], cwd: string): string | null {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return null
  }
}

function isDirty(path: string): boolean {
  return git(['status', '--porcelain'], path).length > 0
}

/** Commits on this worktree's HEAD not yet on its remote. Prefers the
 *  branch's configured upstream (`@{upstream}`); falls back to the merge-base
 *  with `origin/main` when there is none (a never-pushed branch) — every
 *  commit beyond that merge-base counts as unpushed, per the issue #427
 *  brief. `null` only when neither comparison is possible (e.g. no
 *  `origin/main` ref at all in this worktree, which shares refs with every
 *  other worktree via the common dir, so this is expected to be rare). */
function unpushedCount(path: string): number | null {
  const upstream = tryGit(['rev-parse', '--abbrev-ref', '@{upstream}'], path)
  if (upstream !== null) {
    const count = tryGit(['rev-list', '--count', `${upstream}..HEAD`], path)
    return count === null ? null : Number.parseInt(count, 10)
  }
  const mergeBase = tryGit(['merge-base', 'origin/main', 'HEAD'], path)
  if (mergeBase === null) return null
  const count = tryGit(['rev-list', '--count', `${mergeBase}..HEAD`], path)
  return count === null ? null : Number.parseInt(count, 10)
}

function readWorktreeStates(cwd = root): WorktreeState[] {
  const porcelain = git(['worktree', 'list', '--porcelain'], cwd)
  const raw = parseWorktreeList(porcelain)
  const commonDir = resolve(cwd, git(['rev-parse', '--git-common-dir'], cwd))
  const primaryPath = primaryWorktreePath(commonDir)
  return raw.map((wt) => ({
    path: wt.path,
    branch: wt.branch,
    isPrimary: wt.path === primaryPath,
    // A bare worktree has no working tree to be dirty or ahead — report it
    // inert rather than shelling out to commands that don't apply to it.
    dirty: wt.bare ? false : isDirty(wt.path),
    unpushedCount: wt.bare ? 0 : unpushedCount(wt.path),
  }))
}

export function runSweep(cwd = root): SweepResult {
  return sweep(readWorktreeStates(cwd))
}

// ── CLI ───────────────────────────────────────────────────────────────────────

function describe(f: Finding): string {
  const reasons: string[] = []
  if (f.uncommitted) reasons.push('uncommitted changes')
  if (f.unpushed) reasons.push('unpushed commits')
  const branch = f.branch ?? '(detached)'
  return `  ${f.path} [${branch}] — ${reasons.join(' and ')}`
}

function main(): void {
  const { findings, failures } = runSweep()
  const primary = findings.find((f) => f.isPrimary)
  if (primary) {
    const state = primary.uncommitted || primary.unpushed
      ? `has ${[primary.uncommitted && 'uncommitted changes', primary.unpushed && 'unpushed commits'].filter(Boolean).join(' and ')} (not a failure — it's the orchestrator's own tree)`
      : 'clean and pushed'
    console.log(`check-worktrees: primary ${primary.path} [${primary.branch ?? '(detached)'}] — ${state}`)
  }
  if (failures.length === 0) {
    console.log(`check-worktrees: PASS — ${findings.length - (primary ? 1 : 0)} linked worktree(s) clean and pushed`)
    return
  }
  console.error(`\ncheck-worktrees: FAIL — ${failures.length} linked worktree(s) have unrescued work (issue #427):\n`)
  for (const f of failures) console.error(describe(f))
  console.error('\nCommit + push (or otherwise rescue) each before treating its subagent as done.\n')
  process.exit(1)
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
