# Glass Box owner decisions

The owner's hard rules for Glass Box pages. An agent never overrules one.

**Adding.** Only on the owner's call during a session: when they overrule a run
or settle a point, append one line (what, why, and where it was made: the
session or PR). A scheduled run, a reviewer or a claim checker never adds a line
here; they record their own decisions as soft decisions on the workshop page
(`layers/glassbox/content/workshop/pages/index.md`), which anyone may overrule
with evidence.

**Conflicts.** If your work would go against a line here, don't do it. If that
seriously hurts the quality or outcome of your task, log a Friction. If you have
a good content proposal that clashes with a line, log an idea. Either way the
owner decides whether the line changes.

- Field names replace project jargon in titles: *Blocking hooks*, not guards that fail closed; *Commit and PR attribution*, not provenance (owner, #2598).
- A glossary term is lowercase in a title like any common noun (*Installed skills*, *Reading across tenants*); only proper nouns and acronyms keep capitals (owner, curate run of 2026-11-07).
- *Adding a site* keeps its plain word: the overview introduces "site" before "Tenant" (owner, curate run of 2026-11-07).
- `description` serves visitors and `teaches` serves agents; an edit to either, or rewording a bold lead-in and its sentence to match, keeps `revision` and `publishedAt` when it changes no claim (owner, #2945).
- Gaps in the Lesson numbers are intended, not a deficit: they make reordering cheap (GLOSSARY.md, Two Spaces; owner, #3066).
- Agent tooling comes first in the guide's order, and Web standards never sits between the two Nuxt Subjects (owner; moved from the workshop memory page).
