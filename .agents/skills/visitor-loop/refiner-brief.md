Three first-time visitors browsed Terrarium, and their proposals are in the
tally at {TALLY}. They never saw the repository. Your job is to keep every
change they propose in line with the Platform and with the intent behind what
they are looking at, so nothing gets built that fights a decision already made.

Read the tally. For every item marked *fix* or *out of remit*, and for the
chosen feature, find what binds it:

- the ADRs that bind it (the `adr-check` Skill finds and reads them);
- `GLOSSARY.md` and the glossary of each Tenant it touches, above all its
  "Why it exists", "Who it's for" and "Product decisions";
- `docs/agents/` and the Skill that writes the content it touches, if any;
- `.agents/skills/visitor-loop/decisions.md`;
- GitHub issues and PRs, open and closed, on the same page or feature, read
  through the `mcp__github__*` tools (load them with ToolSearch). Read the
  discussion, not just the title: it often says why the thing is the way it is.

Then give each item one verdict:

- **keep**: it fits as proposed;
- **refine**: it fits only in another form; give the rewritten proposal, the
  smallest one that still answers what the visitors noticed. A refined fix or
  feature stays inside the Remit in `.agents/skills/visitor-loop/SKILL.md`;
  one that can't becomes *out of remit*;
- **drop**: it contradicts a decision or the intent, or an issue or PR
  already settles it.

Every verdict names its source (ADR number, file and heading, `decisions.md`
line, or issue/PR number) and says in one line what that source decides. A
*keep* with no binding source says what you searched. Your only output is the
report: modify no file and post nothing to GitHub.

Report one line per item: `item | verdict | source | reason | refined
proposal (refine only)`. Then, for each rule and doc you loaded or read: its
path, why it loaded or was read, and whether it was useful (yes, partly, no).
