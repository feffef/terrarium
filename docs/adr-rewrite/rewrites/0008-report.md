# ADR-0008 rewrite report

## 1. Parts

| Part of old ADR | Outcome | Reason | Where it went |
|---|---|---|---|
| Context: "living-documentation / status report", derived by `sync` (ADR-0003) | leftover | Story of the old framing; `sync` is a retired term (CONTEXT.md, ADR-0021) | Dropped; the idea survives as a rejected alternative |
| Context: the valuable content is first-hand session self-reports; "status mislabels a logbook" | live | Still the reason the Journal exists (layers/journal/CONTEXT.md "Why it exists") | Why, bullets 1–2; title |
| Decision: name the Tenant `journal`, retire "Living Documentation" | live (name) / leftover (retiring the term) | Name stands; the glossary rename is done | Summary; Consequences (name in keys and routes) |
| Decision: two content kinds, Inventories and journal entries | live, split | Inventories and session logs both exist. "Journal entry" is a retired term (CONTEXT.md Retired terms) | Scope, as three kinds with Digests added (ADR-0010) |
| Decision: journal entries include research and ideas (forthcoming) | leftover | Research is written to `docs/research/` by the `research` Skill; ideas became an optional field of the session log (CONTEXT.md "Idea") | Dropped |
| Decision: honest self-reports mined by `consolidate`, `codify` | live, reworded | The mining is live; job names are retired. Now `audit-docs`, `audit-skills`, `frictions-to-fixes` | Why, bullet 1 ("the self-improvement Skills") |
| Decision: slug, keys `journal_<space>_<collection>`, routes `/t/journal/…` follow the name | mechanics | Built from the manifest by `shared/expand.ts` (ADR-0002, ADR-0013) | See: `layers/journal/tenant.config.ts` |
| Decision: Spaces stay `current` / `archived` | mechanics | `layers/journal/tenant.config.ts:97` | See |
| Decision: `sessions` schema, `log-session`, commit question deferred | leftover | Settled since by ADR-0009 and ADR-0025 (`shared/schemas/session.ts`) | Scope points to ADR-0009 |
| Consequence: glossary entry becomes Journal; old ADRs keep "living-documentation" wording | leftover | Done; ADR-0030 now rewrites old ADRs | Dropped |
| Consequence: "derived from repo ground truth" (ADR-0003) is no longer the whole story; authored vs derived maps onto entries vs Inventories | live, reworded | The split still tells agents what to keep vs refresh (CONTEXT.md "Agent Authorship") | Why, bullet 3 |
| Consequence: not all content can be regenerated; session logs are ground truth | live | CONTEXT.md "Session" says the same; ADR-0009 depends on it | Scope ("source of truth"); Consequences |
| Consequence: rename touches keys and routes; stickier once external links exist | live | External links now exist (README.md links `/t/journal/current`) | Consequences |
| Old summary rule: Platform infrastructure, not a demo Tenant | live | ADR-0021 relies on it | Summary; Scope bullet 1 |

## 2. Callers

From `docs/adr-rewrite/expectations/0008.md`:

1. Journal is part of the Platform, not a demo Tenant, and the only Tenant
   whose reason is in an ADR: **answered** for the first half (Scope bullet 1).
   The "only" half is no longer true: the Commons is also not a demo Tenant
   and its reason is ADR-0025's (`layers/commons/CONTEXT.md:8–10`). The
   rewrite does not claim "only". **Fix the caller:** ADR-0021:65–69 (below).
2. Why the Journal exists and can't be dropped: **answered** (Why).
3. Renamed from "status" because it is a logbook; status dashboard dropped:
   **answered** (Why bullet 2, rejected alternative 1). The Midden entry keeps
   its text and its `ADR-0008` string (midden.spec.ts:109); no edit.
4. Two content kinds, Inventories and journal entries: **answered** as three
   kinds. **Fix the caller:** ADR-0010:28–30.
5. Where "Inventory" is defined: **mechanics**, home root `CONTEXT.md`
   ("Skill Inventory" entry). The 0015 rewrite already drops the miscite at
   old ADR-0015:153; nothing more to do once that lands.
6. Every session gets one honest session log: **answered** (Scope); the
   how is ADR-0009's. **Fix the caller:** ADR-0009:24.
7. Shown at `/t/journal/current`, holds logs, inventories, digests:
   **answered** (contents) / **mechanics** (route, from the manifest). CONTEXT.md:330
   stays as is.
8. Which files implement the Journal: **fix the caller**.
   `scripts/archive-journal-content.ts` is ADR-0010's archive sweep (and
   ADR-0009's for session logs), not ADR-0008's.

## 3. Follow-ups (drafts, not applied)

### Summary rule: `.claude/rules/adr-0008.md`

The rule fired in 43 of 51 sessions, mostly rated "not useful", because any
read under `layers/journal/**` (session logs included) loads it. Narrow its
`paths` to the files where the Journal's design is decided.

```markdown
---
adr: <new hash>
paths:
  - "layers/journal/tenant.config.ts"
  - "layers/journal/CONTEXT.md"
  - "layers/journal/app/**"
---
# ADR-0008: The Journal is the Platform's logbook, not a status report

The Journal is Platform infrastructure, not a demo Tenant. Treat its session
logs as the source of truth: keep them and never regenerate them from repo
state. Refresh Inventories (the Skill Inventory, the Friction Ledger) in place.
Before you change what the Journal holds or how it treats either kind, read
docs/adr/0008-self-documentation-tenant-is-a-journal.md.
```

### Caller edits

- `docs/adr/0021-multi-context-domain-docs.md:65–69` → "The existence and
  reason-to-exist of a demo/content Tenant (Blog, Atlas, and future ones) is
  not architecture and gets no ADR. A Tenant that is Platform infrastructure
  gets one: the Journal (ADR-0008) and the Commons (ADR-0025)." (Better done
  in ADR-0021's own rewrite.)
- `docs/adr/0010-digests-derived-append-only-journal-pages.md:28–31` → "The
  Journal holds session logs and Inventories (ADR-0008). A new need fits
  neither: a short, human-facing daily catch-up …" (keep the rest of the
  sentence).
- `docs/adr/0009-session-logs-commit-directly-to-main.md:24–25` → "Each
  session writes one honest session log to the Journal (ADR-0008): its goal,
  outcome, …" (drops "introduces" and "issue #2").
- `docs/diagrams/interactive-map/terrarium-overview.md:865` → `| journal |
  scripts/archive-journal-content.ts | ADR-0009, ADR-0010 |`.
- `layers/journal/CONTEXT.md:8–9`: no change needed.
- `CONTEXT.md:330–332`: no change needed.

### New homes

None. Every dropped part is either done or already held by ADR-0009,
ADR-0010, `CONTEXT.md` or the manifest.

### Other ADRs

- ADR-0009 owns how session logs are written, landed and kept append-only.
  The rewrite only points to it. Agrees.
- ADR-0010 owns Digests as derived, append-only daily pages. The rewrite
  states only that. Agrees.
- ADR-0021 says ADRs record only Platform architecture and the Journal is the
  exception. Agrees on the Journal; its "the one exception" is stale (Commons,
  ADR-0025).
- ADR-0015 (rewrite) states the Skill Inventory is refreshed from evidence by
  `audit-skills`. Agrees with "refreshed in place".

## 4. Policy questions

None. Every part either still holds or was overtaken. The rule's `paths`
narrowing above is a scoping recommendation, not a change to what agents may
do.

## 5. Split

Not needed; the rewrite is under 70 lines.

## 6. Prompt friction

- The checklist's item 1 bundles a live claim with a stale one ("only Tenant
  with an ADR"); the outcome list has no slot for "half answered, half false",
  so I split it in the text.
- Item 5 was already fixed by another rewrite (0015); the outcomes don't name
  "fixed elsewhere", so I filed it as mechanics.
- Old ADR-0008 is a rename record more than a decision; finding a live
  decision meant leaning on the old summary rule and `layers/journal/CONTEXT.md`
  rather than the ADR text.

## 7. Lines

Old: 53. New: 55.
