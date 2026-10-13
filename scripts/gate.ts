// `pnpm gate:scoped` — additive, change-scoped wrapper around `pnpm gate` (#350).
// Skips the heavy layers when the whole changeset is inert, else runs the full
// gate. Design, safety argument, and the inert-set proof: issue #350. A
// changeset of inert paths and Skill files skips only build and e2e (#1603).
//   pnpm gate:scoped [--dry]
//   pnpm exec tsx scripts/gate.ts --decide --base <ref> [--head <ref>]
//     — decision only, for CI to guard its own heavy steps on (#445; the CI
//       half now lives in .github/actions/gate/action.yml — ADR-0026)
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, linkSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { root } from '../shared/expand.ts'
import { fetchOriginMain, isShallowRepository, unshallow } from './git-helpers.ts'

export const FLOOR = ['verify:skills-lock', 'verify:mermaid', 'lint', 'typecheck', 'validate:content'] as const
export const HEAVY = ['test', 'build', 'test:e2e'] as const

// A `.md` under `layers/` is rendered content; `verify:skills-lock` (in FLOOR)
// still covers `.agents/skills/**/SKILL.md`. Rationale: #350.
// `.claude/skills/` is the symlink mirror of `.agents/skills/` (ADR-0005) and is
// read by no HEAVY step — `test`/`test:e2e` collect only the spec globs owned by
// `vitest.config.ts`, and `build` never reads `.claude/`. Rationale: #544.
export function isInert(path: string): boolean {
  return (path.endsWith('.md') && !path.startsWith('layers/')) || path.startsWith('.claude/skills/')
}

// Why build + e2e may skip these: ADR-0004's 2026-10-12 amendment. A workflow
// script belongs to its Skill: ADR-0005's 2026-10-13 amendment.
export function isSkillFile(path: string): boolean {
  return path.startsWith('.agents/skills/') || path.startsWith('.claude/workflows/')
}

export const BUILT = ['build', 'test:e2e'] as const

export interface Scope {
  skipHeavy: boolean
  /** Skip `BUILT` only; implied by `skipHeavy`. */
  skipBuild: boolean
  reason: string
}

// `null` (undeterminable base) is kept distinct from `[]` (nothing changed); both
// run the full gate, so the skip path is only ever reached on a proven inert set.
export function decideScope(changed: string[] | null): Scope {
  const full = (reason: string): Scope => ({ skipHeavy: false, skipBuild: false, reason })
  if (changed === null) return full('could not determine changed files (no usable diff base) — running full gate')
  if (changed.length === 0) return full('no changes vs the diff base — running full gate')
  const firstNonInert = changed.find((p) => !isInert(p))
  if (firstNonInert === undefined) {
    return { skipHeavy: true, skipBuild: true, reason: `every changed path is inert (${changed.length} file(s)) — skipping ${HEAVY.join(', ')}` }
  }
  const firstOther = changed.find((p) => !isInert(p) && !isSkillFile(p))
  if (firstOther === undefined) {
    return { skipHeavy: false, skipBuild: true, reason: `every changed path is inert or a Skill file (${firstNonInert}) — skipping ${BUILT.join(', ')}` }
  }
  return full(`changed set includes non-inert path (${firstOther}) — running full gate`)
}

export function planSteps(scope: Scope): string[] {
  if (scope.skipHeavy) return [...FLOOR]
  const skipped: readonly string[] = scope.skipBuild ? BUILT : []
  return [...FLOOR, ...HEAVY].filter((s) => !skipped.includes(s))
}

function git(args: string[], cwd: string = root): string {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
}

function lines(out: string): string[] {
  return out.split('\n').map((l) => l.trim()).filter(Boolean)
}

// Untracked files are unioned in because a plain `git diff` omits them. Any
// uncertainty returns `null` → full gate.
//
// Why a shallow clone is *repaired* here but *refused* by the CI sibling below —
// the asymmetry is deliberate: CI owns its checkout declaratively
// (`fetch-depth: 0`) and keeps refusal as the backstop for that line being
// dropped, whereas a session's clone simply starts shallow with no equivalent
// knob, so refusing would degrade `gate:scoped` to a full `pnpm gate` for the
// doc-only edits it exists to make fast. Repair is affordable because it is
// one-shot, and `--unshallow` is itself a fetch, so #246's freshen-before-read
// contract still holds on that branch. Why classifying off a shallow clone is
// unsafe at all: docs/agents/git-conventions.md, and #849.
// `quiet` suppresses the underlying fetch's own progress/branch-listing
// output (git-helpers.ts's `unshallow`/`fetchOriginMain`) — `--dry` passes
// this so its decision isn't buried under it (#930).
export function changedPaths(cwd: string = root, quiet = false): string[] | null {
  try {
    if (isShallowRepository(cwd)) {
      console.log('gate:scoped: clone is shallow — fetching full history (one-time) so the diff base is trustworthy')
      try {
        unshallow(cwd, undefined, quiet)
      } catch {
        return null // fail closed: an untrustworthy base can under-report (#849)
      }
      // A fetch can exit 0 and still leave the clone shallow (limited refspec,
      // partial fetch), so success is re-checked rather than assumed.
      if (isShallowRepository(cwd)) return null
    } else {
      try {
        fetchOriginMain(cwd, undefined, undefined, quiet)
      } catch {
        // best-effort: a stale origin/main still yields a usable merge-base
        // (including on timeout — a `--dry` run must never hang, #451)
      }
    }
    let base: string
    try {
      base = git(['merge-base', 'origin/main', 'HEAD'], cwd)
    } catch {
      return null
    }
    if (!base) return null
    const committed = lines(git(['diff', '--name-only', '--no-renames', `${base}..HEAD`], cwd))
    const tracked = lines(git(['diff', '--name-only', '--no-renames', 'HEAD'], cwd))
    const untracked = lines(git(['ls-files', '--others', '--exclude-standard'], cwd))
    return [...new Set([...committed, ...tracked, ...untracked])]
  } catch {
    return null
  }
}

// ── CI decision mode (#445) ─────────────────────────────────────────────────
// CI asks this script for the decision instead of re-expressing `isInert` in
// YAML, where the two classifications would drift apart unnoticed (#350). The
// base ref is the caller's to supply — a PR's base is whatever it targets, and
// CI has it from the event payload — so this never consults `origin/main`.
export function changedPathsBetween(baseRef: string, headRef = 'HEAD'): string[] | null {
  if (!baseRef || !headRef) return null
  try {
    // Refuses where `changedPaths` above repairs — see its comment for why the
    // two differ. On actions/checkout's default depth this costs a full gate
    // only if `fetch-depth: 0` is ever dropped, which is the intended backstop.
    if (isShallowRepository(root)) return null
    const base = git(['merge-base', baseRef, headRef])
    if (!base) return null
    return lines(git(['diff', '--name-only', '--no-renames', `${base}..${headRef}`]))
  } catch {
    return null
  }
}

// Heredoc form, not `key=value`: a reason string is prose, and the bare form
// silently truncates at the first newline one ever grows.
export function githubOutputBlock(scope: Scope): string {
  return `skip_heavy=${scope.skipHeavy}\nskip_build=${scope.skipBuild}\nreason<<GATE_SCOPE_EOF\n${scope.reason}\nGATE_SCOPE_EOF\n`
}

// ── Stale-deps preflight (#445) ─────────────────────────────────────────────
// An edit to `package.json`/`pnpm-lock.yaml` without a follow-up `pnpm install`
// makes `typecheck`/`build` fail on missing or mismatched packages — a failure
// that reads exactly like a real break. `node_modules/.pnpm` (pnpm's virtual
// store) is what `pnpm install` last touched, so its mtime is the freshness
// marker to compare the two source files against.
export function isStale(pkgMtimeMs: number, lockMtimeMs: number, pnpmDirMtimeMs: number | null): boolean {
  if (pnpmDirMtimeMs === null) return true
  return pkgMtimeMs > pnpmDirMtimeMs || lockMtimeMs > pnpmDirMtimeMs
}

function mtimeMs(path: string): number | null {
  try {
    return statSync(path).mtimeMs
  } catch {
    return null
  }
}

// Runs at most once, before any gate step (see `main`) — never re-checked
// mid-run, so a step's own writes under `node_modules` can't retrigger it.
export function ensureFreshDeps(projectRoot = root): void {
  const pkgMtime = mtimeMs(join(projectRoot, 'package.json'))
  const lockMtime = mtimeMs(join(projectRoot, 'pnpm-lock.yaml'))
  if (pkgMtime === null || lockMtime === null) return // nothing to compare against — leave it to the steps themselves
  const pnpmDirMtime = mtimeMs(join(projectRoot, 'node_modules/.pnpm'))
  if (!isStale(pkgMtime, lockMtime, pnpmDirMtime)) return
  console.log('gate:scoped: deps look stale (package.json/pnpm-lock.yaml newer than node_modules/.pnpm) — running pnpm install')
  const r = spawnSync('pnpm', ['install'], { cwd: projectRoot, stdio: 'inherit' })
  if (r.error) {
    console.error(`gate:scoped: failed to launch \`pnpm install\`: ${r.error.message}`)
    process.exit(1)
  }
  if (typeof r.status === 'number' && r.status !== 0) process.exit(r.status)
}

// ── Heavy slots (#1800) ─────────────────────────────────────────────────────
// More than this many concurrent Heavy tiers in one container make `test:e2e`
// die of memory (exit 137). The slot dir is under the OS temp dir, not `root`,
// because each worktree has its own root but all share the container's memory.
export const HEAVY_SLOTS = 2
const SLOT_DIR = join(tmpdir(), 'terrarium-gate-heavy-slots')

function isAlive(pid: number): boolean {
  // NaN is a slot file that isn't a PID; kill(0|-1, 0) would probe a whole process group.
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

function readHolder(path: string): number | null {
  try {
    return Number.parseInt(readFileSync(path, 'utf8'), 10)
  } catch {
    return null
  }
}

function tryTake(path: string, stale: boolean): boolean {
  // Two waiters reclaiming the same stale slot can at worst both run: a third
  // concurrent Heavy tier, i.e. the behaviour before #1800.
  if (stale) rmSync(path, { force: true })
  // Link a finished file into place so a reader never sees an empty slot file.
  const tmp = `${path}.${process.pid}`
  writeFileSync(tmp, String(process.pid))
  try {
    linkSync(tmp, path)
    return true
  } catch {
    return false
  } finally {
    rmSync(tmp, { force: true })
  }
}

export function acquireHeavySlot(dir = SLOT_DIR, slots = HEAVY_SLOTS, pollMs = 2000): void {
  mkdirSync(dir, { recursive: true })
  const paths = Array.from({ length: slots }, (_, i) => join(dir, `slot-${i}`))
  const sleeper = new Int32Array(new SharedArrayBuffer(4))
  let announced = false
  for (;;) {
    const holders = paths.map(readHolder)
    // A dead holder (OOM-killed, SIGKILLed) never released, so its slot counts as free.
    const i = holders.findIndex((pid) => pid === null || !isAlive(pid))
    if (i !== -1 && tryTake(paths[i]!, holders[i] !== null)) {
      process.on('exit', () => {
        if (readHolder(paths[i]!) === process.pid) rmSync(paths[i]!, { force: true })
      })
      return
    }
    if (i === -1 && !announced) {
      console.log(`gate:scoped: waiting for a Heavy slot (${slots} max per container), held by PIDs ${holders.join(', ')}`)
      announced = true
    }
    Atomics.wait(sleeper, 0, 0, pollMs)
  }
}

// ── CLI ───────────────────────────────────────────────────────────────────────

const RESET_HINT_STEPS = ['typecheck', 'build']

function run(step: string): void {
  const r = spawnSync('pnpm', [step], { cwd: root, stdio: 'inherit' })
  if (r.error) {
    console.error(`gate:scoped: failed to launch \`pnpm ${step}\`: ${r.error.message}`)
    process.exit(1)
  }
  if (typeof r.status === 'number' && r.status !== 0) {
    if (RESET_HINT_STEPS.includes(step)) {
      console.error(`
If this looks like a stale-sandbox/type-generation issue (not a real code error), try:
  rm -rf node_modules .nuxt && pnpm install --frozen-lockfile
See docs/agents/environment-caveats.md for details.`)
    }
    process.exit(r.status)
  }
}

function flagValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name)
  return i === -1 ? undefined : args[i + 1]
}

function decide(args: string[]): void {
  const scope = decideScope(changedPathsBetween(flagValue(args, '--base') ?? '', flagValue(args, '--head')))
  console.log(`gate:scoped: ${scope.reason}`)
  console.log(`gate:scoped: caller should run ${planSteps(scope).join(' → ')}`)
  const out = process.env.GITHUB_OUTPUT
  if (out) appendFileSync(out, githubOutputBlock(scope))
}

function main(): void {
  const args = process.argv.slice(2)
  if (args.includes('--decide')) return decide(args)
  const dry = args.includes('--dry')
  if (!dry) ensureFreshDeps()
  const scope = decideScope(changedPaths(root, dry))
  const steps = planSteps(scope)
  console.log(`gate:scoped: ${scope.reason}`)
  console.log(`gate:scoped: ${dry ? 'would run' : 'running'} ${steps.join(' → ')}`)
  if (dry) return
  for (const step of steps) {
    // planSteps puts HEAVY at the end. A Skill-only plan (#1603) runs `test`
    // without BUILT and takes no slot: #1800 traced the OOM to `test:e2e`. The
    // slot is freed on exit.
    if (step === HEAVY[0] && steps.includes(BUILT[0])) acquireHeavySlot()
    run(step)
  }
  console.log('gate:scoped: ✓ all planned steps passed')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
