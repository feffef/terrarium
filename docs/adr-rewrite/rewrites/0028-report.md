# ADR-0028 rewrite report

Target: `docs/adr/0028-navigation-reads-server-payloads.md`. Rewrite:
`rewrites/0028.md`. Decision unchanged. Checked against `nuxt.config.ts`,
`layers/tinkerfund/nuxt.config.ts`, `tests/unit/page-cache.spec.ts`, the
composables and `docs/research/content-client-queries-without-wasm.md`.

## 1. Inventory

| Current rule | Source | Rewrite section |
|---|---|---|
| Navigation reads target route's `_payload.json`; `useAsyncData` takes data from it, never queries in browser | Decision b1 | Summary; Scope: Payloads |
| First load keeps payload inline | Decision b1 | Scope: Payloads |
| Only cached (or prerendered) routes get payloads | Decision b2 | Summary; Scope: Cached routes |
| `/t/**` cached 60 s, `swr: false` | Decision b2 | Summary; Scope: Cached routes |
| `/` cached the same way | Amendment 2026-10-10 (#1702), both copies | Summary; Scope: Cached routes |
| Server "now" (`useGlassToday`, `useTinkerfundClock`) can be ~2 min old: 60 s cache + `max-age=60` | Decision b2 | Scope: Server "now" |
| Home page daily picks share that bound | Amendment 2026-10-10 | Scope: Server "now" |
| On navigation those recompute in browser (payload merges data, not state) | Decision b2 | Scope: Server "now" |
| Tinkerfund pages vary on `accept-language` (locale, #1365) | Decision b3 | Scope: Request-dependent pages |
| A page reading a header/cookie needs `varies` or serves first visitor's version to all | Consequences b2 | Scope: Request-dependent pages |
| Tinkerfund search uncached, keeps in-browser search | Decision b3 | Scope: Where the browser DB still loads |
| Prefetch on interaction, not visibility | Decision b4 | Summary; Scope: Prefetch |
| Route code downloads on hover / tap on touch | Consequences b4 | Scope: Prefetch |
| Browser DB still loads for Tinkerfund search, re-queries after mount, failed payload fetch; ADR-0019 recovery stays | Consequences b1 | Scope: Where the browser DB still loads |
| Cache bounded: LRU in production, cap in `nuxt.config.ts`, each URL and `varies` variant one entry, eviction only costs a re-render, dev keeps disk cache | Amendment 2026-09-28 (#1446), reverses Consequences b3 | Scope: Bounded cache |
| Server cache safe because Content baked per deploy (ADR-0001) | Consequences b2 | Why |
| WASM runtime ~450 KB gz + per-Collection `sql_dump.txt`; same load is ADR-0019's failure path | Context | Why |
| Measured savings per navigation | Decision trailer | Why |
| Content has no switch to route queries to its server endpoint | Context | Rejected alternatives |
| Full page loads rejected (view transitions, in-memory state, #1444) | Context | Rejected alternatives |
| Visibility prefetch rejected (~550 KB payloads) | Decision b4 | Rejected alternatives |
| Short lifetime "without stale serving" | Decision b2 (swr rejection detailed in research) | Rejected alternatives |
| Unbounded cache grows with junk query strings | Consequences b3 (now the rejected state) | Rejected alternatives |

## 2. Dropped

- **Date, Status, "Green-lit by a human … after a local trial" banner:** history (ADR-0030).
- **Research pointer with PR #1445:** kept as a *See* pointer, PR number dropped.
- **"`@nuxt/content` 3.15.0", `executeContentQuery`, `dist/runtime/client.js`:** mechanics; the research note holds them.
- **Consequences b3 "The cache has no size bound":** no longer true (amendment reversed it). Its risk now justifies the bound under *Rejected alternatives*.
- **Revert bullet ("deleting `payloadExtraction` … Nothing else depends on them"):** no longer true. `tests/unit/page-cache.spec.ts`, `tests/e2e/smoke.spec.ts`, both Tenant e2e specs and the comments in `app/pages/index.vue` and `layers/tinkerfund/app/composables/browse.ts` now depend on it. The config locations moved to *See*.
- **Config literals** (`experimental.payloadExtraction: 'client'`, `routeRules[...]`, `cache = { maxAge: 60, swr: false }`, `driver: 'lru-cache'`, `max: 200`): mechanics; they live in `nuxt.config.ts` and `layers/tinkerfund/nuxt.config.ts`, pointed to from *See*. The ADR keeps the decided values in words (60 s, no stale serving, LRU bound).
- **Issue numbers #1365, #1444, #1446, #1702:** history; git and the research note keep them.

Moved detail should live where it already does: config in the two `nuxt.config.ts` files, Nuxt/Nitro internals and option survey in `docs/research/content-client-queries-without-wasm.md`.

**Follow-up for the research note:** it says "ADR-0028 is the home for the final configuration and the byte measurements". The rewrite keeps the measurements but points to config for the configuration. That sentence should say "`nuxt.config.ts` is the home for the configuration".

## 3. Rule check (`.claude/rules/adr-0028.md`)

| Rule fact | Rewrite |
|---|---|
| Navigation reads `_payload.json` instead of querying Content in browser | Summary; Scope: Payloads |
| Only cached routes have one | Summary; Scope: Cached routes |
| `routeRules` in `nuxt.config.ts` cache `/` and `/t/**` for 60 s | Summary; Scope: Cached routes; See (`routeRules` location) |
| Cached page renders once for every visitor; header/cookie readers need `varies`, as Tinkerfund's do | Scope: Request-dependent pages |
| Server "now" ~2 min old | Scope: Server "now" |

No drift: the rule adds nothing the rewrite lacks. The rule leaves out the cache bound and prefetch default; that is a choice of emphasis, not drift. Its hash needs re-stamping if the rewrite lands.

## 4. Format friction

- **Rejected alternatives vs. sources.** The ADR itself names only three rejections (full page loads, visibility prefetch, implicitly SWR). The linked research note surveys more (prerender, endpoint rewiring, aliasing/WASM hack, patch). I included them because the prompt allows options "linked issues" considered and the ADR links the note. That made the rewrite longer than the original (93 vs 83 lines). The template gives no guidance on whether a linked research note counts as a source, or whether its full survey belongs in the ADR or should stay behind a pointer. A shorter variant drops the three research-only bullets and adds "the research note lists the other options" to *See*.
- **When to revisit** comes only from the research note's ranked list ("upstream toggle", "if payloads prove insufficient"), not the ADR. Same source question.
- **"Unbounded cache" as a rejected alternative** is a reversed consequence, not an option anyone weighed up front. Putting it there felt slightly forced, but it is the only section where the reason for the bound fits without narrating history.
- **Measurements:** evidence, not history, but dated to one local build. *Why* was the least-bad home; the template does not say whether evidence numbers belong in an ADR.
- **Limits vs. Consequences.** Every original Consequence turned out to be a limit (where the browser DB still loads, `varies`, hover prefetch). *Consequences* ended up empty and was left out. The split between "edge case" (Scope) and "non-obvious effect" (Consequences) was unclear for items like hover-time code download.
- **Summary length** was hard: the decision has four coupled parts (payloads, cache, bound, prefetch); fitting them in three sentences meant dropping `varies`, which the rule considers the most actionable part.

## 5. Open questions

- Should research-sourced rejected alternatives and revisit conditions be in the ADR, or only behind the *See* pointer?
- "Dev uses Nitro's default disk cache" comes from the amendment; I did not run a dev server to confirm it.

## 6. Lines

Old: 83. New: 93.
