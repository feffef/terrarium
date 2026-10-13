# ADR-0014 rewrite report

Rewrite: `rewrites/0014.md`. Original: `docs/adr/0014-build-time-virtual-routing-module.md`.

## 1. Inventory (current rules → rewrite section)

| # | Rule today | Source | Checked against | Rewrite |
|---|---|---|---|---|
| 1 | Routing map derived at build time from `expand(loadManifests())` by `modules/routing.ts`, written to `.nuxt/routing.mjs`, exposed as `#routing` | Decision bullet 1 | `modules/routing.ts` | Summary |
| 2 | Nothing derived from manifests is committed; no regenerate step | Decision bullet 5, Consequences 1 | no `scripts/generate.ts`, no `shared/routing.generated.ts`, no `gen`/`gate:drift` script | Summary; Why |
| 3 | `#routing` exports only `routingMap` (Tenant → Space → Collection → key) | Context said map + entry routes; entry routes dropped in b83f7e501 | `modules/routing.ts`; importers use only `routingMap` | Scope 1 |
| 4 | Same expansion as `content.config.ts` | Decision bullet 1 | code | Scope 1 (points to ADR-0013) |
| 5 | Plain static import; resolver stays Nuxt-context-free and unit-testable | Context; Decision bullet 2 | `shared/routing.ts` imports `#routing` | Scope 2 |
| 6 | Output is plain JS (Nitro's Rollup can't parse TS) plus companion `.d.ts` | Decision bullet 1; #211 amendment (`addTypeTemplate`) | code comments hold both | See (mechanics) |
| 7 | `.nuxt/` must be fresh; `postinstall` and `pnpm test` run `nuxt prepare` | Decision bullets 3.2, 6 | `package.json` | Scope 3 |
| 8 | After adding a layer or rebasing, run `pnpm install` | Summary rule only (not in ADR) | `docs/agents/tenant-layers.md:121` | Scope 3 |
| 9 | Three alias wirings: Nuxt alias, `vitest.config.ts`, `tsconfig.node.json` | Decision bullet 3; #211 amendment (wiring 3 still stands) | both files | Scope 4; details to See |
| 10 | Dev: existing manifest or `shared/expand.ts` edit auto-restarts; brand-new layer folder needs manual restart | Consequences caveat as amended by #325 (amendment wins; ADR-0018 path rename applied) | `modules/routing.ts` watch block | Scope 5 |
| 11 | e2e entry routes derived via `entryRoutesFrom` in `shared/expand.ts` | Decision bullet 7 (module no longer shares it, b83f7e501) | `tests/support/e2e.ts:65` | Scope 6 |
| 12 | Module and resolver are isolation-critical, Human-only | Consequences last bullet | `adr-0004-human-merge.md` paths | Scope 7 (no re-enumeration, per ADR-0004) |
| 13 | Client needs map at runtime; browser derivation drags manifests + zod into bundle | Context | — | Why; Rejected |
| 14 | Prevention over detection; one mechanism | Consequences 1, 3 | — | Why |
| 15 | Trade-off: map absent from PR diffs; review manifest diff; print expansion | Consequences 4 | debug command runs today | Rejected 1; Consequences 1 |
| 16 | More coupling to Nuxt build internals | Consequences 5 | — | Consequences 2 |

## 2. Dropped

- **History:** Date/Status lines, "Supersedes ADR-0007 / Amends ADR-0013" banner, ADR-0018 banner (paths now just say `layers/`), #211 and #325 banners (folded into current state), the CI `L0 · drift` lockstep note and its "Resolved by #97", the "Deleted:" list, "`shared/routing.ts` changes one import", "`package.json` loses `pnpm gen &&`".
- **No longer true:** `#routing` carrying the entry-route list (dropped in b83f7e501); "`entryRoutesFrom` shared with `modules/routing.ts`"; no-watch caveat for existing manifests; `tenants/` paths; `addTemplate` for the `.d.ts`.
- **`expand()` determinism and L3 tests unchanged:** owned by ADR-0002/0013; dropped here.
- **Mechanics moved to See (as pointers):**
  - Plain-JS-for-Nitro reason, `addTypeTemplate`, dev watch list: already in `modules/routing.ts` comments.
  - vitest `fileURLToPath(new URL(...))` cwd-independence: already in `vitest.config.ts` comment.
  - `tsconfig.node.json` wiring: already in its comment.
  - The debug one-liner `node --import tsx/esm -e "import {expand,loadManifests} from './shared/expand.ts'; console.log(JSON.stringify(expand(loadManifests()),null,2))"` (verified it runs): has **no other home**. Should live in `docs/agents/tenant-layers.md` (or become a `pnpm` script, which needs a human merge since `package.json` is Human-only). The rewrite says "print the expansion" without the command until that home exists.

## 3. Rule check (`.claude/rules/adr-0014.md`)

| Rule fact | Rewrite |
|---|---|
| `modules/routing.ts` builds map from `expand(loadManifests())` at build time, writes `.nuxt/routing.mjs`, exposes `#routing` | Summary |
| After adding a layer or rebasing, run `pnpm install` (runs `nuxt prepare`) | Scope 3 (was missing from the old ADR; added as an inventory row) |
| Mirror every `#` alias in `vitest.config.ts` and `tsconfig.node.json` | Scope 4 |
| Brand-new layer folder needs a dev-server restart | Scope 5 |

Drift to report: the rule's "mirror **every** `#` alias in `vitest.config.ts`" conflicts with ADR-0025, which wires `#catalog` with no vitest alias because no spec imports it (confirmed: `vitest.config.ts` has no `#catalog`). The rewrite says "wherever its importers run". The rule should say the same when re-checked.

## 4. Format friction

- **Scope vs. See for mechanics.** The three alias wirings are both a limit agents trip on (the rule's main actionable line) and implementation detail. I kept one Scope line naming the two files and why, and pushed the how to See. The template gives no guidance for "mechanic that is also the rule".
- **Rejected alternatives live in other ADRs.** The main rejected option (commit + drift-check) *was* ADR-0007 and half of ADR-0013. Restating it here partly duplicates them; pointing only by number would leave the reason unstated. I kept a two-sentence version. Superseded ADRs that still exist make "one home" ambiguous; this ADR would be cleaner if 0007/0013's routing halves were retired (survey option A1/A2).
- **When to revisit sourced from another ADR.** The only revisit condition (module consolidation) comes from ADR-0025's follow-ups, not from 0014. I included it because it names 0014's module; a stricter reading of "only conditions the sources give" might leave the section out.
- **Summary-rule-only facts.** "Run `pnpm install` after rebasing" existed only in the rule. ADR-0030 says the rule adds nothing the ADR lacks, so the rewrite had to absorb a fact the original decision never stated. The template doesn't say whether that is allowed during a "same decision" rewrite; I treated it as a current limit.
- **Human-only line.** ADR-0004 says not to re-enumerate the list; but "isolation-critical" is this ADR's reason the files are Human-only. I named the role (module and resolver) without paths. Borderline duplication.

## 5. Open questions

- Should the debug-print command move into `docs/agents/tenant-layers.md` or become a `pnpm` script?
- Stale doc comment in `shared/expand.ts:162-164` still says `entryRoutesFrom` is shared with `modules/routing.ts`; it is only used by `tests/support/e2e.ts` now. Similarly ADR-0006's banner names `entryRoutesFrom` as shared. Fix when those are touched.
- Fix the rule's "every `#` alias" wording (see section 3).

## 6. Lines

Old: 106. New: 73.
