# Reduce `gate.yml` to a shell over the agent-pushable Gate composite action

## Origin

`#879`, green-lit in a `/grill-with-docs` session. Decision recorded in
[ADR-0026](../adr/0026-gate-workflow-thin-shell.md).

**Replaces all three currently-pending proposals** — see Companion change.

## Target

`.github/workflows/gate.yml`

Replace the **entire file** with the following. This is the last hand-edit the
Gate should need for anything other than triggers or permissions.

```yaml
# Objective safety gate (ADR-0004). The Gate's layered steps live in
# .github/actions/gate/action.yml, where agents can push them (ADR-0026) — the
# `workflow` OAuth scope is fenced at .github/workflows/ only. This file is the
# shell: triggers, permissions, checkout, and the doorbell token. Both files are
# human-only to merge (ADR-0004's high-risk set).

name: safety-gate

on:
  pull_request:
  push:
    branches: [main]

jobs:
  gate:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
    steps:
      - uses: actions/checkout@v7
        with:
          # The composite's Scope step needs the PR's base commit and a real
          # merge-base. A shallow checkout has neither, and scripts/gate.ts then
          # refuses to classify at all — which costs a Full gate, not a wrong
          # one. See ADR-0026.
          fetch-depth: 0

      # Everything the Gate actually does. `secrets` is unreachable inside a
      # composite action, so the doorbell's token is passed in here.
      - uses: ./.github/actions/gate
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

Note the job-level `env: PLAYWRIGHT_BROWSERS_PATH` block is **gone** — it moved
into the composite, onto the two steps that use it (the Chromium install and
`test:e2e`), so the shell has no reason to know about it.

## Rationale

Full argument in ADR-0026. In brief: the `workflow` OAuth scope agent sessions
lack is fenced at `.github/workflows/` only — `.github/actions/**` is
agent-pushable, verified empirically in #879 by pushing and reverting a throwaway
`.github/actions/probe/action.yml`. Moving the Gate's steps into a composite
action makes them agent-maintainable, collapses the pending-proposal queue, and
lets `tests/unit/gate-parity.spec.ts` mechanically pin CI's step list against
`scripts/gate.ts`'s `FLOOR`/`HEAVY` — closing the drift class that produced the
`validate:content` gap (ADR-0004's 2026-07-11 amendment) and `#630`.

This is not a loosening of the merge gate. `gate.yml` already delegated step
*content* to `package.json`, and `./.github/actions/gate` resolves from the
checked-out `refs/pull/N/merge` — the PR's own copy — exactly as everything else
CI runs does. ADR-0026's "Why this is not a new security hole" has the detail.

### What this file no longer contains, and why that is safe

Every step removed from `gate.yml` reappears in `action.yml`, in the same order,
with the same names. That equivalence is not a claim to be trusted — it is
asserted by `tests/unit/gate-parity.spec.ts`, which fails if the composite's
`pnpm <script>` list ever stops equalling `FLOOR` + `HEAVY`, if a Heavy step
loses its `if:` guard, or if a Floor step gains one.

### The one honest risk

Nothing will have run `action.yml` before you apply this. Apply it on a branch
and open a PR: that PR's own run is the first execution, and it fails closed — a
malformed composite reds the job rather than silently skipping a layer. If it
goes red, revert the shell; the composite is inert without it.

## Companion change

**Apply alongside the PR for `#879`**, which adds
`.github/actions/gate/action.yml` (plus `tests/unit/gate-parity.spec.ts`,
ADR-0026, and the glossary terms). The shell without the composite fails at
`uses:`; the composite without the shell is simply uncalled. Land them in the
same sitting.

**Delete all four proposal files when you apply this** — this one and the three
it replaces:

- `docs/proposals/445-ci-reuse-gate-scoped-classifier.md` — its `Scope` step and
  the four `if:` guards are in the composite, unchanged in behaviour. Its
  `--decide` companion mode already shipped in PR #841 and is untouched.
- `docs/proposals/630-add-verify-mermaid-to-gate-workflow.md` — the
  `'L0 · mermaid drift'` step is in the composite, in the position #630 asked
  for. The parity spec now makes its omission a test failure, so this specific
  gap cannot recur.
- `docs/proposals/659-fork-pr-gate-doorbell-token.md` — the composite's doorbell
  carries both halves of #659's recommendation (the same-repo `if:` guard and
  `continue-on-error: true`), and additionally passes PR-controlled values
  through `env:` rather than inline `${{ }}`. The parity spec asserts both
  halves.

**Also in the same commit:**

1. Drop CLAUDE.md's now-false "**Known gap:** `gate.yml` currently runs a stale
   subset of `pnpm gate`…" sentence in the Self-verification section — it points
   at #630's deleted file, and the parity spec supersedes it.
2. Paste the ADR-0004 amendment below, after the existing `2026-08-06` ADR-0026
   amendment, re-dated to the day you apply it. It is drafted here rather than
   landed because it asserts live CI behaviour that does not exist until you
   apply this file, and in this repo a stale doc is a behavioural bug (CLAUDE.md,
   "Single-home every fact"). ADR-0026's own structural decision *is* already
   landed, since that part is true at merge.

```markdown
> **Amended (2026-08-06).** *CI skips the Heavy tier on a provably Inert
> changeset.* The Decision's "every PR must clear it" still governs what the
> Gate *covers*; this narrows only what it *executes*. When every changed path
> in a PR is Inert by `scripts/gate.ts`'s `isInert` — a `.md` outside
> `layers/`, or a `.claude/skills/` entry — CI runs the Floor
> (`verify:skills-lock`, `verify:mermaid`, `lint`, `typecheck`,
> `validate:content`) and skips L3 (`test`), L0's `build`, and L2 (`test:e2e`).
> The safety argument is the Inert-set proof in issues #350 and #544: no
> skipped step reads those paths, so running them could only re-confirm the
> previous run. CI asks `scripts/gate.ts --decide` for the decision instead of
> restating the predicate in YAML, so the local and CI classifications cannot
> diverge (ADR-0026 moved that invocation into the composite action). The
> relaxation is one-directional — an undeterminable diff base, a shallow
> checkout, a failed decision step, an empty changeset, or a `push: main` event
> each run the Full gate, so the skip is only ever reached on a
> positively-proven Inert set (issues #445, #879). If CI ever goes green on an
> Inert-classified PR that a Full gate would have caught, the classifier is
> wrong: that is the signal that tightens `isInert` or retires this amendment.
```

**Does not touch `.github/workflows/pr-authorassociation-label.yml`.** Only the
Gate gets this treatment; see ADR-0026's Consequences for why the second
workflow is deliberately left alone.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01ErWC7JVF6xz3CufXjGAN77
