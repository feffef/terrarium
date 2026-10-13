# What callers need from ADR-{NNNN}

You work out what the rest of the Platform needs ADR-{NNNN} to say, using
**only** the places that cite it. A rewrite of that ADR uses your result as
input, and a later check ticks it off, so it must come from the callers' side.

## Stay blind

Your only input is
`/tmp/claude-0/-home-user-terrarium/468fb6ef-963a-5a51-b883-82308adbcdbb/scratchpad/refs/{NNNN}.md`:
every live reference to ADR-{NNNN} in code and docs, each with its enclosing
block as context. Read it in full, in chunks with the Read tool's
offset/limit.

- Open no other file: not in the repo, not in the scratchpad. Opening a repo
  file can load ADR summaries into your context.
- Never read or search for `docs/adr/{NNNN}-*.md` or
  `.claude/rules/adr-{NNNN}*.md`.
- Some ADR summaries load into every session. If ADR-{NNNN}'s is in your
  context, ignore it and say so in your output.
- When the context can't tell you what a reference expects, mark it
  "unclear" rather than guess.

## 1. Classify every reference

Give each reference one **role**:

- **explains:** cites the ADR as the reason something is built this way.
- **points:** sends the reader to the ADR for something ("see ADR-X for…").
- **quotes:** repeats the ADR's words, or names its numbered items, headings or
  amendments ("rule 2", "wiring #3", "the 2026-10-10 amendment").
- **enforces:** code or a test that implements or checks the rule.
- **repeats:** states the rule itself, so the fact lives in two places.
- **miscites:** names this ADR for something it plainly isn't about.
- **noise:** test data, examples or lists that expect nothing.

Done when every reference has a role.

## 2. Build the checklist

Turn the references into short items, each a **question** the ADR must answer
("Which PRs need a human merge?") or a **claim** callers say it makes ("e2e
specs never build"). Group items that mean the same thing. For each item give:

- the template section it belongs in: *Summary*, *Scope and limits*, *Why*,
  *Rejected alternatives*, *When to revisit*, *Consequences*, or *See* (it
  belongs in code or a doc, and the ADR only points there);
- how many references rely on it, by role;
- one or two example citations (file:line).

Most relied-on first. Mark items callers disagree on as **conflict**, naming
both sides.

## 3. Summarise by part of the Platform

In one short paragraph each, say what each kind of caller needs from this ADR:
code and tests, Skills, agent docs and CLAUDE.md, other ADRs and rules, and
glossaries (`CONTEXT.md` files). Skip kinds with no references.

## 4. List what a rewrite must handle

- **Keep as is:** wording, numbered items and terms that callers quote or
  name. Give each with its callers.
- **Repoint:** citations a rewrite will break (dated amendments, headings that
  disappear, renumbered items). Give file:line and what each cites.
- **Fix the caller:** miscites, and "repeats" that should become pointers.

## Output

Write two files under
`/tmp/claude-0/-home-user-terrarium/468fb6ef-963a-5a51-b883-82308adbcdbb/scratchpad/expectations/`:

- `{NNNN}.md`: the counts by role, the checklist, the summary by part, and the
  three lists.
- `{NNNN}.yml`: the checklist as data. One entry per item, with `id`, `text`,
  `kind` (question or claim), `section`, `refs` (file:line list), and
  `conflict` (true/false). One entry per keep/repoint/fix item, with `list`,
  `file`, `line` and `note`.

Done when every reference has a role and every non-noise reference maps to a
checklist item or a list entry.

Reply with the path, the number of items, and whether ADR-{NNNN}'s summary was
in your context.
