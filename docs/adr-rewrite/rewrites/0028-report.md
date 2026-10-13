# ADR-0028 rewrite report

## 1. Parts

| Part of old ADR | Outcome | Reason | Where it went |
|---|---|---|---|
| Header: Date, Status | leftover | ADR-0030 bans dates and status lines | dropped |
| Banner: green-lit by a human, after a local trial | leftover | approval history; agents may now build Trusted-approved work (ADR-0003) | dropped |
| Banner: research pointer | mechanics | the note holds the mechanism and options | *See* |
| Context: browser query downloads WASM + dumps; no Content switch | live | still the reason (`executeContentQuery`, Content 3.15.0) | *Why* |
| Context: same path is the failure path behind #236 / ADR-0019 | live | still true; ADR-0019 recovery code is live | *Why* |
| Context: owner kept client-side navigation for view transitions and state; full loads rejected (#1444) | live | owner's call, unchanged | *Why*, *Rejected alternatives* |
| Decision: `payloadExtraction: 'client'` | live (core) + mechanics | the decision itself; value in `nuxt.config.ts:17-20` | summary, *Scope*; value in *See* |
| Decision: `/t/**` cache 60 s, `swr: false`, why short and no stale serving | split: live / mechanics | "cached briefly, never serves an expired copy, bounds server-computed now" is live; 60 s / `maxAge` / `swr` values live in `nuxt.config.ts:21-24` | *Scope* bullets 1 and 4; *Rejected* (stale serving) |
| Decision: worst case about two minutes (60 s + browser `max-age`) | mechanics | derived from the values; explained in research note lines 211-223 | *Scope* states the bound without numbers |
| Decision: Nuxt merges only payload `data`, so clocks recompute on navigation | live | still true (research 220-221) | *Scope* bullet 4 |
| Amendment (#1702): `/` gets the same cache | live, folded in | `nuxt.config.ts:22`, smoke e2e test | *Scope* bullet 1 ("home page and every Tenant page") |
| Decision: Tinkerfund `varies: accept-language` (#1365) | split: live / mechanics | the rule "a page reading a header or cookie lists it in `varies`" is live; the rule itself lives in `layers/tinkerfund/nuxt.config.ts:12` | *Scope* bullet 2 |
| Decision: Tinkerfund search uncached, keeps in-browser search | live + mechanics | owner's choice; rule in `layers/tinkerfund/nuxt.config.ts:13` | *Scope* bullet 3 |
| Decision: prefetch on interaction, not visibility, with reason | live + mechanics | reason still holds (large payloads); value `nuxt.config.ts:19` | *Scope* bullet 5, *Why*, *See* |
| Measurements (494→7 KB etc.) | mechanics (evidence) | only home is the ADR today; the research note says the ADR holds them | *Why* gives the range without values; numbers move to the research note (Follow-up: new homes) |
| Consequence: browser DB still loads outside payloads; ADR-0019 recovery stays | live | `failDavidPayload` in blog e2e relies on it | *Scope* bullet 7 |
| Consequence: server caches pages in memory; safe because baked per deploy; header/cookie needs `varies` | live | ADR-0001 unchanged; Nitro proxies only `varies` headers | *Scope* bullets 1-2 |
| Consequence: cache unbounded (#1446) | leftover | overtaken by its own amendment | dropped |
| Amendment (#1446): LRU cache, cap, prod only, dev on disk, eviction only costs a re-render | split: live / mechanics | "bounded in size" is live; driver and cap in `nuxt.config.ts:26`, checked by `tests/unit/page-cache.spec.ts` (asserts 200) | *Scope* bullet 1, *See* |
| Amendment (#1702) in Consequences: applies to `/` | live, folded in | as above | *Scope* bullet 1 |
| Consequence: route code downloads on hover, tap on touch | live | still follows from `prefetchOn` | *Scope* bullet 5 |
| Consequence: revert by deleting three settings; "nothing else depends on them" | leftover | no longer true: smoke, blog and page-cache tests and the trimmed home payload depend on them | dropped |
| (implicit) Who may change it | live, owned by ADR-0004 | `nuxt.config.ts` is on the human-merge list; `layers/*/nuxt.config.ts` is not | *Scope* last bullet, as a pointer |

## 2. Callers

Checklist from `docs/adr-rewrite/expectations/0028.md`:

1. Navigation loads from `_payload.json`, not the browser DB: **answered** (summary, *Scope*).
2. When the browser DB still loads: **answered** (*Scope* bullet 7). ADR-0019:199 restates it: **fix the caller** (below).
3. Tests check it, and how: **mechanics**: `tests/e2e/smoke.spec.ts:60`, `layers/blog/tests/e2e/blog.spec.ts:126` (no WASM/dump request), `failDavidPayload` in the same file; named under *See*.
4. Cache size bound (LRU, 200): **mechanics**: `nuxt.config.ts:26`, checked by `tests/unit/page-cache.spec.ts:29`. Research:208 quotes the value and an "amendment": **fix the caller**.
5. Which pages are cached and for how long: **mechanics**: `nuxt.config.ts:21-24`; *Scope* names the pages without the lifetime. Research:163 copies the snippet: **fix the caller**.
6. A page reading a request header lists it in `varies`: **answered** (*Scope* bullet 2); mechanics in `layers/tinkerfund/nuxt.config.ts:12`, test `layers/tinkerfund/tests/e2e/tinkerfund.spec.ts:31`.
7. How stale "today"/"now" may be: **answered** (*Scope* bullet 4, bound without numbers). `app/pages/index.vue:63` points correctly.
8. Which pages skip the cache: **answered** (*Scope* bullet 3).
9. Where config lives; does the ADR restate it: **answered** (*See*: the two `nuxt.config.ts` files; the ADR holds no values). Research:31/34/163 say otherwise: **fix the caller**.
10. Prefetch on interaction: **answered** (*Scope* bullet 5) + **mechanics** `nuxt.config.ts:19`.
11. Keep payloads small; trim `useAsyncData` results: **added** (*Scope* bullet 6). True in code: `layers/tinkerfund/app/composables/browse.ts:20` transform, home timeline trim in #1702 (`app/pages/index.vue`).
12. Who merges a change here: **answered** by pointer to ADR-0004 (*Scope* last bullet). Research:376 cites ADR-0018 for `nuxt.config.ts` being human-only; ADR-0018 says no such thing: **fix the caller**.

Repoint/Fix list items not in the checklist:

- `docs/diagrams/interactive-map/terrarium-overview.md:872` (`container` row cites ADR-0028): **fix the caller**. `deploy/*` holds nothing about the page cache (grep for cache/memory/lru/payload finds nothing). Drop ADR-0028 from that row.
- `docs/diagrams/interactive-map/terrarium-overview.md:873` (`browser` row, `ContentLoadErrorDialog.vue`): **answered**; ADR-0028 explains when that dialog can still appear. Keep.
- `.claude/rules/adr-0019.md:15` "Most navigation skips the client DB (ADR-0028)": **answered**; a plain pointer. Keep.
- Code comments (`nuxt.config.ts:16,25`, `layers/tinkerfund/nuxt.config.ts:10`, `browse.ts:20`, `index.vue:63`, the tests): **answered**; all point, none quote. Keep.
- `layers/blog/tests/e2e/blog.spec.ts:12` says "(ADR-0019 amendment, 2026-07-16)" and "(ADR-0019 amendment, 2026-08-04)": out of scope for ADR-0028, but they will break when ADR-0019 is rewritten; flag to that rewrite.

## 3. Follow-ups (drafts, none applied)

### Summary rule: `.claude/rules/adr-0028.md`

Keep the `paths` as they are (both config files; `visitor-loop` and `tinkerfund-campaign` load it because visitors and campaigns meet the "now can be slightly old" effect). The `adr:` hash is re-stamped by `scripts/validate-adr-rules.ts`.

```markdown
---
adr: <re-stamp>
paths:
  - "nuxt.config.ts"
  - "layers/*/nuxt.config.ts"
  - ".agents/skills/visitor-loop/**"
  - ".agents/skills/tinkerfund-campaign/**"
---
# ADR-0028: In-app navigation reads a cached server payload, not the browser database

In-app navigation takes a page's data from its server-rendered
`_payload.json`, and only cached routes have one: `routeRules` in
`nuxt.config.ts` cache the home page and Tenant pages briefly. One rendered
copy serves every visitor, so a page whose server render reads a request
header or cookie lists it in `varies`, as Tinkerfund does. Keep `useAsyncData`
results to what the page reads: they travel in the payload. Server-computed
"today" or "now" can be slightly old on a first load.

Before you change caching, prefetch or payload settings, read the full ADR:
docs/adr/0028-navigation-reads-server-payloads.md
```

### Caller edits

- `docs/research/content-client-queries-without-wasm.md:31-35` →
  "**Status: Avenue 2a was adopted (ADR-0028, #1447).** Claims marked **(measured)** were confirmed against a production build, with Playwright and the e2e suite. Everything else comes from reading the source. The configuration lives in `nuxt.config.ts` and `layers/tinkerfund/nuxt.config.ts`; ADR-0028 holds the decision; this note keeps the reasoning, the measurements and the rejected avenues."
- `docs/research/content-client-queries-without-wasm.md:163-178` → replace the sentence and the code block with:
  "The adopted shape lives in `nuxt.config.ts` (payload extraction, interaction-only prefetch, a short no-`swr` cache on `/` and `/t/**`) and `layers/tinkerfund/nuxt.config.ts` (`varies` on locale, search uncached)."
- `docs/research/content-client-queries-without-wasm.md:208` → "deploy or restart. **Now bounded** (#1446): production uses Nitro's `lru-cache` driver, capped in `nuxt.config.ts`."
- `docs/research/content-client-queries-without-wasm.md:380-381` → "the cache needed a size bound (now `lru-cache`, #1446). `nuxt.config.ts` is on ADR-0004's human-merge list."
- `docs/adr/0019-patched-nuxt-content-client-db-loading.md:197-203` (Human-only file; ADR-0019's own rewrite may supersede this) → replace the amendment with one line in its current-state text: "Most in-app navigation skips the browser database (ADR-0028); ADR-0028 lists where it still loads. The blog e2e tests fail the payload first to reach this recovery."
- `docs/diagrams/interactive-map/terrarium-overview.md:872` → `| \`container\` | \`deploy/entrypoint.sh\`, \`deploy/Dockerfile\`, \`deploy/docker-compose.yml\` | ADR-0011 |`

### New homes

- **Byte measurements** leave the ADR. Add to `docs/research/content-client-queries-without-wasm.md`, under "What it does (measured)" (after line 185):
  "- Gzipped transfer per navigation, before → after: blog post about 494 → 7 KB; journal skills 579 → 144 KB; Tinkerfund page 578 → 19 KB; Commons Timeline about 1.85 MB → 72 KB."
- **Dev uses Nitro's default on-disk cache; eviction only costs a re-render** (from the #1446 amendment): add to the same note after line 208: "Dev keeps Nitro's default on-disk cache. Nitro checks `maxAge` on every read, so early eviction only costs a re-render."
- Nothing a Skill relied on leaves the ADR; `visitor-loop/decisions.md:15` and `tinkerfund-campaign/SKILL.md:89` do not depend on removed text.

### Other ADRs

- **ADR-0001** (content baked at build time, so a per-deploy cache is safe): agrees.
- **ADR-0019** (recovery when the browser load fails): agrees; its 2026-09-27 amendment restates ADR-0028 (edit above).
- **ADR-0004** (`nuxt.config.ts` needs a human merge): agrees; `.claude/rules/adr-0004-human-merge.md` lists `nuxt.config.ts` and not `layers/*/nuxt.config.ts`.
- **ADR-0018**: the research note cites it for `nuxt.config.ts` being human-only; ADR-0018 does not say that (edit above).

## 4. Policy questions

- **May agents change a Tenant layer's cache rules (`varies`, opt-out) and merge their own PR?** Today `layers/*/nuxt.config.ts` is not human-only, so yes; the research note implied the whole global runtime change needs a human. Recommendation: yes. A wrong `varies` is caught by e2e tests like Tinkerfund's locale test, and a Tenant's rule only touches its own pages. The rewrite states this; drop the sentence if the owner disagrees.
- No other part changes what agents may do.

## 5. Split

74 lines, slightly over 70, mostly the *Scope* list and *See* file list. No split needed: it is one decision with its necessary limits.

## 6. Prompt friction

- The template has no slot for evidence (the measurements); *Why* can give a range but not the numbers, so they need a new home even though they are not mechanics in the "enforced" sense.
- The rule that the title matches the summary rule's heading forces a rule edit even for a minor title change; fine, but worth stating in the prompt.
- "Mechanics: name the file that enforces it" fits config values well but not derived facts (the "about two minutes" bound), which no file enforces; I treated the research note as its home.
- The `writing-for-agents` Skill could not be invoked (a guard said its body was already inline, which it was not in this subagent); I read its SKILL.md directly.

## 7. Lines

Old: 83. New: 74.
