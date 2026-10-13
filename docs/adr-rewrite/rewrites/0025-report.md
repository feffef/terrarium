# ADR-0025 rewrite report

## 1. Parts

| # | Part | Outcome | Reason | Where it went |
|---|---|---|---|---|
| 1 | Header (Date, Status), origin note (#642, #631) | leftover | ADR-0030: no history in the text | dropped |
| 2 | Amendment 2026-09-05 (#829): `shared/schemas/` is Human-only | mechanics | Path is on `.claude/rules/adr-0004-human-merge.md` `paths` (checked: `shared/schemas/**`) | *Scope* "Who merges" names the family; list stays in the rule |
| 3 | Context: Tenants isolated, no seam for cross-Tenant views; dollhouse went around it | live (reason) | Still the reason a sanctioned read path exists | *Why* bullet 1 |
| 4 | Context blocker 1: per-Tenant inline schemas, re-declare (drift) or import manifest (coupling) | live (reason) | Still true; `kinds.ts` is the one home | *Why* bullet 2; *Rejected* "Each reader declares" |
| 5 | Context blocker 2: Nuxt Content queries one table at a time | leftover | Explains why a fan-out was built; the code shows it | dropped |
| 6 | Context: extend `expand()`, never a parallel source; rule of two; 3-part test | split | One expansion: live, owned by ADR-0002/0014 rewrites. Rule of two / ADR-worthiness: history | *Why* bullet 4 (points to ADR-0014); rest dropped |
| 7 | 1. Kinds live in one registry `shared/kinds.ts` | live + mechanics | Registry contents in `shared/kinds.ts` (checked: `page`, `session`) | Summary; *See* |
| 8 | 1. `kind` orthogonal to `type` | live | Still true (`KindDef.type`) | *Scope* "A kind is a minimum" |
| 9 | 1. Minimum contract merged with local schema; page contract fields; session whole shape; `utcTimestamp` | split | Merge rule: live (`shared/expand.ts`). Field lists and timestamp format: mechanics, `shared/kinds.ts`, `shared/schemas/timestamp.ts` (checked) | *Scope*; *Rejected* "whole schema"; *See* |
| 10 | 1. Data collection needs a schema source; checked in `validateManifest` | mechanics | `shared/manifest.ts` (checked); ADR-0002 rewrite already states it | *Scope* points to ADR-0002; *See* |
| 11 | 1. Opt-in is the point; no kind = invisible | live | Core decision; Commons manifest and e2e test enforce it | Summary; *Scope* bullet 1 |
| 12 | 2. `#catalog` module, `catalogFrom`, derived not hand-written; `.nuxt/catalog.mjs`, aliases | split | Derived from manifests: live (ADR-0014 owns the build-time rule). Wiring: mechanics, `modules/catalog.ts` (checked) | *Why* bullet 4; *See* |
| 13 | 3. `queryAcrossTenants<T>(kind, project)`, provenance, project inside fan-out | split | Single read path: live. Projection, tagging: mechanics, `app/composables/catalog.ts` (checked) | *Scope* "One read path"; *See* |
| 14 | 3. One documented cast; type-level `T` from kind a non-goal | split | Non-goal: rejected alternative. Cast: mechanics, `catalog.ts:52-54` | *Rejected* "Type each read's results" |
| 15 | 3. `queryPages()` + `documentUrl()` canonical route | live + mechanics | Real-address links are relied on (C15); function in `shared/routing.ts` | *Scope* "Links go to real addresses"; *See* |
| 16 | 3. Primitive is the generic floor; normalization in aggregator layer under normal gating | live | Still how Timeline works; keeps Human-only surface small | *Scope* "A view's own logic"; "Who merges" |
| 17 | 3. Aggregator role; ordinary Tenant layer; "Normal Tenants never read across; a small, governed set may"; several views per Aggregator Tenant | split | Ordinary layer: live (ADR-0001 rewrite states it). "Only governed Aggregators read across": **policy question 1** — contradicted by the Blog's read (commit 64a429c5, agent-merged), and nothing governs the set. Rewrite states today's practice: any layer may read through the read functions; dedicated views go in the Commons | *Scope* "Who may read across" |
| 18 | First consumer: Commons, Search and Timeline, three Timeline sources, digest fence | split | Commons as home of views: live. Sources and adapters: mechanics, `layers/commons/app/composables/timeline.ts` and `layers/commons/CONTEXT.md`. Journal-only `digests/` reading: owned by ADR-0010 rewrite | *Scope*; *See* |
| 19 | Commons pages un-kinded; future view = another Space | live | `layers/commons/tenant.config.ts:19-24`, e2e test (checked) | *Scope* "Who may read across" |
| 20 | Cons.: read-only by construction (ADR-0020 write isolation) | live | Still true; no write path exists | Summary |
| 21 | Cons.: build-time committed data only | live | Base rule is ADR-0001's | Summary (points to ADR-0001) |
| 22 | Cons.: kind is a versioned contract; fields a view reads must be in it | live (reason) | Why kinds are Human-only and why views read contract fields | *Why* bullet 5 |
| 23 | Cons.: Human-only family list | mechanics | Human-merge rule `paths` (checked all four plus `shared/schemas/**`) | *Scope* "Who merges"; ADR-0004 |
| 24 | Cons.: opt-in keeps isolation default | live | Duplicate of #11 | *Why* bullet 3 |
| 25 | Cons.: migration is additive; fields left blog/marquee/journal manifests | leftover | Migration done; history | dropped |
| 26 | Cons.: session logs are a `data` kind; schema moved to `shared/schemas/session.ts`; future shapes need not move | split | Schema home: mechanics, `shared/schemas/session.ts` (checked, used by `log-session.ts:68`). "Need not move into shared/": live as rejected alternative | *Rejected* "whole schema"; *See* |
| 27 | Cons.: sessions and digests have no page route; fragment links; Commons owns the coupling | split | Wrong for Digests (they have a page, per ADR-0010 rewrite). Live part: a result links to the item's own page, or where the owner shows it. Fragment format: mechanics, `layers/journal/app/utils/dashboard.ts:290-294` | *Scope* "Links go to real addresses" |
| 28 | Deferred: type-level kind→item linkage | live as rejected | Still not built; reason holds | *Rejected* |
| 29 | Deferred: sitemap/enumeration ambiguity | live | No sitemap exists (grep, checked); question still open | *When to revisit* |
| 30 | Deferred: query payload (`.all()` without `.select()`) | live | Still `.all()` (`catalog.ts:55`, checked) | *When to revisit* |
| 31 | Deferred: module consolidation | mechanics/other ADR | ADR-0014 rewrite holds it under *When to revisit*; one home | dropped here |
| 32 | Deferred: Tenant-identity metadata | leftover | Speculative feature note, decides nothing; manifest has no such block (checked) | dropped |

## 2. Callers

| Item | Outcome | Notes |
|---|---|---|
| C1 opt-in, hidden by default | answered | Summary; *Scope* bullet 1 |
| C2 minimum contract keeps private fields | answered | *Scope* "A kind is a minimum" |
| C3 one read path, no manifest import or roster | answered | *Scope* "One read path" |
| C4 catalog built automatically | mechanics | `modules/catalog.ts`, `shared/expand.ts` `catalogFrom`; *Why* points to ADR-0014 |
| C5 who may read across (conflict) | answered; fix the caller; **policy question 1** | Rewrite: any layer, through the read functions. `CONTEXT.md:238` is stale |
| C6 kind checks | mechanics | `shared/manifest.ts` `validateManifest`; ADR-0002 rewrite states it |
| C7 which kinds exist | mechanics | `shared/kinds.ts` |
| C8 session schema home | mechanics | `shared/schemas/session.ts`; ADR-0009 owns the session-log rules |
| C9 built content only | answered | Summary, pointing to ADR-0001 |
| C10 why Human-only | answered | *Why* bullet 5; list in human-merge rule |
| C11 read-only | answered | Summary |
| C12 views own their logic | answered | *Scope* "A view's own logic is its own" |
| C13 Commons never lists itself; new view = new Space | answered | *Scope* "Who may read across" |
| C14 why kinds and one path | answered | *Why* bullets 1-2 |
| C15 links to real addresses | answered + mechanics | *Scope*; `shared/routing.ts` `documentUrl` |
| C16 trimming, tagging, one cast | mechanics | `app/composables/catalog.ts`; type-level typing is a rejected alternative |
| C17 UTC timestamps | mechanics | `shared/schemas/timestamp.ts`; ADR-0025 does not decide it |
| Repoint `docs/adr/0004…:167,170` | fix the caller | ADR-0004 rewrite already drops the amendment (checked) |
| Repoint `docs/adr/0009…:11` | fix the caller | ADR-0009 rewrite drops the banner; says the schema lives in `shared/schemas/session.ts` |
| Repoint `app/composables/catalog.ts:44` | fix the caller | See 3b |
| Fix `terrarium-overview.md:864` | fix the caller | See 3b |
| Fix `CONTEXT.md:35, :70, :238` | fix the caller | See 3b |
| Fix Blog `[...slug].vue:49` | answered | Allowed by the rewrite; comment wording tweak in 3b |
| Fix `layers/commons/CONTEXT.md:32` | fix the caller | See 3b |

## 3. Follow-ups

### 3a. Summary rule: `.claude/rules/adr-0025.md`

```markdown
---
adr: <new hash>
paths:
  - "shared/kinds.ts"
  - "shared/schemas/**"
  - "modules/catalog.ts"
  - "app/composables/catalog.ts"
  - "layers/commons/**"
---
# ADR-0025: Reads across Tenants go through opted-in collection kinds

A Collection is readable outside its Tenant only when its manifest names a
kind from `shared/kinds.ts`; the kind's contract is a minimum, merged with the
Collection's own fields. Read across Tenants only through `queryAcrossTenants`
or `queryPages` (`app/composables/catalog.ts`). Put a new cross-Tenant view in
the Commons as a new Space, with its own logic in its layer.

Read the full ADR before you add or change a kind or the read functions:
docs/adr/0025-cross-tenant-catalog-and-collection-kinds.md
```

### 3b. Caller edits

- `app/composables/catalog.ts:44`: `one cast is the sanctioned boundary instead (ADR-0025 Consequences).` → `one cast is the sanctioned boundary instead (ADR-0025).`
- `docs/diagrams/interactive-map/terrarium-overview.md:864`: `| \`content\` | \`layers/<tenant>/content/\` | ADR-0025 |` → `| \`content\` | \`layers/<tenant>/content/\` | ADR-0001, ADR-0002 |`
- `CONTEXT.md:35`: `the one sanctioned cross-Tenant path is opt-in reads through the **Catalog** (ADR-0025).` → `Tenants read each other only through the **Catalog** (ADR-0025).` (Read `docs/agents/domain.md` before applying any glossary edit.)
- `CONTEXT.md:58-70` (Collection kind): replace the body with:
  `A named, shared shape a Collection may opt into, so code in other Tenants can read it through the **Catalog**. Its contract is a minimum, merged with the Collection's own schema. Separate from a Collection's type. A Collection with no kind stays hidden from other Tenants (ADR-0025).`
- `CONTEXT.md:236-245` (Aggregator): replace with:
  `A view whose job is to read across Tenants, such as a search or an activity feed. It reads the **Catalog**, writes nothing, and is an ordinary Tenant layer. Dedicated views live as Spaces of the Commons Tenant (ADR-0025).`
- `CONTEXT.md:227-234` (Catalog): drop "It is the second cross-Tenant derivation after `#routing`" and "Derived, never hand-written … write isolation (Trusted, below) is untouched."; end with `(ADR-0025)`.
- `layers/commons/CONTEXT.md:31-33`: → `- It reads the **Catalog** only through \`queryAcrossTenants\` (ADR-0025); the Timeline's normalization (\`queryTimeline\`) is this layer's own.`
- `layers/commons/CONTEXT.md:24-25`: `sessions and digests deep-link into the Journal dashboard.` → `sessions and digests link into the Journal home page.` (Digests have their own page; the fragment link is the Timeline's choice, per ADR-0010 rewrite.)
- `layers/commons/app/composables/timeline.ts:28-31`: `A session log and a daily digest have no standalone page route — they render on the Journal dashboard, opened by this fragment — so the Timeline links to` → `A session log has no page of its own, and the Timeline keeps Digests beside it, so both link to`.
- `layers/blog/app/pages/t/blog/[space]/[...slug].vue:48-49`: `the one cross-Tenant read the Blog makes, through the sanctioned \`queryPages\` (ADR-0025).` → `read across Tenants through \`queryPages\` (ADR-0025).`
- `shared/kinds.ts:12-15`: `like content.config.ts / shared/expand.ts / modules/* — is ADR-0004 human-only-to-merge` names `modules/*`, but only `modules/routing.ts` and `modules/catalog.ts` are on the list. → `is Human-only (ADR-0004): other Tenants depend on a kind, so changing one can break them.`
- `docs/adr/0014…` rewrite *When to revisit*: drop `(ADR-0025)` after the consolidation line; ADR-0014 is now its only home.

### 3c. New homes

None needed. Every dropped detail already lives in code or another ADR:
catalog wiring in `modules/catalog.ts`; Timeline sources in `timeline.ts` and
`layers/commons/CONTEXT.md`; the Journal-only `digests/` reading in ADR-0010's
rewrite; module consolidation in ADR-0014's rewrite.

### 3d. Other ADRs

- **ADR-0001** (rewrite): one app, built content, cross-Tenant views are
  ordinary layers, reads opt-in. Agrees.
- **ADR-0002** (rewrite): a Collection has a schema, a kind or both; one
  expansion feeds the catalog; unknown kind fails at the manifest. Agrees.
- **ADR-0004** (rewrite): the Human-only list is the rule's `paths`; it holds
  all four catalog files and `shared/schemas/**` (checked). Agrees.
- **ADR-0009** (not yet rewritten): its banner says the session schema moved to
  `shared/schemas/session.ts`. Agrees; its rewrite drops the banner and names
  the file under *See*.
- **ADR-0010** (rewrite): Digests have their own page and `digests/` means a
  Digest only in the Journal. The rewrite agrees and drops the old "digests
  have no page" claim.
- **ADR-0014** (rewrite): `#catalog` is built, never committed; it holds the
  consolidation trigger. Agrees.
- **ADR-0020**: the old text cited it for "write isolation". The rewrite only
  says the reads are read-only and needs no pointer.

## 4. Policy questions

1. **Which code may read across Tenants?** The old ADR and `CONTEXT.md:238`
   say only "a small, governed set" of Aggregators. In practice the Blog reads
   the Journal's Digests through `queryPages`
   (`layers/blog/app/pages/t/blog/[space]/[...slug].vue:48-55`), added by a
   visitor-loop run (commit 64a429c5) and merged by an agent. Nothing governs
   the set: a layer edit merges on a green gate.
   **Recommendation:** confirm what the rewrite states. Any Tenant layer may
   read across Tenants through the read functions; views whose whole job is
   cross-Tenant go in the Commons. The guarantees that matter hold whoever
   calls: reads are read-only, see only opted-in Collections, and go through
   one Human-only path. The alternative is to restore the restriction, move the
   Blog's Digest link out, and give "governed" a mechanism (such as a check
   that only `layers/commons/` imports the read functions). Note the cost the
   Blog's read carries: it relies on the Journal's `digests/<date>` path, so
   the two Tenants are now coupled by a path convention.

## 5. Split

The rewrite is 75 lines, a little over the guide. No split recommended: it is
one decision (opt-in kinds plus one read path). If one is wanted later, the
Commons as the home of cross-Tenant views could become its own ADR.

## 6. Prompt friction

- The checklist's "fix" items included the Blog read, but the prompt's caller
  note settled it as a policy question; "answered" with a comment tweak fit
  better than "fix the caller".
- Two items in step 2 (module consolidation, Digest path reading) are owned by
  other rewrites already; the outcome list has no "owned by another ADR"
  option, so I used *mechanics/other ADR* and *split*.
- Glossary edits (3b) need `docs/agents/domain.md`, which this read-only run
  did not open; flagged for whoever applies them.

## 7. Lines

Old: 242. New: 75.
