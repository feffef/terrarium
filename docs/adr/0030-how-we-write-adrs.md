# ADR-0030: How we write ADRs

An ADR states one decision as it stands today: what it covers, why we made it,
and the alternatives we rejected, in the template below. When the decision
changes, we rewrite the ADR in place and git keeps the history. The ADR is the
source of the decision; its summary rule (ADR-0029) brings the key parts to
agents.

## Scope

- **Readers.** First an agent or reviewer asking "why is this so, and may I
  change it?", then the owner keeping an overview.
- **One decision per ADR,** in about 40–70 lines.
- **No history in the text.** No amendments, dates, status lines, "Amended by"
  banners or notes about what used to be true. Use `git log` on the file.
- **The ADR is the home of the decision:** what it allows and forbids, and the
  exceptions that change that. Its summary rule may carry the key parts but
  never decides anything the ADR doesn't. Skills and docs point to the ADR
  rather than restate it.
- **Mechanics live where they are enforced.** Numbers, procedures and commands
  belong in code, a Skill or `docs/agents/`. The ADR names them under *See* and
  never repeats a value.
- **Keep only what a reader needs.** Keep a detail when a reader of some code
  or doc needs this ADR to understand it. Drop one that a caller only quotes.
- **Change an ADR by rewriting it.** Change the decision, merge two ADRs,
  narrow one's focus or retire one: each is an ordinary edit. The same PR
  rewrites its summary rule, repoints the code and docs that cite it, and
  gives a new home to anything they relied on that leaves the ADR.
- **Plain language.** Short sentences in plain, common words. When you name a
  concept the glossary defines, use its term, not a synonym. Replace coined
  phrases with what actually happens.
- **Template.** Follow `docs/adr/TEMPLATE.md`: a `# ADR-NNNN:` heading, a 2–3
  sentence summary that covers the whole decision, then *Scope*, *Why* and
  *Rejected alternatives*, and optional sections left out rather than filled.
  A rejected alternative is one someone could plausibly propose again today;
  an older rule that later changes overtook is history.
- **Older ADRs** have a `# NN. <title>` heading and keep their old shape until
  someone rewrites one in full. A small fix before then just edits the wrong
  line. The gate fails an ADR with the new heading that carries a date, a
  status line or an amendment banner.

## Why

Amendments buried the current decision. An agent had to rebuild the rule from
several dated layers, some of which reversed others.

Copies drift. When an ADR repeated a number or a step that code or a Skill
also held, the two came apart, and agents trusted the stale one. One home for
each fact, and a pointer from the ADR, removes that.

The ADR's own job is the reasoning: why the decision holds and what was ruled
out. That is what an agent or reviewer needs before changing it, and what no
Skill or code comment records.

History has a home already. Git records every change with its PR and reason,
so keeping it in the text too was a second copy that made the decision harder
to read. Rejected alternatives are not history: they stop a review or a new
idea from bringing back what we ruled out, and *When to revisit* says what
evidence would justify that.

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

## See

- `.agents/skills/domain-modeling/ADR-FORMAT.md`: the pack template and its
  test for when a decision deserves an ADR. Our template above replaces its
  section layout and its Status field.
- `docs/adr/TEMPLATE.md`: the template.
- `scripts/validate-adr-rules.ts`: fails the gate until a changed ADR's summary
  rule is re-checked, and on history in a new-shape ADR.
