# ADR-0021 rewrite report

ADR-0021 cites ADR-0008 and ADR-0030; no ADR cites ADR-0021. Neither has a
rewrite in `rewrites/` yet, so the old texts were used. Session logs: the
ADR was never read in full in the verdict window; its rule loaded in 47/51
sessions via `CONTEXT.md`, with 0 follow-ups (session-log-usage.md:96, 152).
So the summary rule does nearly all the work.

## 1. Parts

| # | Old part | Outcome | Reason | Where it went |
|---|---|---|---|---|
| 1 | Context: flat glossary held three populations of terms | live (Why) | The cost of one flat file still explains the split | *Why* ¶1; *Rejected* bullet 1 |
| 2 | Context: speculative job names (`sync`, `consolidate`, `codify`) drifted | leftover | Sweep done (no living doc uses them, grep checked); story of a past cleanup | dropped |
| 3 | Context: a demo Tenant's reason to exist had no home | live (Why) | Still the reason Tenant contexts carry purpose | *Why* ¶2 |
| 4 | Context: the `domain-modeling` Skill ships a multi-context shape | live (Why) | Still true (`domain-modeling/SKILL.md:24`) | *Why* ¶3 |
| 5 | Decision: root `CONTEXT.md` is the Platform context, glossary only, plus `## Tenants` roster | live | Matches `CONTEXT.md:3`, `:322` | *Scope* "The root" |
| 6 | Decision: `CONTEXT-MAP.md` indexes contexts and relationships | live | Matches the file | *Scope*; *See* |
| 7 | Decision: `layers/<tenant>/CONTEXT.md` holds vocabulary and purpose; reason-to-exist is product, not architecture | live | Every Tenant file has a "Why it exists" section | Summary; *Scope* "A Tenant's" |
| 8 | "What stays vs moves" test (needed regardless of task?) | live | The rule a new term still follows | *Scope* "Where a term goes" |
| 9 | The lists of terms that stayed or moved | leftover | The move is done; the files are the record | dropped |
| 10 | Retire `sync`/`consolidate`/`codify`, drop `Spawn`, retire "Journal entry"; sweep living docs and ADRs on rewrite | split | That retired terms are recorded once in the root glossary: live. The specific terms: mechanics, home `CONTEXT.md` `## Retired terms` (checked, :352). The ADR sweep: ADR-0030's rewrites do it | *Scope* "The root" (one clause) |
| 11 | ADRs record Platform architecture only; demo Tenant gets no ADR; Journal the exception (ADR-0008) | live | Still holds. Commons (ADR-0025) is the same case, so the rewrite states the test, not a one-name exception | *Scope* "Which decisions" |
| 12 | Consequence: vocabulary sits with code | live (Why) | Reason, not effect | *Why* ¶1 |
| 13 | Consequence: pointers fine, single home forbids duplicate content | live | Also `CONTEXT-MAP.md:29` and CLAUDE.md "One home per fact"; one clause kept | *Scope* "Where a term goes" |
| 14 | Consequence: `domain.md` flips to multi-context and records divergence from the Skill template | mechanics | Home `docs/agents/domain.md:15-23` (checked) | *See* |
| 15 | Consequence: retiring the taxonomy needs no ADR; `audit-docs` backstops the sweep | leftover | Sweep finished; `audit-docs` Drift lens covers stale terms generally | dropped |
| 16 | Consequence: new Tenant adds `CONTEXT.md` + roster line; no ADR unless architecture | live | No other home states it; the summary rule gives it as an instruction | *Scope* "Adding a Tenant" |

## 2. Callers

| # | Checklist item | Outcome | Note |
|---|---|---|---|
| 1 | Words split into one Platform glossary plus one per Tenant | answered | Summary; *Scope* |
| 2 | Where each glossary file lives | mechanics | Home `scripts/shell-reads.ts:63` (`INSTRUCTION_DOC_PATTERNS`), tested by `tests/unit/shell-reads.spec.ts:30`. Path kept one level deep; named in *See* |
| 3 | Which decisions get an ADR; does the spec issue count | answered + added | Only Platform architecture; Tenant product decisions in its context. Added: a spec issue may hold detail and history, linked from the context (what Midden and Tinkerfund do). See policy question 1 |
| 4 | What may a `CONTEXT.md` hold (conflict) | answered | "Glossary only" binds the root; a Tenant context adds purpose and product decisions. `CONTEXT.md:3` gets a small clarifying edit |
| 5 | Layout of a `CONTEXT.md`, divergence from the Skill | mechanics | Home `docs/agents/domain.md`; the ADR holds only why Tenant contexts carry a purpose |
| 6 | Tenant glossaries count as agent instructions; content tree does not | answered | *Scope* "A Tenant's"; enforced in `scripts/shell-reads.ts` |
| 7 | Who reads which glossary | answered | *Why* ¶1 gives the reason; triggers stay in CLAUDE.md and `.claude/rules/tenant-layers.md` (*See*) |
| 8 | Does ADR-0021 cover all instruction files | fix the caller | It covers the domain contexts only. `terrarium-overview.md:859` cites it for `CLAUDE.md`, `docs/agents/`, `docs/adr/` too |

## 3. Follow-ups

### Summary rule: `.claude/rules/adr-0021.md`

Keep the `paths` as they are; restamp `adr:`.

```markdown
# ADR-0021: A Platform glossary plus one context per Tenant

Put a term in root `CONTEXT.md` only if every agent needs it whatever the
task; keep that file a glossary, with the Tenant list and retired terms. Put a
Tenant's own terms, why it exists and its product decisions in
`layers/<tenant>/CONTEXT.md`. Record only Platform architecture in an ADR, never
a demo Tenant's product choices. A new Tenant adds its `CONTEXT.md`, a line in
the root list and an entry in `CONTEXT-MAP.md`.

If this touches your task, read the full ADR first:
docs/adr/0021-multi-context-domain-docs.md
```

### Caller edits

- `CONTEXT-MAP.md:53` → `ADRs live in [`docs/adr/`](./docs/adr/) and record
  Platform architecture only (ADR-0021).`
- `layers/midden/CONTEXT.md:16` → `MVP spec, decision history and resolutions:
  [issue #515](…) (a Wayfinder map; sub-issues #516–#528 hold the individual
  resolutions cited by number in this file). Why it gets no ADR: ADR-0021.`
- `layers/tinkerfund/CONTEXT.md:94-97` → `- **[spec #1375](…)** — the full
  spec, linking the ticket that holds each locked decision (ADR-0021).`
- `CONTEXT.md:6-7` → `in `layers/<tenant>/CONTEXT.md`. This file is a glossary
  only: no implementation details, no specs. Challenge any usage that conflicts
  with a definition here.`
- `docs/agents/domain.md:15-16` → `This repo deliberately diverges from the
  `domain-modeling` Skill's generic templates:` (drop the ADR-0021 citation
  here; the layout lives in this file. Keep the purpose-narrative bullet,
  ending it `(ADR-0021 says why).`)
- `docs/diagrams/interactive-map/terrarium-overview.md:859` → Why column
  `ADR-0021, ADR-0029, ADR-0030` (contexts, rules and instruction docs, ADRs).
- `scripts/shell-reads.ts:63`, `tests/unit/shell-reads.spec.ts:30`: no edit;
  they cite the ADR for the path, which the rewrite keeps.

### New homes

- None required. The layout already lives in `docs/agents/domain.md`, the
  retired terms in `CONTEXT.md`, the path in `scripts/shell-reads.ts`.

### Other ADRs

- ADR-0008: the rewrite says the Journal gets an ADR because it changes how
  the Platform works. ADR-0008 agrees (Platform self-documentation). Its old
  text still uses the retired `sync`/`consolidate`/`codify` and "Journal
  entries"; its own rewrite should drop them.
- ADR-0025: the rewrite names the Commons as a Tenant with an ADR. ADR-0025
  and `layers/commons/CONTEXT.md` agree (an Aggregator, "not a demo/content
  Tenant").
- ADR-0004: the *Consequences* bullet says an ADR change waits for a human
  merge. Agrees: `docs/adr/**` is in the human-merge rule's `paths`.
- ADR-0030: owns the ADR format and the retired-term sweep of ADRs; the
  rewrite no longer states either.

## 4. Policy questions

1. **Does a Tenant's spec issue count as a home for its product decisions?**
   Midden and Tinkerfund say decisions live "there and in this file", two
   homes. Recommendation: the Tenant's `CONTEXT.md` states decisions as they
   stand; the issue holds detail and history, linked. That matches ADR-0030's
   split of decision vs history. The rewrite follows this.
2. **Should a demo Tenant's product decisions be agent-mergeable?** Today they
   are (no `layers/*/CONTEXT.md` in the human-merge list), while the same
   decision in an ADR would need a human. Recommendation: keep as is; demo
   Tenants are the low-risk part of the repo. Recorded as a *Consequence* so
   the owner sees it.

## 5. Split

Not needed: 69 lines.

## 6. Prompt friction

- The grep in step 1 (`ADR-0021\|0021-` on `docs/adr/*`) finds nothing, as no
  ADR cites 0021; the ADRs 0021 itself cites (0008, 0030) had to be found by
  reading. Say "and every ADR it cites" separately.
- No rewrites exist yet for the related ADRs, so step 1's "state their facts
  as they do" fell back to old texts.
- The template has no place for "who reads what" when that is the core reason
  but the trigger lives elsewhere; it went into *Why*.
- `CONTEXT.md` as the glossary to read the sources is itself the subject of
  this ADR, which is fine but slightly circular.

## 7. Lines

Old: 90. New: 69.
