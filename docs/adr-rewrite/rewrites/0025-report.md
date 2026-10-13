# ADR-0025 rewrite report

Rewrite: `rewrites/0025.md`. Source: `docs/adr/0025-cross-tenant-catalog-and-collection-kinds.md`
(one formal amendment, 2026-09-05 / #829, plus a preamble note). Amendments
from other ADRs: 0025 itself amends ADR-0004 (Human-only list) and ADR-0009
(session schema location); both are carried as current facts, not amendments.

## 1. Inventory (current rule → rewrite section)

| # | Rule today | Source | Rewrite |
|---|---|---|---|
| 1 | Collection with no kind is invisible to Aggregators; isolation is the default, exposure is explicit per Collection | Decision §1 "Opt-in", Cons. "Opt-in keeps isolation" | Scope: Opt-in per Collection |
| 2 | Opt in via `kind:` in the manifest Collection entry | §1 | Scope: Opt-in |
| 3 | `shared/kinds.ts` (`KINDS`) is the single home for every kind | §1 | Scope: One registry |
| 4 | Kind is orthogonal to `type` (build/route vs cross-Tenant contract + opt-in) | §1 | Scope: One registry |
| 5 | Every kind has a minimum contract; effective schema = contract merged with local schema, page and data alike; no private fields lost | §1 | Scope: Minimum contract |
| 6 | Contract size is a matter of degree (page: optional `publishedAt`/`summary`; session: whole shape), one mechanism | §1 | Scope: Minimum contract (field names → See `shared/kinds.ts`) |
| 7 | `utcTimestamp` single-homed in `shared/schemas/timestamp.ts` | §1 | See (`shared/schemas/`) |
| 8 | Fields a view reads are in the contract, not per-Tenant conventions read by cast | Cons. "versioned contract" | Scope: Fields a view reads; Why |
| 9 | Manifest validator rejects unknown kind, kind/type mismatch, data Collection without schema or kind; fails at the authoring surface (ADR-0002) | §1 | Scope: Manifest checks (verified in `shared/manifest.ts`) |
| 10 | Session schema lives in `shared/schemas/session.ts` as the `session` kind; Journal references it; `log-session.ts` uses the same object | Cons. "Session logs first-class data kind"; ADR-0009 amendment | Scope: shape moves only when truly shared |
| 11 | Relocation to `shared/` is a choice; a Tenant shape others want need not move | same | Scope: same bullet |
| 12 | `#catalog` derived in `modules/catalog.ts` from `expand(loadManifests())`; never hand-written; Tenants appear/drop automatically | §2 | Scope: The Catalog is derived |
| 13 | `queryAcrossTenants<T>(kind, project)` is the sole sanctioned read primitive; generic over any kind; projects inside the fan-out; stamps provenance | §3 | Scope: One read primitive |
| 14 | One documented cast per consumer (at the projector) | §3 | Scope: One read primitive |
| 15 | Type-level kind→row derivation is a non-goal | §3, Deferred #1 | Rejected alternatives; When to revisit |
| 16 | `queryPages()` + `documentUrl()` single-home the page projection and URL for Search and Timeline | §3 | See (`app/composables/catalog.ts`) |
| 17 | Read-only by construction | Cons. | Scope: Read-only, baked content only |
| 18 | Build-time committed data only (ADR-0001) | Cons. | Scope: Read-only, baked content only |
| 19 | Aggregator = ordinary Tenant layer that reads the Catalog; ordinary Tenants never read across; small governed set | §3 | Scope: Aggregators are few |
| 20 | One Aggregator Tenant hosts several views, one per Space; a new view is another Space in the Commons | §3, First consumer | Scope: Aggregators are few |
| 21 | Normalization policy lives in the Aggregator's layer, merges as a normal layer edit; only widening the primitive is Human-only | §3 | Scope: Normalization; Why |
| 22 | The Aggregator owns any coupling it chooses (Journal anchor format, digest path), citing the source | First consumer, Cons. "Non-page content deep-links" | Scope: Normalization (general form); specifics → See Commons |
| 23 | Human-only: `shared/kinds.ts`, `shared/schemas/`, `modules/catalog.ts`, `app/composables/catalog.ts`, alongside `content.config.ts`, `shared/expand.ts`, `modules/routing.ts`, `shared/routing.ts`; Aggregator layer outside | Cons. + 2026-09-05 amendment | Scope: Human-only |
| 24 | `shared/schemas/` is Human-only because it supplies kind contracts | 2026-09-05 amendment | Scope: Human-only |
| 25 | A kind is a versioned contract; widening or removing is a breaking change | Cons. | Scope: A kind is a versioned contract |
| 26 | `kind: 'page'` conflates aggregatable with publicly enumerable; decide before building a sitemap | Deferred #2 | Scope: `page` means aggregatable; When to revisit |
| 27 | Commons is the first Aggregator; its own pages are unkinded so it never surfaces itself | First consumer | Scope: The Commons |
| 28 | Fetch-then-project payload is fine at today's scale; add `.select` or a baked index when the corpus grows | Deferred #3 | When to revisit |
| 29 | Fold `content.config.ts`, `modules/routing.ts`, `modules/catalog.ts` into one derived-data module next time one is touched, before a fourth derivation | Deferred #4 | When to revisit |
| 30 | Tenant-identity metadata (display name, tagline) via an optional manifest block, only when a view needs it | Deferred #5 | When to revisit |
| 31 | A new kind is one `KINDS` entry; `expand()`, catalog module and primitive unchanged | Cons. "Migration is additive" | Consequences |

## 2. Dropped

- **History:** Date/Status lines; the preamble on #642/#631 provenance; the
  "Amended (2026-09-05)" banner (its content is row 23–24); the rule-of-two /
  three-part-test narration (kept as one Why sentence); "Migration is
  additive" story (`publishedAt` leaving blog/marquee manifests, `summary`
  leaving the Journal's, "no existing content changed"); "the session read now
  goes through it, no private per-kind adapter remains"; "the session kind
  proves it"; "schema-relocation path taken" as narration;
  "behaviour-neutral, every test stays green".
- **No longer true / stale wording:** "a PR touching them never auto-merges"
  → "need a human merge" (post 10-10 self-merge reversal; the survey flags
  this). "Write isolation (ADR-0020)" dropped as a cite: ADR-0020 is trust
  tiers, not write isolation; kept the fact "never write". The ADR's list of
  Tenants with `kind: 'page'` was incomplete (Atlas and Midden also opt in);
  the rewrite names no Tenants.
- **Mechanics moved to See (pointer only):**
  - Code sample of a manifest entry → `shared/manifest.ts` and any
    `layers/*/tenant.config.ts` (already there).
  - `.nuxt/catalog.mjs` + `.d.ts`, `addTypeTemplate`, alias in
    `tsconfig.node.json`, no `vitest.config.ts` alias → `modules/catalog.ts`
    comments (already there). Note: ADR-0014's rule says "mirror every `#`
    alias in `vitest.config.ts`"; `#catalog` deliberately is not. That
    exception should live as a comment in `vitest.config.ts` or the ADR-0014
    rule, not in ADR-0025.
  - `catalogByKind` return shape → `modules/catalog.ts`.
  - `Promise.all` fan-out detail → `app/composables/catalog.ts` (already).
  - `queryPages` / `documentUrl` → `app/composables/catalog.ts`,
    `shared/routing.ts` (already).
  - Search and Timeline details, the three Timeline sources, the
    `tenant === 'journal'` digest fence, `session-`/`digest-` anchor scheme,
    `layers/journal/app/utils/dashboard.ts` → `layers/commons/CONTEXT.md`
    (partly there: sources and deep-linking are; the digest fence is only in
    `timeline.ts`'s comment, which is fine) and `timeline.ts`.
- **Deferred follow-ups** became *When to revisit* items. The survey suggests
  filing them as issues instead; that is a separate decision (see Open
  questions).

## 3. Rule check (`.claude/rules/adr-0025.md`)

| Rule fact | Rewrite |
|---|---|
| Cross-Tenant reads are opt-in per Collection | Summary; Scope: Opt-in |
| Opt in by naming a kind from `shared/kinds.ts` | Scope: Opt-in, One registry |
| Schema = kind's contract merged with own fields | Scope: Minimum contract |
| `modules/catalog.ts` derives `#catalog` | Scope: The Catalog is derived |
| Aggregators (the Commons) read only through `queryAcrossTenants` (`app/composables/catalog.ts`) | Scope: One read primitive; The Commons |
| Adapters stay in their own layer | Scope: Normalization |

Nothing in the rule is missing from the rewrite; no drift. The rule's
`paths` include `layers/commons/**`, consistent with the Commons bullet. The
rule omits the Human-only point, which the ADR-0004 human-merge rule covers.

## 4. Format friction

- **Scope and limits got long (15 bullets).** This ADR is mostly mechanism
  boundaries; nearly every row is a limit, not reasoning. The template has no
  place to group "what the thing is" (kind, Catalog, primitive, Aggregator)
  apart from "edges" (sitemap, Commons self-exclusion, validator). I used
  bold lead-ins as an informal grouping; a sub-split would help.
- **Deferred follow-ups have no clean home.** They are neither limits nor
  rejected alternatives. *When to revisit* fits "revisit when X" items
  (payload, identity metadata), but "fold the modules before a fourth
  derivation" is a standing instruction, and the sitemap item is a limit that
  forbids nothing yet requires a decision first. I put the sitemap in both
  Scope (the limit) and Revisit (the trigger) — a small duplication I could
  not avoid without losing one or the other.
- **Rejected alternatives vs the problem statement.** The rejected options
  (re-declare, import manifests, dollhouse) are really the old Context's
  "blockers". Writing them in both Why and Rejected alternatives risks
  repetition; I kept Why to the gap and the chosen principle, and put the
  options' faults only in Rejected alternatives.
- **Human-only list single home.** ADR-0030 says the ADR is the single
  source, but the canonical Human-only list is the `paths` of
  `adr-0004-human-merge.md`. Listing files here duplicates it; omitting them
  loses the decision ("these files are isolation-critical, the Aggregator
  layer is not"). I kept the list because the *why* for each is this ADR's.
- **Consequences is nearly empty** once non-obvious-and-still-true is applied
  strictly: most old Consequences were limits (moved to Scope) or history.
- **Commons specifics** sit at the ADR-0021 boundary (Platform ADR vs Tenant
  context). I kept only the Commons fact that demonstrates the isolation
  default; the template doesn't say whether a "first consumer" belongs.

## 5. Open questions

1. Should the five deferred follow-ups become issues (survey's suggestion)
   and leave *When to revisit*, or stay as revisit triggers?
2. The type-level derivation trigger: the source says only "until it earns
   itself"; I phrased it as "a cast at the projector causes real bugs". Is
   that the intended bar?
3. Should `#catalog`'s missing `vitest.config.ts` alias be recorded as an
   exception in ADR-0014's rule, which currently says "mirror every `#`
   alias"?
4. The old text cited ADR-0020 for "write isolation"; confirm dropping that
   cite is right (ADR-0020 is about trust tiers).

## 6. Lines

Old: 242. New: 127.
