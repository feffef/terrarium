# ADR-0010 rewrite report

## 1. Parts

| # | Part | Outcome | Reason | Where it went |
|---|---|---|---|---|
| 1 | Header (Date, Status) | leftover | ADR-0030 forbids history in the text | dropped |
| 2 | Amendment banner: ADR-0018 `tenants/` → `layers/` | leftover | Path rename is history; current paths live in `scripts/digest.ts` (`DIGESTS_DIR`) | dropped |
| 3 | Amendment 2026-07-08: `sync` job partly live via scheduled `digest` | leftover | The `sync`/chartered-job idea goes with ADR-0003's ledger (decisions.md) | dropped |
| 4 | Amendment 2026-07-25: aging shipped, `archive-journal-content.ts`, keep newest 7 dates | split | That old Digests may move to `archived`: live. Count and "dates that exist" rule: mechanics, `scripts/archive-journal-content.ts:40` `RETAIN_DATES = 7` and its header comment (checked) | *Scope* "Written once"; *Consequences*; *See* |
| 5 | Context: Digest is derived yet historical; fits neither Inventory nor journal entry | live | Still the reason a Digest is written once | *Why* bullet 1 |
| 6 | Decision: a page, not `data` | live | Digests still render as prose with links; only `pages` gets routes (ADR-0006) | *Scope* bullet 1; *Why* bullet 2 |
| 7 | Decision: inside `pages` under `digests/`; dedicated collection deferred | split | Sharing `pages` and the reason (routing code is Human-only): live. Exact folder path: mechanics, `scripts/digest.ts` `DIGESTS_DIR` (checked). Dedicated collection: rejected alternative + revisit | *Scope* bullet 2; *Why* bullet 3; *Rejected*; *When to revisit* |
| 8 | Decision: one immutable file per closed UTC day; attribution by commit time / `endedAt`; no page for idle days | split | Finished days only, none for idle days, written once: live. Attribution rules: mechanics, `scripts/digest.ts` `dayIsClosed`, `closedUndigestedDays`, `buildDayMaterials`, tested in `tests/unit/digest.spec.ts` (checked) | *Scope* "Which days", "Written once"; *See* |
| 9 | Decision: land via gated PR, not ADR-0009 direct-to-main | live | ADR-0009 still bounds direct-to-main to session-log data; a Digest renders | Summary; *Why*; *Rejected* |
| 10 | Decision: `digest` Skill + thin tested `scripts/digest.ts` | split | The split itself (deterministic work in tested code, prose in Skill): live. Commands: mechanics, Skill + script header (checked) | *Scope* "Script and Skill"; *Why* |
| 11 | Decision: index needs no regeneration; live dashboard | live | `index.vue` and `dashboard.ts` `digestList` read pages live (checked); the Skill step 4 says so | *Scope* bullet 1; *Rejected* "bake" |
| 12 | Decision: "chartered, still-deferred `sync` job"; Skill does not claim the `sync` name | leftover | Chartered-job idea retired (decisions.md) | dropped |
| 13 | Consequence: `pages` schema gains optional `summary` | mechanics | Moved to the `page` kind's contract in `shared/kinds.ts:58-60` (ADR-0025); checked | *See* |
| 14 | Consequence: Digests share `pages`, surfaced by path filter; dedicated collection would make them queryable | split | Path filter: mechanics, `dashboard.ts` `digestList` (checked). Queryable-apart: *When to revisit* | *See*; *When to revisit* |
| 15 | Consequence: Digests surface frictions | mechanics | What a Digest contains is the Skill's writing rules (`SKILL.md` step 3, checked) | *See* (Skill) |
| 16 | Consequence: backfill unbounded; aging by archive sweep | split | "Fill every missing finished day": live. Sweep: part 4 | *Scope* "Which days" |
| 17 | (Implicit, from `digest.ts` `ARCHIVED_DIGESTS_DIR`) archived Digests must count as existing | live (added) | Non-obvious effect of allowing moves; found live, 2026-09-06 | *Consequences* |

## 2. Callers

| # | Checklist item | Outcome | Notes |
|---|---|---|---|
| 1 | Where do digests live? | answered + mechanics | *Scope* bullet 2; folder in `scripts/digest.ts` `DIGESTS_DIR` |
| 2 | Which days get a digest? | answered + mechanics | *Scope* "Which days"; `dayIsClosed`, `closedUndigestedDays` |
| 3 | How shown on the Journal home page? (conflict) | answered; fix the caller | Side A is right: live listing, no baking (`index.vue`, `dashboard.ts`, Skill step 4). `tenant.config.ts:104-107` is stale |
| 4 | What goes in, who writes it? | answered | Summary; *Scope* "Script and Skill"; content rules stay in the Skill |
| 5 | Script vs Skill split | answered + mechanics | *Scope* "Script and Skill"; `scripts/digest.ts` |
| 6 | Changed after written? | answered | *Scope* "Written once" (policy question 1) |
| 7 | May old digests move to `archived`? | answered | *Scope* "Written once": a move changes the URL, not the text; *Consequences* |
| 8 | Own page URL? (conflict) | answered; fix the caller | Side A is right: `[...slug].vue` serves `digests/<day>` with neighbour navigation (checked). `timeline.ts:27-29` is wrong; the Timeline linking to the fragment is its own choice. ADR-0025 says the same wrong thing (section 3d) |
| 9 | Another Tenant at `/digests/<date>`? | added | Only ADR-0025 and `timeline.ts` stated it; true in code (`timeline.ts` tenant guard). *Scope* bullet 2 |
| 10 | Digest headline | mechanics | `shared/kinds.ts` (`summary`), fallback in `dashboard.ts` `digestList` |
| 11 | Where Digests sit in the Journal | answered | *Why* bullet 1; ADR-0008 owns the Journal's kinds |

## 3. Follow-ups

### 3a. Summary rule: `.claude/rules/adr-0010.md`

```markdown
---
adr: <new hash>
paths:
  - "scripts/digest.ts"
  - "scripts/archive-journal-content.ts"
  - "layers/journal/content/*/pages/digests/**"
  - ".agents/skills/digest/**"
---
# ADR-0010: A Digest is a daily Journal page, written once and landed by PR

A Digest is an ordinary page in the Journal's `pages` collection under
`digests/<date>`, one per finished UTC day with activity. Write it through the
`digest` Skill and land it by an ordinary gated PR, never straight to `main`.
Leave an existing Digest's text alone; moving it to `archived` is fine. Keep
the index free of Digest lists: the home page reads them live.

Before you change where Digests live, how they land or which days get one,
read the full ADR: docs/adr/0010-digests-derived-append-only-journal-pages.md
```

(The file name keeps the old slug for the first, 1:1 pass; renaming it is a
separate edit.)

### 3b. Caller edits

- `layers/journal/tenant.config.ts:104-107` →
  ```
      // A Digest's one-line headline (`summary`) comes from the `page` kind's
      // contract (shared/kinds.ts, ADR-0025); the Journal home page lists it
      // live (ADR-0010). Ordinary pages omit it.
  ```
- `layers/commons/app/composables/timeline.ts:27-35` →
  ```
  // Journal deep-link fragment format, owned by layers/journal/app/utils/dashboard.ts
  // (sessionAnchor/digestAnchor). Session logs have no page of their own, and the
  // Timeline opens a Digest in place on the Journal home page too, so both link to
  // `<space-landing>#<anchor>`. That coupling is this aggregator's own choice.
  // `/digests/<date>` marks a Digest only in the Journal (ADR-0010); the tenant
  // guard below treats the same path in another Tenant as an ordinary page.
  ```
- `layers/journal/CONTEXT.md:31` →
  `A daily catch-up on Platform activity across all Tenants, condensed from git history and session logs: one page per finished UTC day, kept once written (ADR-0010). Unlike an **Inventory** (derived too, but refreshed in place) it records a past day; unlike a **session log** it is derived, not first-hand. The Commons Timeline also reads Digests (`layers/commons/CONTEXT.md`), but the word is defined here.`
- `docs/agents/domain.md:53-54` → `costs every session; only a second instance proves it worth that (ADR-0010 keeps Digests in the shared `pages` collection until something needs them apart). It brakes new coinage; anything`
- `.agents/skills/digest/SKILL.md:20-24` →
  ```
  Digests land through an ordinary gated PR, never the `log-session`
  direct-to-main path (ADR-0010). You merge it yourself once the gate is green
  (step 7).
  ```
- `.agents/skills/digest/SKILL.md:168-173` → see 3c (ledger scope moves here).
- No change needed: `scripts/digest.ts:1,21,31,87,155`, `tests/unit/digest.spec.ts:1`,
  `layers/journal/app/utils/dashboard.ts:249`, `index.vue:44`, `[...slug].vue:5`,
  `scripts/archive-journal-content.ts:4`, `.claude/rules/adr-0008.md:12`,
  `docs/diagrams/interactive-map/terrarium-overview.md:865`. The five
  `tests/unit/recent-prs.spec.ts` hits are test data.

### 3c. New homes

- ADR-0003's `digest` ledger row (what a run may change) → `.agents/skills/digest/SKILL.md`,
  replacing lines 168-173:
  ```
  Then follow `docs/agents/pr-workflow.md`'s self-merge sequence. A run
  changes only Digest pages, the index's editorial intro and the archive
  sweep's moves. If anything else rode into the PR, move it to its own branch
  before you merge.
  ```
  (Recommendation: with every agent merging its own PR, "leave it open for a
  human" is a leftover of the ledger; splitting the stray change out keeps the
  scope without blocking the run. See policy question 2.)
- Nothing else leaves: attribution, folders, retention and content rules
  already live in the Skill and scripts.

### 3d. Other ADRs

- **ADR-0006** owns "only `pages` gets routes". The rewrite cites it. Agrees.
- **ADR-0009** owns direct-to-main for session logs only. Agrees. Its own
  "keep newest 7 dates" sentence (line ~99-102) repeats a mechanic; its
  rewrite should point to `archive-journal-content.ts`.
- **ADR-0008** owns the Journal's kinds; its rule already names Digests. Agrees.
- **ADR-0004** (rewrite) owns who merges. Agrees: a Digest PR touches no
  Human-only file.
- **ADR-0025** disagrees in one place: its Consequences say "Sessions and
  daily digests have no standalone page route". Digests do have one
  (`[...slug].vue`). Its rewrite should say only session logs lack a page and
  that the Timeline links Digests by fragment by choice. Its Journal-only
  reading of `/digests/` matches the rewrite.
- **ADR-0003**: its `digest` ledger row and the `sync` remark go with the
  ledger (decisions.md); scope moves to the Skill (3c).

## 4. Policy questions

1. **May a landed Digest be corrected?** The old ADR says "never rewritten",
   but git shows landed Digests corrected (e.g. `daa3a723`, `77783663`) and
   seven regenerated under new writing rules (`7b1a4d92`, 2026-09-25).
   Recommendation: the run never rewrites one (the script skips existing
   days), and a wrong fact is fixed by an ordinary PR. The rewrite says this.
   Whether wholesale regeneration needs a Trusted ask is left to the owner;
   I recommend yes, and `visitor-loop` already may not edit Digests.
2. **Out-of-scope changes in a `digest` PR.** The Skill now says leave such a
   PR for a human. Recommendation: split the stray change out and self-merge,
   as drafted in 3c. ADR-0004's exceptions still catch anything risky.

## 5. Split

74 lines, slightly over 70. No split needed; the parts are one decision.

## 6. Prompt friction

- The checklist's conflict on item 8 needed a code check to settle; the
  expectations file said "unclear which one". Reading `[...slug].vue` settled it.
- The prompt's grep for citing ADRs (`ADR-0010\|0010-`) found only ADR-0025;
  ADRs that 0010 cites (0003, 0004, 0006, 0008, 0009) come only from reading
  the target. Only 0004 and 0015 had rewrites.
- Whether "written once" allows corrections is a policy-vs-history call the
  sources don't settle; the template has no slot for "decision as practised
  differs from text".

## 7. Lines

Old: 91. New: 74.
