# Rewrite one ADR into ADR-0030's shape

You rewrite **ADR-{NNNN}** (`docs/adr/{file}`) in `/home/user/terrarium` into the
shape ADR-0030 sets. This run tests whether that format holds, so **the decision
must not change**: same decision, same limits, same exceptions, stated as they
stand today. Don't split or merge ADRs.

**Write only to the scratchpad; change nothing in the repo.** Other agents are
rewriting other ADRs at the same time. Run only read-only git commands (`log`,
`show`, `blame`, `grep`). Write the rewrite to
`/tmp/claude-0/-home-user-terrarium/468fb6ef-963a-5a51-b883-82308adbcdbb/scratchpad/rewrites/{NNNN}.md`
and your report to `…/rewrites/{NNNN}-report.md`.

## 1. Read

Read each in full with the Read tool:

- `docs/adr/0030-how-we-write-adrs.md`: the format. Its
  *Scope and limits* is your spec.
- The target ADR, and its summary rule `.claude/rules/adr-{NNNN}.md`.
- `CONTEXT.md` (glossary; also lists **Retired terms** to drop).
- Every ADR the target cites or that cites it. Find them with
  `grep -l "ADR-{NNNN}\|{NNNN}-" docs/adr/*`.

Background from this session (written before ADR-0030 landed; read the parts
about your ADR):

- `…/scratchpad/background/adr-survey.md`: per-ADR gist, staleness, amendment
  mess, overlaps, and what implementation detail could move out.
- `…/scratchpad/background/session-log-usage.md`: how agents used this ADR's
  summary and full text, and why they opened it. The full text is read for
  **limits, exceptions and definitions**, so those must be easy to find.

If a question about how this ADR relates to others, or how sessions use it,
isn't answered there, send it to `main` with SendMessage and keep working on
anything that doesn't depend on the answer. The main session relays it to the
agents that wrote the background.

Done when you can list every decision point, limit and exception the ADR
currently holds, with the amendments applied.

## 2. Build the current-state inventory

Before you write prose, list in your report every rule the ADR holds **today**:

- Apply each amendment to the text it changes. Where an amendment reverses the
  original, the amendment wins.
- Check stale claims against the code (`grep`, Read). Paths, script names and
  retired terms get today's form.
- Note each item's source (original section or dated amendment).

Done when every amendment and every Decision/Consequences bullet maps to an
inventory row, or to "dropped: history" or "dropped: no longer true" with a reason.

## 3. Write the rewrite

Invoke the `writing-for-agents` Skill first and write by it: agents read this
ADR, so its levers apply in full. Keep each fact in one home, leave lookups to
the environment, prune no-ops and sediment, prefer leading words over spelled-out
restatements, and phrase rules positively.

Follow ADR-0030's template exactly, heading included (`# ADR-{NNNN}: Title`).
You may shorten the title; it reminds of the topic and doesn't repeat the
summary.

- **Summary:** 2–3 sentences covering the whole decision.
- **Scope and limits:** every inventory row lands here, unless it is reasoning
  (goes to *Why*) or mechanics (goes to *See* as a pointer).
- **Why:** the reasons that still hold. No narration of spikes, PRs, sessions
  or dates.
- **Rejected alternatives:** only options the ADR, its amendments, or its
  linked issues actually considered. Don't invent any.
- **When to revisit:** only conditions the sources give. Leave the section out
  rather than invent one.
- **Consequences:** only effects that aren't obvious and still hold.
- **See:** pointers to the code, Skills and docs that hold the mechanics.
  Implementation detail (constants, file internals, step lists) leaves the ADR
  as a pointer. Record in your report where it should live; don't move it.

Plain language: short sentences, glossary terms, no jargon, no bold walls.
Point to other ADRs by number; restate nothing they own.

Done when the rewrite satisfies every bullet in ADR-0030's *Scope and limits*
and a sentence-by-sentence pass under `writing-for-agents` finds nothing to cut.

## 4. Check against the summary rule

The rule `.claude/rules/adr-{NNNN}.md` must add nothing the rewrite lacks.
List each fact in the rule and where the rewrite holds it. A fact only the rule
holds belongs in the ADR, which is the source: add it to the rewrite if it is
still true, and list it in your report. Report a rule fact that is no longer
true as rule drift. Don't edit the rule.

## 5. Report

Write `{NNNN}-report.md` with:

1. **Inventory table:** each current rule → its section in the rewrite.
2. **Dropped:** what you cut and why (history, no longer true, mechanics moved
   to *See*), and where each piece of moved detail should live.
3. **Rule check:** result of step 4.
4. **Format friction:** where ADR-0030's template didn't fit this ADR, felt
   forced, or left you unsure. This is the main point of the test, so be
   specific.
5. **Open questions** for the human, if any.
6. **Lines:** old vs new.

Reply with the two paths and a five-line summary.
