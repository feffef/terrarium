# ADR-0030: How we write ADRs

An ADR states one decision as it stands today: its scope and limits, why we
made it, and the alternatives we rejected, in the template below. When the
decision changes, we rewrite the ADR in place and git keeps the history. The
ADR is the source of the decision; its summary rule (ADR-0029) brings the key
parts to agents.

## Scope and limits

- **One decision per ADR.** If the summary can't cover the whole decision in
  2–3 sentences, split the ADR.
- **No history in the text.** No amendments, dates, status lines, "Amended by"
  banners or notes about what used to be true. Use `git log` on the file.
- **Change an ADR by rewriting it.** Change the decision, merge two ADRs,
  narrow one's focus or retire one: each is an ordinary edit.
- **The ADR is the source.** Its summary rule may turn parts of it into
  instructions, but never decides anything the ADR doesn't. What a summary
  rule is for is ADR-0029's.
- **Procedures live elsewhere.** Commands, steps and formats go in
  `docs/agents/`, a Skill or a code comment. The ADR points to them.
- **Plain language.** Short sentences in plain words, written for someone who
  knows nothing of this project. Use a glossary term only when it is the
  clearest word for the concept; replace coined phrases with what actually
  happens.
- **Template.** Every section after the summary is a `##` heading in this
  order; leave out an optional one rather than fill it:
  1. Title: `# ADR-NNNN: <title>`, a short reminder of what the ADR is about,
     the same heading its summary rule uses.
  2. A summary of 2–3 sentences covering the whole decision. A reader who
     stops here knows what we decided.
  3. **Scope and limits:** what the decision covers, its limits, exceptions
     and edge cases.
  4. **Why:** the reasons, briefly.
  5. **Rejected alternatives:** each option and why we rejected it.
  6. **When to revisit** (optional): conditions that would make us reconsider
     part of the decision or a rejected alternative.
  7. **Consequences** (optional): only effects that aren't obvious.
  8. **See** (optional): the code, Skills and docs that hold the mechanics.
- **Older ADRs** keep their old shape until someone rewrites one in full; the
  full rewrite brings it into this shape. A small fix before then just edits
  the wrong line.

## Why

Agents read a full ADR to check limits, exceptions and edge cases. The session
logs show it: the summary rules carried the everyday instruction, and agents
opened the full ADR for the bounds of the auto-triage green-light or the length
of a prune trial's window. Amendments scattered exactly those details, so an
agent had to rebuild the current rule from several dated layers, some of which
reversed others.

History has a home already. Git records every change with its PR and reason,
so keeping it in the text too was a second copy that made the decision harder
to read.

Rejected alternatives stay in the text because they are not history: they stop
a review or a new idea from bringing back what we already ruled out. "When to
revisit" says what new evidence would justify that, so a decision is firm
without being permanent.

## Rejected alternatives

- **Append dated amendments and keep the original text.** It keeps the history
  in the ADR but buries the current decision under it.
- **Make each ADR its own rule** (issue #1745). The whole ADR would load into
  context, so it would have to be as short as a summary and lose its reasons and
  alternatives. Summary rules already work, so we keep the split.
- **A "for agents" section inside each ADR.** It would repeat the summary rule
  in a second place.
- **A rule card (Do / Why / Not chosen).** Too close to a how-to doc, which
  belongs in `docs/agents/` or a Skill.

## When to revisit

- Agents often need a decision's history to act, and git proves too awkward
  for it.
- Summary rules keep drifting from their ADRs despite the `adr:` hash check.

## Consequences

- Code comments and docs that cite a dated amendment ("ADR-0009's 2026-07-22
  amendment") need repointing to the ADR, or to the section that holds the
  rule, when that ADR is rewritten.

## See

- `.agents/skills/domain-modeling/ADR-FORMAT.md`: the pack template and its
  test for when a decision deserves an ADR. Our template above replaces its
  section layout and its Status field.
- `scripts/validate-adr-rules.ts`: fails the gate until a changed ADR's summary
  rule is re-checked.
