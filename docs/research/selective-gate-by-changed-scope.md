# Selective safety gate: skipping heavy steps for inert doc-only changes

An investigation into a "gate script that first checks what content has actually
been changed" — so a changeset that touches **only `.md` files outside
`layers/`** (ADRs, `docs/`, `README.md`, `CLAUDE.md`, `CONTEXT*.md`, `SECURITY.md`,
skill docs) can skip the expensive gate layers (build, unit/L3, e2e/L2) that
those files provably don't affect.

This is a **design note, not an implemented change.** The actual safety gate is
unchanged. Implementing any of this modifies gate behaviour, which is human-only
to merge and needs an owner green-light (see [Governance](#governance) below).

**Grounded against** the working tree at the time of writing — every "reads / does
not read" claim below is a verified grep/Read of the named file, not an
assumption. Re-verify if these files move: the gate is single-homed in
`package.json`'s `gate` script (`verify:skills-lock → lint → typecheck →
validate:content → test → build → test:e2e`) and mirrored by
`.github/workflows/gate.yml`.

## The premise, verified

Nothing in the build, the unit suite, or the e2e suite consumes a `.md` file that
lives outside `layers/`. Each gate step, and what it actually depends on:

| Step | Cost | Consumes `.md` outside `layers/`? | Evidence |
|---|---|---|---|
| `verify:skills-lock` | cheap | **Yes** — `.agents/skills/**/SKILL.md` | `scripts/verify-skills-lock.ts` (`join(cwd, SKILLS_DIR, name, 'SKILL.md')`) |
| `lint` | cheap | No — `withNuxt()`, no markdown plugin | `eslint.config.mjs` |
| `typecheck` | moderate | No — TypeScript only | `package.json` |
| `validate:content` | ~1–2s | No — globs only each Collection's `include` under `layers/…/content` | `scripts/validate-content.ts` (`globSync(col.include, …)`), `content.config.ts` |
| `test` (unit + **L3 isolation**) | moderate | **No** — the only two unit tests that touch the real tree read `nuxt.config.ts` / `tsconfig.node.json` / session YAML, never docs | `tests/unit/typecheck-coverage.spec.ts`, `tests/unit/session-end.spec.ts` |
| `build` (`nuxt build`) | **expensive** | No — no collection or app import reaches outside `layers/` (grep of `app/`, `shared/`, `modules/`, `content.config.ts` for `.md` refs is empty) | `content.config.ts`, `nuxt.config.ts` |
| `test:e2e` (**L2 smoke**) | **most expensive** — runs a *second* full `nuxt build` in `setup()` | No — renders tenant routes only | `tests/e2e/smoke.spec.ts`, ADR-0004 (2026-07-07 amendment) |

So for a changeset that is entirely `.md`-outside-`layers`, the three heavy steps
(`test`, `build`, `test:e2e`) are genuine no-ops.

### The one gotcha the naive rule misses

`.agents/skills/**/*.md` are `.md`-outside-`layers`, but they **are** read by
`verify:skills-lock` — the pack-drift check whose whole reason for existing is the
"gate that broke its own gate" episode (a session editing a pack-owned `SKILL.md`;
see the blog post of that name and ADR-0015). The resolution is clean and is the
core of the design below: **`verify:skills-lock` is in the always-on floor**, so a
skills-doc edit is still caught, and skipping the *heavy* layers for it is safe.

## Design: an always-on floor + skippable heavy layers

Split the gate in two rather than making the whole thing conditional:

- **Always run (cheap floor):** `verify:skills-lock`, `lint`, `typecheck`,
  `validate:content`. Individually cheap; collectively they cover every
  doc-adjacent failure mode (a pack `SKILL.md` edit, a malformed content schema).
- **Skip iff the whole changeset is inert:** `test`, `build`, `test:e2e` — the
  three expensive steps. (Note this is **build + unit + e2e**, one step more than
  "unit or e2e" in the original ask: `build` is provably inert for these changes
  too, and it is the second-biggest cost, so the same predicate should cover it.)

### Classifier — a fail-safe allowlist, not a denylist

```
inert(p)  := p.endsWith(".md")  &&  !p.startsWith("layers/")
skipHeavy := changed ≠ ∅  &&  every p in changed is inert(p)
```

Framed as an allowlist on purpose: anything **not** confidently inert forces the
full gate — a `.ts`, a `package.json`, `content.config.ts`, anything under
`layers/` (including a per-Tenant `CONTEXT.md`), a `.png` in `docs/`, a deleted
`.ts`, a renamed non-`.md`. Conservative by construction: the failure direction is
"ran the gate we didn't strictly need," never "skipped a step we needed."

## The hard part: detecting *what changed*, reliably

The predicate is trivial; a trustworthy diff base is where this lives or dies.

- **Local (`pnpm gate`):** base = `merge-base(origin/main, HEAD)`. The pre-cloned
  `origin/main` is routinely stale (CLAUDE.md), so the script **must
  `git fetch origin main` first** — the exact pattern already in
  `scripts/merged-since.ts` and `scripts/recent-prs.ts`. The changed set is the
  **union of** committed-since-base **and** the dirty working tree via
  `git status --porcelain` — the latter is essential to catch *uncommitted and
  untracked* new files (a plain `git diff` would miss an untracked `.ts`).
- **CI (`gate.yml`, `pull_request`):** base = the PR base;
  `git diff --name-only origin/main...HEAD` (three-dot = merge-base diff). On
  `push: main`, **always run the full gate** — no skip on the mainline.
- **Fail-safe (run the full gate) when:** the fetch fails; the merge-base is empty
  (CLAUDE.md warns the pre-clone can be a fully *unrelated* root, not just stale);
  or the changed set is empty. Never skip under uncertainty.

## Where the code lives — and the split an agent can't fully own

- **Local part — agent-deliverable.** Add a `scripts/gate.ts` that computes the
  scope, then runs the floor unconditionally and the heavy layers conditionally,
  streaming child output; point `package.json`'s `gate` at it. This keeps the
  step list single-homed (the script becomes the home CI mirrors).
- **CI part — needs a human.** `.github/workflows/gate.yml` is CI: human-only to
  *merge* (ADR-0004 high-risk set), and **agent sessions cannot push workflow
  files at all** — no `workflow` OAuth scope, the same constraint that forced the
  L1 workflow change in ADR-0004's 2026-07-11 amendment to be human-applied. An
  agent can author the exact diff (a `scope` step emitting a job output, plus
  `if: steps.scope.outputs.skip_heavy != 'true'` guards on the three heavy steps),
  but a human applies it. Reaching for a marketplace action such as
  `dorny/paths-filter` would additionally trip ADR-0004's **new-dependency** axis
  → hand-roll the git diff instead.

### Drop-in sketch (`scripts/gate.ts`)

Illustrative, not tested — the shape, not the final code:

```ts
import { execFileSync, spawnSync } from 'node:child_process'
import { root } from '../shared/expand.ts'

const git = (args: string[]) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()

/** Every path changed vs origin/main, committed + working-tree + untracked. */
function changedPaths(): string[] | null {
  try {
    execFileSync('git', ['fetch', 'origin', 'main'], { cwd: root, stdio: 'ignore' })
    const base = git(['merge-base', 'origin/main', 'HEAD']) // '' → unrelated root
    if (!base) return null // fail-safe: unknown scope ⇒ full gate
    const committed = git(['diff', '--name-only', `${base}..HEAD`])
    const worktree = git(['status', '--porcelain']) // catches untracked (??) too
      .split('\n').map((l) => l.slice(3).trim())
    return [...new Set([...committed.split('\n'), ...worktree])].filter(Boolean)
  } catch {
    return null // fail-safe on any git error
  }
}

const inert = (p: string) => p.endsWith('.md') && !p.startsWith('layers/')

const changed = changedPaths()
const skipHeavy = changed !== null && changed.length > 0 && changed.every(inert)

const FLOOR = ['verify:skills-lock', 'lint', 'typecheck', 'validate:content']
const HEAVY = ['test', 'build', 'test:e2e']
const steps = skipHeavy ? FLOOR : [...FLOOR, ...HEAVY]

if (skipHeavy) console.log('gate: inert docs-only change — skipping', HEAVY.join(', '))
for (const s of steps) {
  const r = spawnSync('pnpm', [s], { cwd: root, stdio: 'inherit' })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
```

## Governance

This is **not a free optimisation** — it weakens the merge gate, the one place
ADR-0004 explicitly says *not* to apply "KISS / skip it." Consequences:

- **High-risk / human-only to merge** (touches CI + gate behaviour).
- As net-new autonomous work it needs an **ADR-0003 green-light to implement**.
- It clears the repo's 3-part ADR test (hard to reverse · surprising without
  context · a real trade-off), so it likely **warrants a short ADR** recording
  the contract: *floor always runs · fail-safe to the full gate · docs-outside-
  `layers/` are provably inert, and why.*

Precedent and caution both come from `validate:content` (issue #133): the repo
already accepts a **fast local supplement**, but it was deliberately scoped as
*additive, never a gate replacement*. That yields two coherent options:

1. **Additive only (zero governance risk):** ship a separate `pnpm gate:changed`
   for fast local feedback and leave the real gate (CI + `pnpm gate`) fully
   intact. Saves an agent's local wall-clock; saves no CI minutes.
2. **Modify the gate (the stronger ask):** the floor/heavy split above, landing
   the local part by PR and handing a human the `gate.yml` diff. Saves CI + local
   time; needs the green-light and ADR above.
