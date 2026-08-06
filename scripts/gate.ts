// `pnpm gate:scoped` — additive, change-scoped wrapper around `pnpm gate` (#350).
// Skips the heavy layers when the whole changeset is inert, else runs the full
// gate. Design, safety argument, and the inert-set proof: issue #350.
//   pnpm gate:scoped [--dry]
//   pnpm exec tsx scripts/gate.ts --decide --base <ref> [--head <ref>]
//     — decision only, for CI to guard its own heavy steps on (#445; the CI
//       half now lives in .github/actions/gate/action.yml — ADR-0026)
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, statSync } from 'node:fs'
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

export interface Scope {
  skipHeavy: boolean
  reason: string
}

// `null` (undeterminable base) is kept distinct from `[]` (nothing changed); both
// run the full gate, so the skip path is only ever reached on a proven inert set.
export function decideScope(changed: string[] | null): Scope {
  if (changed === null) {
    return { skipHeavy: false, reason: 'could not determine changed files (no usable diff base) — running full gate' }
  }
  if (changed.length === 0) {
    return { skipHeavy: false, reason: 'no changes vs the diff base — running full gate' }
  }
  const firstNonInert = changed.find((p) => !isInert(p))
  if (firstNonInert === undefined) {
    return { skipHeavy: true, reason: `every changed path is inert (${changed.length} file(s)) — skipping ${HEAVY.join(', ')}` }
  }
  return { skipHeavy: false, reason: `changed set includes non-inert path (${firstNonInert}) — running full gate` }
}

export function planSteps(scope: Scope): string[] {
  return scope.skipHeavy ? [...FLOOR] : [...FLOOR, ...HEAVY]
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
export function changedPaths(cwd: string = root): string[] | null {
  try {
    if (isShallowRepository(cwd)) {
      console.log('gate:scoped: clone is shallow — fetching full history (one-time) so the diff base is trustworthy')
      try {
        unshallow(cwd)
      } catch {
        return null // fail closed: an untrustworthy base can under-report (#849)
      }
      // A fetch can exit 0 and still leave the clone shallow (limited refspec,
      // partial fetch), so success is re-checked rather than assumed.
      if (isShallowRepository(cwd)) return null
    } else {
      try {
        fetchOriginMain(cwd)
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
    const committed = lines(git(['diff', '--name-only', `${base}..HEAD`], cwd))
    const tracked = lines(git(['diff', '--name-only', 'HEAD'], cwd))
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
    return lines(git(['diff', '--name-only', `${base}..${headRef}`]))
  } catch {
    return null
  }
}

// Heredoc form, not `key=value`: a reason string is prose, and the bare form
// silently truncates at the first newline one ever grows.
export function githubOutputBlock(scope: Scope): string {
  return `skip_heavy=${scope.skipHeavy}\nreason<<GATE_SCOPE_EOF\n${scope.reason}\nGATE_SCOPE_EOF\n`
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
