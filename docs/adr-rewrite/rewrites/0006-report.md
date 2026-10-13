# ADR-0006 rewrite report

## 1. Parts

| # | Old part | Outcome | Reason | Where it went |
|---|---|---|---|---|
| 1 | Heading, Date, Status line | leftover | ADR-0030: no dates or status lines | dropped; new title states the decision |
| 2 | ADR-0014 amendment banner (map is now `#routing`, built by `modules/routing.ts`; e2e derives entry routes via `entryRoutesFrom`) | split | The banner itself is history (ADR-0030). The facts are mechanics: `modules/routing.ts` builds the map (checked), `shared/expand.ts:166` `entryRoutesFrom` (checked) | *See* |
| 3 | Context: ADR-0001 leaves the routing mechanism open (subdomain / path / header) | split | That ADR-0001 bakes content and tables per Space: owned by ADR-0001, cited once in *Why*. The open choice is now answered | *Why* ¶2; *Rejected alternatives* |
| 4 | Context: must be trivial to develop against, crawlable by the smoke test, no DNS/host config | live | Still the reasons the path prefix wins | *Why* ¶1 |
| 5 | Decision: route by path prefix `/t/<tenant>/<space>/<slug>` ("for now") | live | Core decision; every route in the repo uses it. "For now" is the caution of when it was written; the revisit condition carries it | Summary; *Scope* "The URL" |
| 6 | Decision bullet 1: one catch-all page reads tenant/space, looks up `shared/routing.generated.ts`, resolves to `<tenant>_<space>_pages`, `queryCollection(key).path(slug)`, `<ContentRenderer>` | split | One shared resolver for every Space page: live, and wider today (layer pages under `[space]/` too, all via `useSpace`; checked all 7 Tenants, Tinkerfund through `useTinkerfundSpace` → `useSpace`). The generated file: leftover (ADR-0014 removed it). Key format, query and render calls: mechanics in `shared/manifest.ts` `collectionKey`, the catch-all page | *Scope* "One resolver"; *See* |
| 7 | Decision bullet 2: path is Space-relative (`prefix: '/'`), so two Spaces can both have `/about`; isolation follows from resolving to the right key; a query sees one Space's table | live (+ mechanics) | Still the isolation argument; `resolveSpaceRoute` reads only `map[tenant][space]` (checked, with `Object.hasOwn` guards). `prefix: '/'` is mechanics in `shared/expand.ts`/`content.config.ts` | *Scope* "The URL", "One resolver"; *Why* ¶2 |
| 8 | Decision bullet 3: unknown Tenant/Space → 404 | live (+ mechanics) | `resolveSpaceRoute` returns null, `useSpace` throws 404 (checked) | *Scope* "One resolver"; *See* |
| 9 | Decision bullet 3: derived entry-route list drives the smoke test, so new Spaces are covered | live | Non-obvious effect a Tenant author relies on; `entryRoutesFrom` (checked) | *Consequences* |
| 10 | Consequence: simplest thing, no wildcard DNS or host parsing, works on localhost | live | Same reason as part 4 | *Why* ¶1 |
| 11 | Consequence: subdomain and header routing stay open; can be layered on without changing isolation | split | The options: *Rejected alternatives*. "Without changing isolation": *When to revisit* | both |
| 12 | Consequence: resolver is isolation-critical, so human-only under ADR-0004 | live, owned elsewhere | ADR-0004 (rewrite) owns it: "a human merges a PR that adds logic that decides which Tenant's data a request can reach", and `shared/routing.ts` is on the human-merge rule's `paths` (checked). Stated in one line with a pointer | *Scope* "Changing the resolver" |
| 13 | Consequence: path-prefix URLs less pretty; revisit when a Tenant needs its own apex domain | live | The one revisit condition the source gives | *When to revisit*; *Rejected alternatives* (subdomains "prettier") |
| 14 | Summary rule only: only `pages` gets routes; other Collections are data | added | Not in the ADR text, but the resolver enforces it (`shared/routing.ts:99-106`, checked) and 6 callers rely on it | *Scope* "Only `pages` is routed" |
| 15 | Summary rule only: Tenant layer pages resolve through `useSpace` too | added | True in code (16 layer pages call `useSpace`/`resolveSpaceRoute`; Tinkerfund via its wrapper) | *Scope* "One resolver" |

## 2. Callers

| # | Checklist item | Outcome |
|---|---|---|
| 1 | A request reaches one Tenant's one Space; a resolved route never names another's | answered (*Scope* "One resolver", "A page reads only its own Space"). Fix the caller `shared/routing.ts:93-94`, which quotes the ADR |
| 2 | URL is `/t/<tenant>/<space>/<path>`, keyed by Tenant name, nothing after the Space at its root | mechanics: `shared/routing.ts` `documentUrl`. Name = folder is ADR-0002's (its rule: "`name` matches its folder"), so the ADR does not repeat it |
| 3 | Each Space has one routed Collection; the others have no URL and are read alongside | added (*Scope* "Only `pages` is routed") |
| 4 | That Collection must be named `pages`; no `pages` → no route | answered by *Scope* (the name); the null result is mechanics in `resolveSpaceRoute` |
| 5 | Must a human merge resolver changes, and which ADR says so? | answered: ADR-0004 owns it; this ADR points there. Fix the callers `tests/unit/routing.spec.ts:3` and ADR-0012:15 |
| 6 | Tenant pages outside Spaces; are they outside the map and smoke list? | answered: ADR-0016 owns them; *Scope* and *Consequences* point there. Fix the caller `layers/midden/app/pages/t/midden/index.vue:3` |
| 7 | Unknown Tenant, Space or path → 404 | answered for Tenant/Space (*Scope*). Unknown path: mechanics, catch-all page `setResponseStatus(404)` |
| 8 | URL comes from the file path, so moving a file changes the URL; must published URLs stay fixed? | split: the fact is answered (*Scope* "The URL"); whether URLs must stay fixed is policy question 1 |
| 9 | Path starts with `/`, no trailing `/`, `/` at root; catch-all needs Tenant and Space | mechanics: `shared/routing.ts` `slugToPath`, `ResolvedRoute.path`; `app/pages/t/[tenant]/[space]/[...slug].vue` |
| - | Unclear: `dataCollections` (ADR-0012:46) vs `collections` (`shared/routing.ts`) | fix the caller: ADR-0012:46 names a field that does not exist |
| - | `docs/agents/domain.md:62` quotes the old title | fix the caller (example sentence) |
| - | `docs/agents/domain.md:64-67` "pages-only routing" | keep; the phrase points at a decision the rewrite states. Small reword below |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0006.md`

```markdown
---
adr: <new hash>
paths:
  - "shared/routing.ts"
  - "app/composables/space.ts"
  - "app/pages/t/**"
  - "layers/*/app/pages/t/**"
---
# ADR-0006: Requests reach one Space by the path prefix `/t/<tenant>/<space>`

A Space's pages live at `/t/<tenant>/<space>/<path>`. Only a Space's `pages`
Collection gets URLs; give other Collections no route of their own and show
them through its pages. Resolve every page inside a Space through `useSpace`,
which calls `resolveSpaceRoute` (`shared/routing.ts`): it reads one Space's
keys and returns a 404 for an unknown one. Build URLs with `documentUrl`.

Read the full ADR before you change the URL scheme or the resolver, or add a
Collection that seems to need its own URL:
docs/adr/0006-runtime-routing-path-prefix.md
```

The file keeps its path, so `docs/adr/0006-…` links stay valid.

### Caller edits

- `shared/routing.ts:92-95`: "but ADR-0006's isolation guarantee ("a resolved
  route can never name another Tenant's or Space's collections") shouldn't rest
  on that being an accident …" → "but the isolation guarantee (ADR-0006)
  shouldn't rest on that being an accident …". (Human-only file: a human
  merges this PR anyway.)
- `tests/unit/routing.spec.ts:3`: "(shared/routing.ts, human-only surface,
  ADR-0006)" → "(shared/routing.ts, ADR-0006; human-only, ADR-0004)".
- `layers/midden/app/pages/t/midden/index.vue:3`: "A real Tenant-root layer
  route (ADR-0006)." → "A Tenant-root layer route (ADR-0016)."
- `docs/agents/domain.md:62`: "_Contradicts ADR-0006 (runtime routing by path
  prefix) — …_" → "_Contradicts ADR-0006 (requests reach one Space by path
  prefix) — …_".
- `docs/agents/domain.md:66-67`: "violates ADR-0006's pages-only routing" →
  "breaks ADR-0006: only a Space's `pages` Collection has URLs".
- `docs/adr/0012-…:15` (old-shape ADR, in-place fix): "that resolver is
  human-only surface (ADR-0006)" → "that resolver is Human-only (ADR-0004)".
- `docs/adr/0012-…:46`: "`pingbacks` rides along as one of its
  `dataCollections`" → "`pingbacks` rides along in its `collections`".
- No edit: `SECURITY.md:21`, `app/composables/catalog.ts:74`,
  `layers/commons/app/composables/timeline.ts:19`, `app/pages/index.vue:83`,
  the four `tenant.config.ts` comments, `layers/commons/CONTEXT.md:34`,
  `layers/midden/CONTEXT.md:74`, `.agents/skills/audit-docs/SKILL.md:97`,
  ADR-0016:13/:33, ADR-0018:72. Each states one fact and points; all agree
  with the rewrite.
- `app/pages/t/[tenant]/[space]/[...slug].vue:2` cites ADR-0001 for runtime
  routing; optional: "(ADR-0001)" → "(ADR-0006)".

### New homes

None needed. The dropped details (generated-file path, key format, query and
render calls, `prefix: '/'`) already live in code: `modules/routing.ts`,
`shared/manifest.ts`, `shared/expand.ts`, the catch-all page.

### Other ADRs

| Fact the rewrite states | Owner | Agrees? |
|---|---|---|
| Resolver changes need a human merge | ADR-0004 (rewrite: logic deciding which Tenant's data a request reaches; routing code on the Human-only list) | yes |
| One table per Collection, all baked at build time | ADR-0001 | yes |
| Routing map built from manifests at build time as `#routing` | ADR-0014 | yes; its text still says `tenants/` and has banners, for its own rewrite |
| Tenant root pages sit outside the map and smoke list, read Space data via `resolveSpaceRoute` | ADR-0016 | yes |
| Cross-Tenant reads are opt-in through the catalog | ADR-0025 | yes |
| Pingbacks are authored into the target Space, not read across Spaces | ADR-0012 | yes; two stale lines above |

## 4. Policy questions

1. **Must a published URL stay fixed?** A `pages` file's path is its URL, so a
   move breaks links. `audit-docs` escalates such moves; ADR-0018:72 speaks of
   "immutable blog links". No ADR decides it. Recommend: keep it out of this
   ADR. The rewrite states the fact (moving changes the URL); each Skill that
   moves files decides whether to escalate. Decide otherwise only if broken
   links become a real problem, and then add redirects rather than a ban.

## 5. Split

Not needed: 67 lines, one decision.

## 6. Prompt friction

- Two live parts (only `pages` is routed; layer pages resolve through
  `useSpace` too) lived only in the summary rule and code, not the ADR. Step 2
  only covers the ADR's parts, so I added them as rows 14-15 with "added".
- The header-routing rejection: the source lists it only as "an open option".
  Its reason (plain links and crawlers can't set a header) is inferred from the
  source's "crawlable by the smoke gate" requirement, not stated by it.
- The rejection of "other Collections get their own URLs" has no stated reason
  in the sources beyond issue #573's "looks natural but violates" note; the
  reason given (keeps the scheme and resolver simple) is my reading of the
  code. The owner may prefer "the owner's call".
- The expectations note says ADR-0006's summary rule was not in that agent's
  context; the rule held parts the ADR lacked, which the checklist then
  flagged as "unclear" or "added".

## 7. Lines

Old: 52. New: 67.
