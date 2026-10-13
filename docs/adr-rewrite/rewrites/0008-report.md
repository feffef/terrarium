# ADR-0008 rewrite report

## 1. Inventory (current rules → rewrite section)

| # | Current rule | Source | Rewrite |
|---|---|---|---|
| 1 | The `journal` Tenant is how the Platform documents itself | Context ¶1, Decision ¶1 | Summary |
| 2 | It is Platform infrastructure, not a demo Tenant; hence the one Tenant with an ADR | ADR-0021 Decision (boundary), rule, CONTEXT.md roster | Summary; Scope bullet 1 |
| 3 | Inventories: derived current-state readouts refreshed in place (Skill Inventory, Friction Ledger) | Decision bullet 1, updated (Friction Ledger from CONTEXT.md; `sync` retired) | Scope |
| 4 | Session logs: primary, append-only, agent-authored, honest | Decision bullet 2 + ¶2, updated ("Journal entry" retired, ADR-0021) | Scope (mechanics → ADR-0009) |
| 5 | Digests: third kind, derived append-only | ADR-0010 (added after 0008) | Scope (pointer to ADR-0010) |
| 6 | Session logs are ground truth; not all content can be regenerated | Consequences bullet 3 | Scope bullet 3 |
| 7 | Self-improvement Skills mine session-log Frictions | Decision ¶2, updated (`consolidate`/`codify` retired) | Why |
| 8 | Authored vs derived maps onto logs vs Inventories | Consequences bullet 2 | Consequences (Digests added on the derived side) |
| 9 | Name baked into keys and routes; renaming is sticky once links exist | Decision ¶2, Consequences bullet 4 | Consequences |
| 10 | Spaces are `current` / `archived` | Decision ¶2 | See (manifest is the source; lookup) |

## 2. Dropped

- "Retiring the Living Documentation term", "CONTEXT.md glossary entry becomes Journal": history; done.
- "Historical ADRs keep their living-documentation wording": no longer true; ADR-0021 and ADR-0030 now say rewritten ADRs drop retired terms.
- "ADR-0003's derived-from-ground-truth framing is no longer the whole story": history of a superseded framing; its substance survives as the rejected alternative.
- Deferred `sessions` schema, `log-session` Skill, Stop hook, how a log commits: history; all shipped (ADR-0009, ADR-0025, `log-session`).
- "Research and ideas (forthcoming)" as Journal content: no longer true. Ideas are optional notes inside a session log (CONTEXT.md, Idea); research lives in `docs/research/`, not the Journal. Nothing in `layers/journal/` holds research write-ups.
- `sync`, `consolidate`, `codify`, "Journal entries": retired terms (CONTEXT.md).
- Collection key format `journal_<space>_<collection>` and route `/t/journal/…`: mechanics; already live in `shared/manifest.ts` (key builder) and the manifest/pages. No move needed.
- Spaces `current`/`archived`: lookup; lives in `layers/journal/tenant.config.ts` (with its comment pointing to issue #868).

## 3. Rule check (`.claude/rules/adr-0008.md`)

| Rule fact | Rewrite |
|---|---|
| `journal` Tenant (`layers/journal/`) documents the Platform | Summary; path in See |
| Platform infrastructure, not a demo Tenant | Summary, Scope 1 |
| Inventories derived, refreshed in place: Skill Inventory, Friction Ledger | Scope 2 |
| Session logs written honestly, added to over time | Scope 2 |
| Digests (ADR-0010) | Scope 2 |
| Session logs are ground truth, cannot be rebuilt from the repo | Summary, Scope 3 |

No drift: the rule adds nothing the rewrite lacks. (Before the rewrite, the rule was ahead of the ADR: Friction Ledger, Digests, "not a demo Tenant".) The rule needs only a hash re-stamp.

## 4. Format friction

- **Facts owned by another ADR.** "Not a demo Tenant" is decided in ADR-0021's boundary; Digests are ADR-0010. The template's "restate nothing other ADRs own" pulls against "the summary covers the whole decision". I named them and pointed by number, but the line between pointing and restating is a judgement call.
- **Thin decision.** After stripping history and mechanics, the decision is two sentences of glossary (the survey already noted it fails ADR-FORMAT's "hard to reverse / surprising" test). The template doesn't say what to do when a full rewrite reveals an ADR that arguably shouldn't exist (fold into ADR-0010 or CONTEXT.md). I kept it standalone per the prompt.
- **Rejected alternatives were implicit.** The original had no such section; the only real alternative is the framing it replaced (ADR-0003's derived status report). Treating a predecessor framing as a "rejected alternative" felt borderline-history but is the only honest candidate.
- **Scope vs Why vs glossary.** The three content kinds are also defined in `CONTEXT.md` and `layers/journal/CONTEXT.md`. One-home-per-fact says point to the glossary, but ADR-0030 wants limits in the ADR. I kept short definitions because the derived/primary split *is* the decision.
- **When to revisit:** sources give none; omitted.

## 5. Open questions

- Should ADR-0008 merge with ADR-0010 into one "The Journal" ADR (survey option C2)? The rewrite makes it short enough that a merge would cost little.
- The rule's `paths: layers/journal/**` makes it fire on 43/51 sessions with ~1 useful verdict (session-log-usage). Worth narrowing, but out of scope here.

## 6. Lines

Old: 53. New: 46 (including blank lines and the added Why, Rejected alternatives and See sections).
