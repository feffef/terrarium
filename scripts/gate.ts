// `pnpm gate:scoped` — additive, change-scoped wrapper around `pnpm gate` (#350).
// Skips the heavy layers when the whole changeset is inert, else runs the full
// gate. Design, safety argument, and the inert-set proof: issue #350.
//   pnpm gate:scoped [--dry]
import { execFileSync, spawnSync } from 'node:child_process'
import { statSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { root } from '../shared/expand.ts'
import { fetchOriginMain } from './git-helpers.ts'

export const FLOOR = ['verify:skills-lock', 'lint', 'typecheck', 'validate:content'] as const
export const HEAVY = ['test', 'build', 'test:e2e'] as const

// A `.md` under `layers/` is rendered content; `verify:skills-lock` (in FLOOR)
// still covers `.agents/skills/**/SKILL.md`. Rationale: #350.
export function isInert(path: string): boolean {
  return path.endsWith('.md') && !path.startsWith('layers/')
}

export interface Scope {
  skipHeavy: boolean
  reason: string
}

// `null` (undeterminable base) is kept distinct from `[]` (nothing changed); both
// run the full gate, so the skip path is only ever reached on a proven inert set.
export function decideScope(changed: string[] | null): Scope {
  if (changed === null) {
    return { skipHeavy: false, reason: 'could not determine changed files (no merge-base with origin/main) — running full gate' }
  }
  if (changed.length === 0) {
    return { skipHeavy: false, reason: 'no changes vs origin/main — running full gate' }
  }
  const firstNonInert = changed.find((p) => !isInert(p))
  if (firstNonInert === undefined) {
    return { skipHeavy: true, reason: `change is docs-only outside layers/ (${changed.length} file(s)) — skipping ${HEAVY.join(', ')}` }
  }
  return { skipHeavy: false, reason: `changed set includes non-inert path (${firstNonInert}) — running full gate` }
}

export function planSteps(scope: Scope): string[] {
  return scope.skipHeavy ? [...FLOOR] : [...FLOOR, ...HEAVY]
}

function git(args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
}

function lines(out: string): string[] {
  return out.split('\n').map((l) => l.trim()).filter(Boolean)
}

// Untracked files are unioned in because a plain `git diff` omits them. Any
// uncertainty returns `null` → full gate.
export function changedPaths(): string[] | null {
  try {
    try {
      fetchOriginMain(root)
    } catch {
      // best-effort: a stale origin/main still yields a usable merge-base
      // (including on timeout — a `--dry` run must never hang, #451)
    }
    let base: string
    try {
      base = git(['merge-base', 'origin/main', 'HEAD'])
    } catch {
      return null
    }
    if (!base) return null
    const committed = lines(git(['diff', '--name-only', `${base}..HEAD`]))
    const tracked = lines(git(['diff', '--name-only', 'HEAD']))
    const untracked = lines(git(['ls-files', '--others', '--exclude-standard']))
    return [...new Set([...committed, ...tracked, ...untracked])]
  } catch {
    return null
  }
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

// ── CLI ───────────────────────────────────────────────────────────────────────

function run(step: string): void {
  const r = spawnSync('pnpm', [step], { cwd: root, stdio: 'inherit' })
  if (r.error) {
    console.error(`gate:scoped: failed to launch \`pnpm ${step}\`: ${r.error.message}`)
    process.exit(1)
  }
  if (typeof r.status === 'number' && r.status !== 0) process.exit(r.status)
}

function main(): void {
  const dry = process.argv.slice(2).includes('--dry')
  if (!dry) ensureFreshDeps()
  const scope = decideScope(changedPaths())
  const steps = planSteps(scope)
  console.log(`gate:scoped: ${scope.reason}`)
  console.log(`gate:scoped: ${dry ? 'would run' : 'running'} ${steps.join(' → ')}`)
  if (dry) return
  for (const step of steps) run(step)
  console.log('gate:scoped: ✓ all planned steps passed')
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
