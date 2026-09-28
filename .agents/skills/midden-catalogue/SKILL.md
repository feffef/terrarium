---
name: midden-catalogue
description: Catalogue a Midden survey's candidates — write each Artifact and the dig report that narrates it, grade and date it, fact-check it against primary sources, and open the PR for a human to review.
disable-model-invocation: true
---

# Midden Catalogue

The excavation that follows a survey: turn the candidates in a
`midden-survey` report issue into catalogued Artifacts, placed in the trench
or the stores, narrated by dig reports. You are the curator: you author every
curatorial field, and a human reviews them in the PR
(`layers/midden/CONTEXT.md`, Cataloguing discipline).

The standard is **primary source**: every claim in a record traces to the
commit, the file at its revision, the PR or issue body, or the session log
that did the work. The survey issue is a pointer to those, never a source
itself. Cataloguing from the report, not the sources, is how an earlier run
shipped twelve factual defects in one PR.

## 1. Ground yourself

Read `layers/midden/CONTEXT.md` whole, then `app/utils/condition.ts`,
`app/utils/strata.ts`, the Artifact schema in `tenant.config.ts`, and two or
three existing dig reports with their Artifacts for the house voice. Done
when you can say which Space, site, season and grade each candidate is likely
to get, and why.

## 2. Re-read every candidate at its sources

For each candidate, open its sources fresh: `git show` the deleting and birth
commits and the file at the revision before deletion, the PR body, the linked
issue, and the session log (`layers/journal/content/*/sessions/`) of every
session that touched it. The session log's summary says **who decided** each
step — a human's ask, an agent's initiative, a judge's score; record that
split exactly, never blurred into "the platform decided".

Done when every date, duration, count, quote and attribution you intend to
write has a source you have read this session. What the record doesn't say
(a reason nobody wrote down), the record says it doesn't.

## 3. Write the records

- **Artifact** — one YAML per find under `content/<space>/artifacts/`, in the
  schema's shape. A cluster that died together for one reason is one find.
  `remains` link the file at the full SHA before deletion; `inscription` is a
  verbatim line, byte-for-byte.
- **Placement** — trench when the find carries a decision, reversal or
  transferable fact a report can argue from; stores otherwise (CONTEXT.md,
  The Stores). A trench find needs a `site`: fold it into an existing report
  whose argument it extends, or write a new one.
- **Condition** — grade against the definition text in `condition.ts`, never
  the word's connotation.
- **Stratum** — the season holding the terminal commit's date. When the open
  season has run long enough to say what it was, name and close it and open a
  new one; repoint its finds.
- **Prose** — write for a visitor who has never seen this repository, in
  **plain words**: say what a thing did ("a check that refused the wrong
  branch name"), not what the project calls it (guard, gate, Routine, Space,
  prune trial). Keep the weakest true phrasing: the claim the evidence
  supports, not the sharpest one it permits. Each rewrite tends to overstate
  by one notch ("same day" becomes "that morning").

Then grep `layers/midden/` for prose your change makes false — season
descriptions, counts in the e2e header comment, the trench index — and fix it
in the same pass.

## 4. Verify, then review

Run `pnpm validate:content` while iterating (it checks each `removedIn` date
against its season), then `pnpm gate:scoped`.

Dispatch two read-only reviewers in parallel (`dispatch-subagents`): an
adversarial **fact-check** of every claim against primary sources, and a
**voice and domain** review against CONTEXT.md, `condition.ts` and the house
voice, flagging every word a visitor would need the repository to understand. Fix every finding, then grep for each phrase you fixed: seeing new text
in a diff does not prove the old text is gone. Repeat the fact-check on the
fixes until it comes back clean.

## 5. Open the PR

Open the gated PR. Its description lists each find with its placement,
season and grade, and names the judgment calls a reviewer should look at
first: a close Gate-B call, a season named or closed, a placement that could
go either way. Close the survey issue from the PR.
