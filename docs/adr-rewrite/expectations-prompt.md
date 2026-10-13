# What callers need from ADR-{NNNN}

You work out what the rest of the Platform needs ADR-{NNNN} to say, using
**only** the places that cite it. A rewrite of that ADR uses your result as a
checklist, so it must come from the callers' side.

## Stay blind

Your only input is `/home/user/terrarium/docs/adr-rewrite/refs/{NNNN}.md`:
every live reference to ADR-{NNNN} in code and docs, each with its enclosing
block. Read it in full, in chunks with the Read tool's offset and limit.

- Open no other file. Opening a repo file can load ADR summaries into your
  context.
- Some ADR summaries load into every session. If ADR-{NNNN}'s is in your
  context, set it aside and say so in your output.
- When the context can't tell you what a reference expects, mark it "unclear".

## 1. Classify every reference

Give each reference one **role**:

- **explains:** cites the ADR as the reason something is built this way.
- **points:** sends the reader to the ADR for something.
- **quotes:** repeats the ADR's words, or names its numbered items, headings or
  dated amendments.
- **enforces:** code or a test that implements or checks the rule.
- **repeats:** states the rule itself, so the fact lives in two places.
- **miscites:** names this ADR for something it plainly isn't about.
- **noise:** test data, examples or lists that expect nothing.

Done when every reference has a role.

## 2. Build the checklist

Turn the references into short items, each a **question** the ADR must answer
("Which PRs need a person to merge them?") or a **claim** callers say it makes
("End-to-end tests never build the app"). Group items that mean the same thing.

Write each item in plain, common words. Callers use project jargon ("standing
green-light", "chartered", "Heavy"); say what actually happens instead.

For each item give:

- its **kind**: a **decision** (what is allowed or forbidden, who may do what,
  what is in or out of scope), or a **mechanic** (a number, procedure,
  command or file list). For a mechanic, name the file the references show
  holding or enforcing it, if any;
- how many references rely on it, by role;
- one or two example citations (file:line).

Most relied-on first. Mark items callers disagree on as **conflict**, naming
both sides.

Done when every non-noise reference maps to an item or to a list in step 3.

## 3. List the callers a rewrite must change

- **Repoint:** citations a rewrite will break or that quote the ADR's wording
  (dated amendments, headings, numbered items, quoted phrases). Each will just
  point to the ADR. Give file:line and what it cites.
- **Fix:** miscites, and "repeats" that should become pointers.

## Output

Write two files in `/home/user/terrarium/docs/adr-rewrite/expectations/`:

- `{NNNN}.md`: the counts by role, the checklist, and the two lists.
- `{NNNN}.yml`: the same as data. One entry per item, with `id`, `text`,
  `kind` (decision or mechanic), `home` (for a mechanic), `refs` (file:line
  list) and `conflict` (true or false). One entry per list item, with `list`
  (repoint or fix), `file`, `line` and `note`.

If a Write is refused, return both files' full text in your final message
instead.

Reply with the path, the number of items, and whether ADR-{NNNN}'s summary was
in your context.
