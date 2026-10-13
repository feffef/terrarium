# Rewrite one ADR into ADR-0030's shape

You rewrite **ADR-{NNNN}** (`docs/adr/{file}`) in `/home/user/terrarium` into the
shape ADR-0030 sets. This run tests whether that format holds, so **the core
decision must not change or become unclear**. Losing details is fine. Don't
split or merge ADRs.

Many ADRs were written when agents were allowed much less than today. State
the decision as it applies now: check what ADR-0003, ADR-0004 and `CLAUDE.md`
allow, and drop cautions, justifications and limits that later decisions made
moot. List anything you are unsure about as an open question.

**Write only to the scratchpad; change nothing in the repo.** Other agents are
rewriting other ADRs at the same time. Run only read-only git commands (`log`,
`show`, `blame`, `grep`). Write the rewrite to
`/tmp/claude-0/-home-user-terrarium/468fb6ef-963a-5a51-b883-82308adbcdbb/scratchpad/rewrites-v4/{NNNN}.md`
and your report to `…/rewrites-v4/{NNNN}-report.md`.

## 1. Read

Read each in full with the Read tool:

- `docs/adr/0030-how-we-write-adrs.md`: the format. Its
  *Scope and limits* is your spec.
- The target ADR, and its summary rule `.claude/rules/adr-{NNNN}.md`.
- `CONTEXT.md`: the glossary, so you *understand* the sources. Your own
  text prefers natural language (step 4).
- Every ADR the target cites or that cites it. Find them with
  `grep -l "ADR-{NNNN}\|{NNNN}-" docs/adr/*`.
- The callers' checklist, `…/scratchpad/expectations/{NNNN}.md` and `.yml`:
  what live code and docs need from this ADR, built without reading it. The
  raw references with context are in `…/scratchpad/refs/{NNNN}.md`.

Background from this session (written before ADR-0030 landed; read the parts
about your ADR):

- `…/scratchpad/background/adr-survey.md`: per-ADR gist, staleness, amendment
  mess, overlaps, and what implementation detail could move out.
- `…/scratchpad/background/session-log-usage.md`: how agents used this ADR's
  summary and full text, and why they opened it. The full text is read for
  **limits, exceptions and definitions**, so those must be easy to find.

If a question about how this ADR relates to others, or how sessions use it,
isn't answered there, send it to `main` with SendMessage and keep working on
anything that doesn't depend on the answer.

Done when you can list every decision point, limit and exception the ADR
currently holds, with the amendments applied.

## 2. Build the current-state inventory

Before you write prose, list in your report every rule the ADR holds **today**:

- Apply each amendment to the text it changes. Where an amendment reverses the
  original, the amendment wins, and the reversed decision becomes a rejected
  alternative.
- Check stale claims against the code (`grep`, Read). Paths, script names and
  retired terms get today's form.
- For each mechanism the ADR says exists (a workflow, script, label, setting),
  confirm it does. If it is decided but not built, say so in *Scope and limits*
  and list it under open questions.
- Note each item's source (original section, dated amendment, linked issue or
  research note). Linked issues and research notes count as sources.

Done when every amendment and every Decision/Consequences bullet maps to an
inventory row, or to "dropped: history" or "dropped: no longer true" with a reason.

## 3. Map the callers

Go through the callers' checklist item by item. Each ends in one of:

- **answered:** an inventory row covers it;
- **added:** a limit or edge case only callers state, which is still true
  (check the code): add it to the inventory;
- **contradicted:** the caller is stale or wrong; name it under "Callers to
  fix";
- **elsewhere:** procedure, constants or file lists belong in code or a doc;
  name the home.

How callers word things never shapes the ADR's wording. A caller that quotes
the ADR, names a heading or a numbered item, or repeats one of its phrases goes
under "Callers to repoint": it will later just point to the ADR, without
quoting it. The checklist's "Keep as is" list is such callers. Done when every
checklist item has an outcome.

## 4. Write the rewrite

Invoke the `writing-for-agents` Skill first and write by it: agents read this
ADR, so its levers apply in full. Keep each fact in one home, leave lookups to
the environment, prune no-ops and sediment, prefer leading words over spelled-out
restatements, and phrase rules positively.

Follow ADR-0030's template exactly, heading included (`# ADR-{NNNN}: Title`).
You may shorten the title; it reminds of the topic and doesn't repeat the
summary.

- **Summary:** 2–3 sentences covering the whole decision.
- **Scope and limits:** every inventory row lands here, unless it is reasoning
  (goes to *Why*) or mechanics (goes to *See* as a pointer). A limit that
  narrows a grant, a trust tier or a merge right stays here even when a Skill
  also states it; only the steps for applying it move out.
- **Why:** the reasons that still hold. No narration of spikes, PRs, sessions
  or dates. A decision that was simply the owner's call says so.
- **Rejected alternatives:** only options the sources considered. Don't invent
  any.
- **When to revisit:** only conditions the sources give. An option that was
  postponed rather than rejected goes here once, not also under *Rejected
  alternatives*. Leave the section out rather than invent one.
- **Consequences:** only effects that aren't obvious and still hold.
- **See:** pointers to the code, Skills and docs that hold the mechanics.
  Keep a number or list in the ADR only if an agent acts on it and no other
  file is its home; otherwise point to that file.

Follow-up work the old ADR postponed doesn't go in the rewrite: list it in your
report as candidate issues.

**Plain language comes first.** Write as you would explain the rule to a new
contributor who knows nothing of this project.

- Replace coined phrases with what actually happens. Phrases the old ADR or
  its callers repeat ("standing green-light", "the one relaxation", "high-risk
  set", "Trusted-authored backlog") are jargon, however often they are quoted.
- The glossary helps you read the sources; your text prefers natural
  language. Use a glossary term only when no plain phrase is as clear. Say "a
  person with write access", not "a Trusted user"; "the gate", not "the Gate";
  "a scheduled job", not "a chartered job"; "the slow steps", not "Heavy";
  "a change that can't affect them", not "Inert". Don't capitalise ordinary
  words.
- Short sentences: one idea each, rarely over 20 words, no clause tucked into
  the middle.

**Short beats complete.** Keep what an agent needs to act or to judge an edge
case; cut the rest, even true details. A detail that lives in code, a Skill or
a doc goes away, with a pointer in *See* at most. Most ADRs should fit in
40–70 lines; say in your report why yours needs more.
- Cross-references go at the end of a sentence or in *See*, never in
  parentheses mid-sentence.
- Bold only the lead-in of a *Scope and limits* bullet. Point to other ADRs by
  number; restate nothing they own.

Done when the rewrite satisfies every bullet in ADR-0030's *Scope and limits*,
a sentence-by-sentence pass under `writing-for-agents` finds nothing to cut, and
reading the summary and *Scope and limits* as that new contributor, every
sentence makes sense on its own.

## 5. Check against the summary rule and other ADRs

- **The summary rule** `.claude/rules/adr-{NNNN}.md` never decides anything the
  ADR doesn't. List each fact in the rule and where the rewrite holds it. A
  rule-only *decision* that is still true moves into the rewrite. A rule-only
  *procedure* stays out: propose a home in `docs/agents/`. Report a rule fact
  that is no longer true as rule drift. Don't edit the rule.
- **Other ADRs:** list every fact the rewrite states that another ADR owns, and
  check that ADR says the same, including its rewrite in `…/rewrites-v2/` if
  one exists. Report any disagreement.

## 6. Report

Write `{NNNN}-report.md` with:

1. **Inventory table:** each current rule → its section in the rewrite.
2. **Callers:** each checklist item → answered / added / contradicted /
   elsewhere.
3. **Callers to repoint or fix:** file:line → what to change (point to the ADR
   without quoting it, the new heading, the correct ADR).
4. **Dropped:** what you cut and why, and where each piece of moved detail
   should live.
5. **Rule and cross-ADR check:** results of step 5.
6. **Candidate issues:** postponed follow-ups, and mechanisms decided but not
   built.
7. **Format friction:** where ADR-0030's template didn't fit, felt forced, or
   left you unsure. Be specific.
8. **Open questions** for the human, if any.
9. **Lines:** old vs new.

Reply with the two paths and a five-line summary.
