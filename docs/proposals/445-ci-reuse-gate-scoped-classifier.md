# Let the CI safety gate reuse the `gate:scoped` classifier

> **SUPERSEDED by [`879-gate-yml-thin-shell.md`](879-gate-yml-thin-shell.md)
> — do not apply this file.** The `Scope` step and the four `if:` guards below
> now live in `.github/actions/gate/action.yml` instead, unchanged in behaviour
> (ADR-0026). Applying the region replacement below would put the steps back
> into the workflow and undo that. Both files are deleted together when `879`
> is applied. Kept meanwhile only so the drop-zone still records the pending
> intent.

## Origin

`#445` (the CI half; the stale-deps preflight half shipped in PR #470 and is
live in `scripts/gate.ts` today). Option 2 on `#350`, which shipped the local
`gate:scoped` tool and deliberately left the CI-side reuse open.

## Target

`.github/workflows/gate.yml`

Replace the block from `steps:` through the `'L2 · smoke render'` step with the
YAML below. **Everything after it — the `Doorbell` step — is unchanged by this
proposal** (`#659` owns the pending edit there; see Companion change).

```yaml
    steps:
      - uses: actions/checkout@v7
        with:
          # The scope decision below needs the PR's base commit and a real
          # merge-base. A shallow checkout has neither, and the script then
          # refuses to classify at all — which costs a full gate, not a wrong
          # one. See issue #445.
          fetch-depth: 0

      - uses: pnpm/action-setup@v6

      - uses: actions/setup-node@v6
        with:
          node-version: 22
          cache: pnpm

      - name: Install
        run: pnpm install --frozen-lockfile

      # Asks scripts/gate.ts — the same classifier `pnpm gate:scoped` runs
      # locally — whether this changeset can skip the heavy layers, rather than
      # re-expressing the predicate in YAML where the two would drift (#350,
      # #445). Skipped entirely on push:main, which leaves the output empty and
      # therefore runs everything below. continue-on-error so a broken optimizer
      # can only ever cost time — never skip a layer, never red the gate.
      - name: 'Scope · can the heavy layers be skipped?'
        id: scope
        if: github.event_name == 'pull_request'
        continue-on-error: true
        env:
          BASE_SHA: ${{ github.event.pull_request.base.sha }}
          HEAD_SHA: ${{ github.sha }}
        run: pnpm exec tsx scripts/gate.ts --decide --base "$BASE_SHA" --head "$HEAD_SHA"

      # Pins each external pack Skill's installed SKILL.md hash against its
      # Skill Inventory entry (ADR-0015 amendment) — a governance/provenance
      # check, arguably its own layer rather than one of L0-L3, but the
      # cheapest check available, so it runs first, mirroring `pnpm gate`'s order.
      - name: 'L0 · skills-lock integrity'
        run: pnpm verify:skills-lock

      - name: 'L0 · mermaid drift'
        run: pnpm verify:mermaid

      - name: 'L0 · lint'
        run: pnpm lint

      - name: 'L0 · typecheck'
        run: pnpm typecheck

      # L1 — content validates against strict Collection schemas via Zod
      # .safeParse() (scripts/validate-content.ts). Nuxt Content 3 never
      # validates content at build time (docs/research/nuxt-content-review-grounding.md
      # §2) — this script is what actually enforces L1; see the ADR-0004
      # amendment in this PR.
      - name: 'L1 · content validation'
        run: pnpm validate:content

      # The heavy layers below are guarded on the scope decision (#445). An
      # empty or absent output — step skipped, step failed, base undeterminable
      # — is not 'true', so it runs. The skip is only ever reached on a
      # positively-proven inert changeset.

      # L3 — isolation invariant: unique, correctly-scoped collection keys.
      - name: 'L3 · isolation'
        if: steps.scope.outputs.skip_heavy != 'true'
        run: pnpm test

      # L0 — build succeeds. Does NOT validate content against schemas — Nuxt
      # Content 3 has no safeParse in its parse/insert pipeline; schemas only
      # derive SQL column types (docs/research/nuxt-content-review-grounding.md §2).
      - name: 'L0 · build'
        if: steps.scope.outputs.skip_heavy != 'true'
        run: pnpm build

      # L2 — every (Tenant, Space) entry route renders 200 with content.
      - name: Install Chromium for the L2 browser smoke gate
        if: steps.scope.outputs.skip_heavy != 'true'
        run: pnpm exec playwright-core install --with-deps chromium
      - name: 'L2 · smoke render'
        if: steps.scope.outputs.skip_heavy != 'true'
        run: pnpm test:e2e
```

Four substantive changes to the existing file (plus one explanatory comment
block above the heavy steps), and nothing else:

1. `fetch-depth: 0` on the checkout.
2. A new `Scope` step after `Install`.
3. `if: steps.scope.outputs.skip_heavy != 'true'` on the four heavy steps
   (`pnpm test`, `pnpm build`, the Chromium install, `pnpm test:e2e`).
4. A new `'L0 · mermaid drift'` step — this is `#630`'s pending proposal, folded
   in here so applying this replacement can't silently drop it (see Companion
   change).

The floor steps and the doorbell step are otherwise byte-identical to today's
file, comments included.

## Rationale

`.github/workflows/gate.yml` runs every step unconditionally, so a docs-only PR
— `.md` outside `layers/`, or a `.claude/skills/` symlink — still pays for
`pnpm test`, `pnpm build`, a Chromium download, and `pnpm test:e2e`, even though
`scripts/gate.ts` already proves those layers cannot be affected (`#350`'s
inert-set proof, extended by `#544`). Locally `pnpm gate:scoped` skips them; CI
does not. This closes that gap **without moving the decision into YAML**.

### The decision stays single-homed

The workflow does not know what "inert" means. It runs
`scripts/gate.ts --decide`, which composes the existing exported
`isInert`/`decideScope` — the identical code path `pnpm gate:scoped` takes — and
writes `skip_heavy` / `reason` to `$GITHUB_OUTPUT`. Changing the classifier
changes both callers at once; there is no second copy to keep in sync. That is
the property `#445`'s acceptance criteria ask for, and the reason the companion
change below exists at all.

### Undeterminable diff base — the only direction this can fail

CI checks out `refs/pull/N/merge`, and `actions/checkout`'s default depth is 1.
`scripts/gate.ts`'s CI entry point handles that explicitly, and every uncertain
case lands on the same answer — **run the full gate**:

| Situation in CI | What the script returns | What CI runs |
| --- | --- | --- |
| Shallow checkout (`fetch-depth` not 0) | `null` — refuses to classify | full gate |
| `merge-base` fails, or either ref is missing/unresolvable | `null` | full gate |
| `git` itself errors | `null` | full gate |
| Changed set empty | `[]` | full gate |
| Any changed path non-inert | the path list | full gate |
| `push: main` (the `Scope` step doesn't run) | no output at all | full gate |
| `Scope` step crashes (`continue-on-error`) | no output at all | full gate |
| Every changed path inert, base resolved | `skip_heavy=true` | floor only |

The shallow case is checked deliberately rather than left to `merge-base` to
fail: on a grafted history `merge-base` can *succeed* and answer with the graft
boundary, producing a diff that is plausible but wrong. `changedPathsBetween()`
therefore asks `git rev-parse --is-shallow-repository` first and returns `null`
if the answer is `true`. Concretely: if a future edit drops `fetch-depth: 0`,
this optimization silently stops optimizing — it does not silently stop gating.

`skip_heavy` is compared with `!= 'true'`, never `== 'false'`, so an absent,
empty, or malformed output can only mean "run it".

### What is deliberately not changed

- The inert predicate itself (`#445` puts that out of scope).
- Any floor step is ever skipped — `verify:skills-lock`, `verify:mermaid`,
  `lint`, `typecheck`, `validate:content` run on every event, so the
  "gate that broke its own gate" coverage of `.agents/skills/**/SKILL.md`
  survives.
- The doorbell. `success()` is still true when heavy steps are skipped, so a
  green inert PR still gets its comment.

### Rejected alternative — one `pnpm gate:scoped` step

Replacing all seven steps with a single `run: pnpm gate:scoped` would be the
most single-homed option possible, and it is worse on three counts: CI loses
per-layer step names, so "which layer failed" moves from the run summary into
log scrollback; `gate:scoped`'s stale-deps preflight would run a non-frozen
`pnpm install` in CI, defeating `--frozen-lockfile`; and its base detection is
`merge-base origin/main HEAD`, which is wrong for any PR that does not target
`main`, whereas the event payload always carries the PR's real base.

## Companion change

**Apply alongside PR for `#445`** — it adds the `--decide` mode to
`scripts/gate.ts` (plus `tests/unit/gate-ci-decide.spec.ts`) that the `Scope`
step above invokes. Order does not matter as long as both land in the same
sitting: the workflow without the script fails the `Scope` step, which
`continue-on-error` turns into a full gate; the script without the workflow is
simply uncalled. Applying only one half is not *unsafe*, but it is exactly the
drift this directory's README warns about, so land them together.

**Subsumes `docs/proposals/630-add-verify-mermaid-to-gate-workflow.md`.** The
replacement above already contains `#630`'s `'L0 · mermaid drift'` step, in the
position `#630` asked for. Delete **both** proposal files when this is applied.
If `#630` was already applied first, this replacement is identical on that point
and nothing is lost. Applying this also closes the gap CLAUDE.md's
Self-verification section records ("**Known gap:** `gate.yml` currently runs a
stale subset of `pnpm gate`…", which points at `#630`'s now-deleted file) —
drop that sentence in the same commit.

**Also apply the ADR-0004 amendment below, in the same sitting.** ADR-0004's
Decision reads "Layered gate, cheapest-first. **Every PR must clear it**" — this
is the first time the *merge* gate declines to execute a layer, so it needs to
be recorded where the gate's rules live. It is drafted here rather than landed
as an edit to `docs/adr/0004-objective-safety-gate.md` on purpose: merged ahead
of the workflow, it would document behaviour CI does not yet have, and in this
repo a stale doc is a behavioural bug (CLAUDE.md, "Single-home every fact").
Paste it after the existing `2026-07-30` amendment, before `## Context`;
re-date it to the day it is applied.

```markdown
> **Amended (2026-08-04).** *CI skips the heavy layers on a provably inert
> changeset.* The Decision's "every PR must clear it" still governs what the
> gate *covers*; this narrows only what it *executes*. When every changed path
> in a PR is inert by `scripts/gate.ts`'s `isInert` — a `.md` outside
> `layers/`, or a `.claude/skills/` entry — `.github/workflows/gate.yml` runs
> the floor (`verify:skills-lock`, `verify:mermaid`, `lint`, `typecheck`,
> `validate:content`) and skips L3 (`test`), L0's `build`, and L2 (`test:e2e`).
> The safety argument is the inert-set proof in issues #350 and #544: no
> skipped step reads those paths, so running them could only re-confirm the
> previous run. CI asks `scripts/gate.ts --decide` for the decision instead of
> restating the predicate in YAML, so the local and CI classifications cannot
> diverge. The relaxation is one-directional — an undeterminable diff base, a
> shallow checkout, a failed decision step, an empty changeset, or a
> `push: main` event each run the full gate, so the skip is only ever reached
> on a positively-proven inert set (issue #445). If CI ever goes green on an
> inert-classified PR that a full gate would have caught, the classifier is
> wrong: that is the signal that tightens `isInert` or retires this
> amendment.
```

**Does not touch `docs/proposals/659-fork-pr-gate-doorbell-token.md`.** `#659`
edits the doorbell step, which this proposal leaves alone; the two apply in
either order without conflict. Do not paste the doorbell step from this file —
it isn't in this file.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01SuvMh3wC6nyykyAVQuYVb4
