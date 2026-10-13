# ADR-0007 rewrite report

The old ADR's whole decision (commit the generated config and routing map,
catch drift with `git diff`) was overturned by ADR-0013 and ADR-0014. ADR-0030
has no "superseded" shape, and the first pass is 1:1 with no retiring. So the
rewrite states today's answer to the same question ("committed or built, and
how is drift caught?"): derive at build time; commit only what the build
cannot make (ADR-0024's SVGs), and give that a gate check. This recast is
policy question 1.

## 1. Parts

| Part of old ADR | Outcome | Reason | Where it went |
|---|---|---|---|
| Date, Status "Superseded", "Amended by" banner | leftover | History; ADR-0030 forbids it | git |
| Context: ADR-0002 generator expands manifests into `content.config.ts` | leftover | Generator deleted (ADR-0014); expansion now in `shared/expand.ts` | *See* points to `shared/expand.ts` |
| Context: ADR-0003 charters a drift-check job | leftover | ADR-0003's job ledger goes whole (decisions.md) | dropped |
| Decision: commit the generated artifacts, banner `GENERATED — DO NOT EDIT` | split: leftover / live | Committing them was reversed by 0013/0014; the question it answered is live | *Scope* bullets 1–2; old answer is a *Rejected alternative* |
| `scripts/generate.ts` writes both files | leftover | File deleted (checked: absent) | dropped |
| `dev`/`build`/`typecheck` run `pnpm gen` first | leftover | Script and prefix deleted (`package.json` checked) | dropped; *Scope* bullet 1 says edits apply on next prepare/build/dev |
| Gate runs `pnpm gate:drift` = `pnpm gen && git diff --exit-code` | split: leftover / live | Mechanic deleted; the principle "gate fails when a committed derived file drifts from its source" lives in `verify:mermaid` | *Scope* bullet 3; mechanics home `scripts/verify-mermaid.ts`, `scripts/gate.ts` `FLOOR` (checked: line 17) |
| Consequence: tables reviewable in the PR diff | rejected alternative | 0014 gave it up; manifest diff carries the intent | *Rejected alternatives* bullet 1, *Why* |
| Consequence: generated files excluded from ESLint, never hand-edited | leftover | No generated file remains; `content.config.ts` is linted (ADR-0013) | dropped |
| Consequence: generator must be deterministic | live | Still needed: `expand()` order is sorted (`shared/expand.ts:192`), ADR-0024 pins seed and font so its check is meaningful | *Scope* bullet 4 |
| Consequence: generated file "can look redundant" with the manifest | leftover | Only a quote target for ADR-0013 | dropped |
| Consequence: generator is human-only (ADR-0004) | mechanics | ADR-0004 owns it; the human-merge rule's `paths` list `content.config.ts`, `shared/expand.ts`, `modules/routing.ts`, `modules/catalog.ts` (checked) | dropped; ADR-0004 is its home |

Sourced from other ADRs (live, added because the recast decision needs them):
"derive the routing map in the browser" rejected (ADR-0013/0014 Context);
"prevention over detection" (ADR-0013/0014 Consequences); render-during-CI
rejected (ADR-0024); revert-to-committed-config fallback (ADR-0013:84-85).

## 2. Callers

| # | Checklist item | Outcome |
|---|---|---|
| 1 | ADR-0007 no longer applies; 0013 and 0014 replaced its halves | fix the caller: it now holds a live decision. 0013:11-16, 0014:4, 0014:24-27 banners, and `validate-adr-rules` `NO_RULE` plus its spec (edits below) |
| 2 | The two outputs were committed with a `GENERATED` banner | fix the caller: history. 0013:22-25 and 0012:26 (edits below) |
| 3 | Why commit: PR diff shows tables added/removed | answered: *Rejected alternatives* bullet 1 and *Why* |
| 4 | Drift check `pnpm gen && git diff --exit-code`, `gate:drift` | mechanics: old homes deleted; today's home for the principle is `scripts/verify-mermaid.ts` run from `scripts/gate.ts`. `the-drift-check.yml:14` is a Midden catalog note about a removed step, past tense; leave it |
| 5 | Set the pattern later checks copy (mermaid SVGs, proposed pingback map) | answered: *Scope* bullets 2–3 |
| 6 | Admitted the committed config "can look redundant" | fix the caller: 0013:63-68 drops the quote (edit below) |
| 7 | Needs no summary rule; validator skips it | fix the caller: the skip keys on the number (`scripts/validate-adr-rules.ts:24`, `NO_RULE = new Set(['0007'])`). With a live decision it needs a rule; remove the exemption (edits below) |
| 8 | Reverting to committed config is the fallback | answered: *When to revisit* |
| – | `strata.ts:37` comment ("generated-config-and-drift machinery (ADR-0007) dug out…") | answered: true history in a Tenant's own lore; no edit |
| – | 0024:88 "(ADR-0007's lineage)" | fix the caller: point, don't narrate (edit below) |
| – | Pack Skills `improve-codebase-architecture/SKILL.md:56`, `setup-matt-pocock-skills/domain.md:51` | noise: invented examples in pack Skills, which ADR-0015 keeps as installed; no edit |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0007.md` (new file)

```markdown
---
adr: <stamp with pnpm exec tsx scripts/validate-adr-rules.ts --write>
paths:
  - "modules/**"
  - "scripts/verify-*.ts"
  - "scripts/render-*.ts"
---
# ADR-0007: Files derived from the manifests are built, not committed

Derive anything the manifests determine at build time, in a module or
config that calls `expand(loadManifests())`; commit no generated copy.
Commit a derived file only when the build cannot make it, keep its
derivation deterministic, and add a gate check that fails when it drifts
from its source.

If you plan to commit a new derived file, read the full ADR first:
docs/adr/0007-generated-config-committed-drift-checked.md
```

### Caller edits

All under `docs/adr/` or `.claude/rules/` are Human-only (ADR-0004).

- `docs/adr/0007-generated-config-committed-drift-checked.md`: replace with
  the rewrite. Consider renaming the file to
  `0007-derived-files-built-not-committed.md`; then repoint every link above.
- `scripts/validate-adr-rules.ts:23-24` → delete `NO_RULE` and its comment.
  `:105` → `if (!(\`adr-${n}.md\` in rules)) problems.push(…)`.
- `tests/unit/validate-adr-rules.spec.ts:40-45` → rename to
  `'fails on a missing summary and on a rule with no ADR'`, input
  `{ adrs: { '0024': ADR }, rules: { 'adr-0099.md': 'x' } }`; expectations
  unchanged.
- `docs/adr/0013-dynamic-content-config-committed-routing-map.md:11-16` →
  `> ADR-0007 states the general rule: derive at build time, commit only what the build cannot make.`
  (Or drop it when 0013 is rewritten; the new shape forbids `> Amends` banners.)
- `docs/adr/0013-…:22-25` → "ADR-0007 had committed the generated config and
  routing map and drift-checked them." (old-shape Context; keep it short.)
- `docs/adr/0013-…:63-68` → "**Why the routing map stays committed:** the
  client needs it, and its one line per collection is the reviewable part."
  (Its rewrite will drop the section, since ADR-0014 reversed it.)
- `docs/adr/0014-build-time-virtual-routing-module.md:4` → `Status: Accepted — amends ADR-0013`.
- `docs/adr/0014-…:24-27` → `> **Amends ADR-0013** (which kept the routing map committed). ADR-0007 holds the general rule.`
- `docs/adr/0014-…:96-97` → "**Trade-off accepted, no committed routing-map
  diff** (ADR-0007):"
- `docs/adr/0012-cross-persona-pingbacks-via-authored-denormalization.md:25-28`
  → "**Build-time generated reverse index**: derive a pingback map from all
  posts' `reactsTo` fields at build time (ADR-0007). Sound, but adds generator
  logic for a first, deliberately simple blog, heavier than warranted now."
- `docs/adr/0024-build-time-mermaid-prerender.md:87-88` → "…alongside
  `verify:skills-lock`, as ADR-0007 requires for a committed derived file."

### New homes

None needed. Every dropped detail is either gone from the code or already has
a home: Human-only list (`.claude/rules/adr-0004-human-merge.md`), expansion
order (`shared/expand.ts`), mermaid check (`scripts/verify-mermaid.ts`).

### Other ADRs

- **ADR-0013** owns "the content config is built at config time"; the
  rewrite states it as one bullet and points. Agrees.
- **ADR-0014** owns the `#routing` module and the loss of the routing-map
  diff. Agrees.
- **ADR-0025** owns the build-time catalog (`modules/catalog.ts`). Agrees.
- **ADR-0024** owns committing SVGs and rejecting render-in-CI; the rewrite
  cites it as the example. Agrees (its own Why: no browser in CI or prod).
- **ADR-0004** owns the Human-only list; the rewrite no longer restates it.

## 4. Policy questions

1. **Recast or retire?** The old decision is fully reversed. The rewrite
   recasts ADR-0007 as the general rule its successors and ADR-0024 follow
   in practice. That rule is a synthesis: no single source states "commit
   only what the build cannot make", though 0013, 0014, 0024 and 0025 all act
   on it. Alternatives: retire ADR-0007 (decisions.md defers retiring past
   the first pass), or leave it old-shape with its exemption.
   **Recommend:** keep the recast now. It gives callers one true thing to
   point to and lets ADR-0013/0014 drop their supersession banners. When the
   ADRs are reorganised, merge 0007, 0013 and 0014 into one ADR.
2. **Give ADR-0007 a summary rule?** A live decision needs one under
   ADR-0029, which means removing `NO_RULE`. **Recommend:** yes, with the
   narrow `paths` above, so it shows only when someone works on a build-time
   module or a drift check.

## 5. Split

Not needed: the rewrite is 59 lines.

## 6. Prompt friction

- The prompt assumes the ADR still holds a decision ("the core decision stays
  the same"). ADR-0007 is fully superseded, and neither ADR-0030 nor
  decisions.md says how to rewrite one. I recast it (policy question 1).
- ADR-0007 has no summary rule, so step 1's rule read and step 5's
  "rewrite" became "write a new one".
- Step 3's four outcomes don't fit a Tenant's lore that quotes the ADR
  historically on purpose (Midden's `the-drift-check.yml`, `strata.ts`).
  I used "answered / no edit"; a fifth outcome, "history, leave", would fit.
- Rewrites for 0013 and 0014, the closest neighbours, don't exist yet, so
  I took their facts from the old texts.

## 7. Lines

Old: 53. New: 59.
