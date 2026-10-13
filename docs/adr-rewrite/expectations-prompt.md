# What callers expect ADR-{NNNN} to answer

You infer what ADR-{NNNN} must answer, using **only** the places that cite it.
The result is a checklist for testing a rewrite of that ADR, so it must come
from the callers' side.

## Stay blind

Your only input is
`/tmp/claude-0/-home-user-terrarium/468fb6ef-963a-5a51-b883-82308adbcdbb/scratchpad/refs/{NNNN}.md`:
every reference to ADR-{NNNN} in the repo, with verbatim context. Read its live
code and live docs references in full (in chunks with the Read tool's
offset/limit). Skip the historical ones (session logs, blog posts): they don't
count here.

- Open no file in the repo and nothing else in the scratchpad. Opening a repo
  file can load ADR summaries into your context.
- Never read `docs/adr/{NNNN}-*.md` or `.claude/rules/adr-{NNNN}*.md`, and
  never search for them.
- Some ADR summaries load into every session automatically. If the summary of
  ADR-{NNNN} is in your context, ignore it, and say so in your output.
- When the context around a reference is too short to tell what it expects,
  mark that item "unclear" rather than guess.

## Build the checklist

Turn the references into short items, each either a **question** the ADR must
answer ("Which PRs need a human merge?") or a **claim** callers say it makes
("e2e specs never build"). Group items that mean the same thing. For each item
give:

- how many references rely on it, split into live code / live docs;
- one or two example citations (file:line).

Then flag:

1. **Amendment or section citations:** references naming a dated amendment,
   date, or section heading ("ADR-0009's external-sessions amendment",
   "ADR-0022's Decision section"). These break when the ADR is rewritten.
2. **Conflicts:** callers that expect contradictory things.
3. **Misplaced expectations:** callers that expect a procedure, a constant or a
   file list from the ADR, which an ADR shouldn't hold (ADR-0030).

## Output

Write
`/tmp/claude-0/-home-user-terrarium/468fb6ef-963a-5a51-b883-82308adbcdbb/scratchpad/expectations/{NNNN}.md`
with: the counts, the checklist (most relied-on first), and the three flag
lists. Done when every live reference maps to an item or is marked noise
(e.g. test fixture data).

Reply with the path, the number of items, and whether ADR-{NNNN}'s summary was
in your context.
