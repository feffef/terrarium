# ADR-0014 rewrite report

ADR-0014 cites ADR-0004, 0006, 0007, 0013, 0018. Cited by 0004, 0006, 0007,
0013, 0016, 0025 (and the 0002 summary rule). Rewrites read: 0004, 0016. No
session read ADR-0014 in full in the log window (9 rule loads, backlog and
audit-docs).

## 1. Parts

| # | Part | Outcome | Reason | Where it went |
|---|---|---|---|---|
| 1 | Header: date, status, "supersedes 0007, amends 0013" | leftover | ADR-0030: no history. The superseded option survives as a rejected alternative | *Rejected alternatives* 1 |
| 2 | Banner: amended by ADR-0018 (`tenants/` → `layers/`) | leftover | Rewrite uses current paths | dropped |
| 3 | Banner #211: `addTypeTemplate` for the `.d.ts` | mechanics | `modules/routing.ts:43-62` (checked) | *See* `modules/routing.ts` |
| 4 | Banner #325: dev watch of manifests; new layer folder still needs restart | split | Watch list: mechanics, `modules/routing.ts:68-78` (checked). The new-folder gap: live, non-obvious | *Consequences* 3; *See* |
| 5 | Banner: supersedes 0007 both halves, amends 0013 | leftover | History; git and the rejected alternative carry it | dropped |
| 6 | Context: client needs map at runtime; deriving in browser drags manifests + zod in | live | Still true; the reason the map is plain data | *Why* 2; *Rejected alternatives* 2 |
| 7 | Context: `addTemplate` gives a build-time virtual module; static import keeps resolver free of Nuxt | split | Static import, no composable: live (`shared/routing.ts:8`, `tests/unit/routing.spec.ts:499` runs it without Nuxt). API detail: mechanics | *Scope* "How it reaches code"; *See* |
| 8 | Decision headline: replace committed map + generator with a Nuxt module | live | Core decision | Summary; *Scope* "To change the map" |
| 9 | Decision: module runs `expand(loadManifests())`, plain `.mjs` for Rollup, `.d.ts` companion | split | One expansion: live. `.mjs`/`.d.ts`: mechanics, `modules/routing.ts:28-62` | *Scope* "One source"; *See* |
| 10 | Decision: `shared/routing.ts` changes one import, resolver unchanged | leftover | Describes the migration diff | dropped |
| 11 | Decision: three numbered alias wirings | mechanics | `nuxt.options.alias` in `modules/routing.ts:66`, `vitest.config.ts:24`, `tsconfig.node.json:37` (all checked). The non-obvious effect (tools outside Nuxt read `.nuxt/`) is live | *Consequences* 2; *See* |
| 12 | Decision: generate.ts, `pnpm gen`, `gate:drift`, routing.generated.ts, ESLint ignore deleted | split | Deletion list: leftover. "Never add a generator or drift check": live | *Scope* "To change the map" |
| 13 | Decision: `package.json` script prefixes (`postinstall`, `nuxt prepare &&` on test) | mechanics | `package.json:10,17` (checked) | not repeated; `package.json` is the environment |
| 14 | Decision: e2e entry routes from `entryRoutesFrom(expand(...))`, shared with the module | split | Same-source rule: live. Helper: mechanics, `shared/expand.ts:166`, `tests/support/e2e.ts:60-64`. (The module no longer uses `entryRoutesFrom`; only the tests and catalog do) | *Scope* "One source"; *See* |
| 15 | Consequence: no regenerate step for anything | live | Core | Summary |
| 16 | Consequence caveat: dev server doesn't watch manifests | split | Stale for existing manifests (#325); holds for a new layer folder | *Consequences* 3 |
| 17 | Consequence: dead `L0 · drift` CI step, lockstep human edit; resolved by #97 | leftover | Done; history | dropped |
| 18 | Consequence: deleted files list, one mechanism remains | split | List: leftover. One mechanism: live | *Scope* "One source" |
| 19 | Consequence: trade-off, map gone from PR diffs, mitigated by manifest diff | live | Still the trade-off; plausible to be re-proposed | *Rejected alternatives* 1; *Consequences* 1 |
| 20 | Consequence: `pnpm gen --print` replaced by a `node -e` one-liner | mechanics without a home | No live doc holds it. Reading `.nuxt/routing.mjs` after `nuxt prepare` is simpler | New home proposed (§3) |
| 21 | Consequence: more coupling to Nuxt build internals | live | Non-obvious cost | *Consequences* 4 |
| 22 | Consequence: still Human-only (four files); determinism, L3 tests unchanged | split | Human-only: owned by ADR-0004, list in `.claude/rules/adr-0004-human-merge.md` (checked: all four listed). "Unchanged": leftover | *Scope* "Who merges" (pointer) |

## 2. Callers

| # | Checklist item | Outcome |
|---|---|---|
| 1 | Map worked out from manifests at prepare/build; never committed; no regenerate step | answered (Summary, *Scope*) |
| 2 | Content config, map and tests run the same expansion | answered (*Scope* "One source") |
| 3 | `#routing`, `.nuxt/routing.mjs` plain JS, `.d.ts` literal type | mechanics: `modules/routing.ts` (*See*) |
| 4 | Which ADRs it replaces or changes | answered by *Rejected alternatives* 1; the replace/amend relation is history. Fix callers 0006, 0007, 0013 (§3) |
| 5 | Smoke-test entry routes from the same expansion | answered (*Scope*); mechanics `shared/expand.ts`, `tests/support/e2e.ts`. Fix the caller: `tests/e2e/smoke.spec.ts:4` says "build time" |
| 6 | Nothing committed, so no drift check needed | answered (*Scope* "To change the map", *Why* 1) |
| 7 | How tools outside Nuxt find `#routing` (numbered wirings) | mechanics: `vitest.config.ts`, `tsconfig.node.json` (*See*); effect in *Consequences* 2. Fix the caller `modules/routing.ts:49` ("wiring #3") |
| 8 | What the map covers | added, corrected against code: the map holds every collection key per Space (`modules/routing.ts:16-21`; `shared/routing.ts` returns `pagesKey` and `collections`), not "only pages". Routes only for `pages` (ADR-0006). Root page excluded (ADR-0016). Sitemap question stays with ADR-0025's follow-ups. Fix the caller `docs/adr/0025:35-36` at its rewrite |
| 9 | The pattern other derived data may copy (`#catalog`) | added (*Scope* "Other data derived from the manifests"); true in code (`modules/catalog.ts`, `tsconfig.node.json:38`) |
| 10 | How a manifest edit reaches a running dev server | mechanics: `modules/routing.ts:68-78`; the gap in *Consequences* 3 |
| 11 | Resolver reads the real built map when none is passed | mechanics: `shared/routing.ts`, `tests/unit/routing.spec.ts:499` |

Callers that only explain (the four `tenant.config.ts` headers, `shared/manifest.ts:150,163`, `shared/expand.ts:6`, `content.config.ts:12`, `tests/unit/expand.spec.ts:5`, `vitest.config.ts:21`, `tsconfig.node.json:32`, `tests/support/e2e.ts:59,62`, `.claude/rules/adr-0002.md:13`, Midden artifacts and `strata.ts:38`): still accurate; no change. Midden files are a historical record; leave them.
ADR-0004:82, :106 and ADR-0016:33: their rewrites already drop these mentions.

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0014.md`

```markdown
---
adr: <new hash>
paths:
  - "modules/routing.ts"
  - "shared/routing.ts"
  - "vitest.config.ts"
  - "tsconfig.node.json"
---
# ADR-0014: The routing map is built from the manifests at build time, never committed

`modules/routing.ts` builds the routing map from the manifests on every
prepare or build and exposes it as `#routing`. To change the map, edit a
manifest; never commit a generated file or add a drift check. Unit tests and
`tsc -p tsconfig.node.json` read it from `.nuxt/`: after a rebase or a new
layer, run `pnpm install` to refresh it, and give a new `#` import they use an
alias in `vitest.config.ts` or `tsconfig.node.json`. A new layer folder needs
a dev-server restart. Read the full ADR before changing how the map is built
or delivered.
```

(Old rule said "Mirror every `#` alias" in both files; `#catalog` has no
vitest alias, by ADR-0025's choice, so "every" was wrong.)

### Caller edits

- `modules/routing.ts:49`: `// (ADR-0014, wiring #3).` → `// (ADR-0014).`
- `tests/e2e/smoke.spec.ts:3-4`: `The target list is derived at build time from the manifests` → `The target list is derived at test time from the manifests`.
- `docs/adr/0006-runtime-routing-path-prefix.md:4`: `Status: Accepted — routing-map delivery amended by ADR-0014` → `Status: Accepted`; lines 6-13 (the banner) → `> The routing map is now built from the manifests at build time (ADR-0014); read the mechanism references below as historical.`
- `docs/adr/0007-generated-config-committed-drift-checked.md:4-15`: status → `Status: Superseded by ADR-0013 and ADR-0014`; banner → `> Nothing generated is committed any more: see ADR-0013 (collections) and ADR-0014 (routing map).`
- `docs/adr/0013-dynamic-content-config-committed-routing-map.md:4-5`: status → `Status: Accepted — the routing-map half is superseded by ADR-0014`; lines 11-16 banner → `> The routing map is no longer committed either (ADR-0014).`
- `docs/adr/0025-cross-tenant-catalog-and-collection-kinds.md:35-36` (at 0025's rewrite): "it knows only `pages`" → "it maps each Space to its collection keys, for URL resolution".

All four ADR files are Human-only (`docs/adr/**`); the module and rule too.

### New homes

- `docs/agents/tenant-layers.md` §3, after the "Space or Collection" bullet: `To see the expanded keys, read `.nuxt/routing.mjs` after `nuxt prepare`.` (replaces the dropped `pnpm gen --print` one-liner). Optional; drop if nobody misses it.

### Other ADRs

- ADR-0013 owns the content-config half of "one expansion". Agrees (`.claude/rules/adr-0013.md`).
- ADR-0006 owns "only `pages` gets routes" and the resolver. Agrees (its rule).
- ADR-0016 rewrite owns "root page not in the map or entry routes". Agrees.
- ADR-0004 rewrite owns Human-only. Agrees; the human-merge rule lists `modules/routing.ts`, `shared/routing.ts`, `shared/expand.ts`, `content.config.ts`.
- ADR-0025 owns `#catalog` and the "fold into one module before a fourth" follow-up, cited under *When to revisit*. Agrees; 0025:35-36 is stale on what the map holds (edit above).

## 4. Policy questions

None. Every change is a leftover or mechanics. The open sitemap question
(can `#routing` serve as a page list) belongs to ADR-0025 and stays there.

## 5. Split

Not needed (66 lines).

## 6. Prompt friction

- ADR-0014 is mostly a migration record. Most parts are leftovers, and the
  live decision is short; the rejected alternative is the superseded ADR's
  own decision. The template fit, but the line between "history" and
  "rejected alternative" took judgment here.
- The checklist item 8 wording ("only `pages`") came from a stale caller. The
  code says otherwise; "how a caller words something never shapes the ADR"
  covered it.
- Step 5's "Other ADRs" overlaps with step 3's "fix the caller" when the
  caller is itself an ADR; I listed edits once, under Caller edits.

## 7. Lines

Old: 106. New: 66.
