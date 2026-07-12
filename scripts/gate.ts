// `pnpm gate:scoped` — a change-scoped, fast-feedback wrapper around the gate
// (issue #350). It is ADDITIVE and does not replace anything: `pnpm gate` and
// CI (`.github/workflows/gate.yml`) are untouched and remain the mandatory merge
// gate (ADR-0004). This script only ever runs the *same or a safe subset* of the
// gate locally — never less than what a change needs.
//
// The optimisation: a cheap "floor" (verify:skills-lock, lint, typecheck,
// validate:content) always runs; the expensive layers (test = unit/L3, build,
// test:e2e = L2) are SKIPPED only when the whole changeset is provably inert —
// i.e. every changed path is a `.md` file OUTSIDE `layers/` (ADRs, docs/,
// README, CLAUDE.md, CONTEXT*.md, skill docs). Nothing under `build`, the unit
// suite, or e2e consumes such a file (verified in issue #350), so skipping them
// changes no signal for those changes. The `.agents/skills/**/SKILL.md` case is
// covered because verify:skills-lock is in the always-on floor.
//
// Fail-safe by construction: this is an ALLOWLIST, and any uncertainty — a
// non-`.md` path, anything under `layers/`, an empty changeset, or an
// undeterminable diff base — falls back to the FULL gate. It never skips on doubt.
//
// Usage:
//   pnpm gate:scoped          run the scoped gate
//   pnpm gate:scoped --dry     print the decision + planned steps, run nothing
import { execFileSync, spawnSync } from 'node:child_process'
import { pathToFileURL } from 'node:url'
import { root } from '../shared/expand.ts'

/** The cheap checks that always run — individually fast, and collectively they
 *  cover every doc-adjacent failure mode (a pack SKILL.md edit, a broken content
 *  schema). Names are `package.json` script keys, run as `pnpm <name>`. */
export const FLOOR = ['verify:skills-lock', 'lint', 'typecheck', 'validate:content'] as const

/** The expensive layers, skipped only for a provably-inert changeset. */
export const HEAVY = ['test', 'build', 'test:e2e'] as const

/** A path is inert to build/unit/e2e iff it is a Markdown file outside every
 *  Tenant layer. Git emits repo-relative, forward-slash paths, so this is a
 *  plain prefix/suffix test. */
export function isInert(path: string): boolean {
  return path.endsWith('.md') && !path.startsWith('layers/')
}

export interface Scope {
  /** Skip the HEAVY layers? Only true when every changed path is inert. */
  skipHeavy: boolean
  /** Human-readable justification, printed before anything runs. */
  reason: string
}

/** Decide the scope from a changed-file list. `null` means "could not be
 *  determined" — a distinct, always-full-gate case (never conflated with
 *  "nothing changed"). Pure and side-effect free, so it is unit-tested directly. */
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

/** The ordered list of `pnpm` scripts a scope implies. */
export function planSteps(scope: Scope): string[] {
  return scope.skipHeavy ? [...FLOOR] : [...FLOOR, ...HEAVY]
}

/** stdout of a git command, trimmed; `''` on any failure (caller decides). */
function git(args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
}

/** Non-empty, de-duplicated lines. */
function lines(out: string): string[] {
  return out.split('\n').map((l) => l.trim()).filter(Boolean)
}

/** Every path changed vs `origin/main`: committed since the merge-base, plus the
 *  live working tree (tracked modifications AND untracked new files — a plain
 *  `git diff` would miss the latter). Returns `null` — forcing the full gate —
 *  on any uncertainty (fetch is best-effort; an unresolvable merge-base, e.g. a
 *  fully unrelated pre-clone, is fatal to a scope decision). */
export function changedPaths(): string[] | null {
  try {
    // Best-effort refresh — the pre-cloned origin/main is routinely stale
    // (CLAUDE.md). A failed fetch is tolerated; a missing base is not.
    try {
      execFileSync('git', ['fetch', 'origin', 'main'], { cwd: root, stdio: 'ignore' })
    } catch {
      // offline / no remote — fall through and use whatever origin/main we have
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
  const scope = decideScope(changedPaths())
  const steps = planSteps(scope)
  console.log(`gate:scoped: ${scope.reason}`)
  console.log(`gate:scoped: ${dry ? 'would run' : 'running'} ${steps.join(' → ')}`)
  if (dry) return
  for (const step of steps) run(step)
  console.log('gate:scoped: ✓ all planned steps passed')
}

// Only run when executed directly (not when imported by the unit test).
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main()
}
