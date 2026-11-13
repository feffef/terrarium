# Writing a Glass Box page

The steps a Lesson and a Walkthrough share. Each page's shape, and the Excerpt
and Term rules, are in `layers/glassbox/GLOSSARY.md`; the drift rule
(`.claude/rules/glassbox-content.md`) loads when you edit a page. Rulings in
[`owner-decisions.md`](owner-decisions.md) are hard rules; the workshop page's soft
decisions are agents' own and can be overruled.

## Pin

Run `git fetch origin main`. Set `revision` to `origin/main`'s commit and
`revisionDate` to the date part of `git show -s --format=%cI <revision>`. Read
every file you cite as it is at that commit (`git show <revision>:<path>`): the
page describes `main` at `revision`, and work not yet merged can't be cited.
If the integration branch already changes a file you cite, word the page so it
stays true after that change lands (diff the file between `revision` and the
integration tip).

Set `publishedAt` to now (`date -u +%Y-%m-%dT%H:%M:%SZ`) when you write a page,
move it to the guide, or change what it teaches; it puts the page on the
Commons Timeline. Leave it as it is for a re-pin, a typo, a moved `lines` range
or a wording-only edit to `description`, `teaches` or a bold lead-in (below).

Frontmatter holds `title`, `description`, `teaches`, `revision`,
`revisionDate` and `publishedAt` only; the page draws `title` as its heading,
so the body has no h1.
`title` is the concept's general name, as its docs or the field call it, never
Terrarium's own: at most four words in sentence case, with no leading article,
parentheses or code identifier unless that is the concept's name
(*CLAUDE.md*), and the tool's name in front only when the bare word is
ambiguous outside its Subject (*Claude Code hooks*). A Walkthrough's title names its story.
`description` is one plain sentence a visitor reads before clicking, on the
page's search snippet, the home page and Commons Search: it names the concept
and what the page shows of it, not a list of keywords. Write it for a web
developer new to the tool: a product's name is fine, a code name, config key or
Terrarium term is not, since `teaches` holds those.
`teaches` is for agents only: `glassbox-curate`'s guide index prints it, with
the bold lead-ins of the page's Why and What to watch for bullets (a
Walkthrough's stop headings), so a run learns what the page teaches without
opening it. It holds what those leave out: for a Lesson, `Concept:` then
`Terrarium:`, naming every tool, option, API, command, file and Skill each
section explains; for a Walkthrough, `Story:`, `Start:`, `End:` and `Code:`,
and what *A real case* tells, if any. Write it dense, separated by `;`, from
the page as it now reads; it has no cap. Give each bold lead-in a claim that
stands alone, since the index shows only the lead-in.
Quote a `description` or `teaches` that holds a colon, or YAML misreads it.
`description` serves visitors and `teaches` serves agents: an edit to either, or
rewording a bold lead-in and its sentence to match, that changes no claim keeps
`revision` and `publishedAt`.
A `title` and `description` stay within their caps in `lengths` in
`layers/glassbox/page-checks.ts`,
which also checks a Lesson title's word count and each Why bullet's length
(`ownWords`). The slug follows the title when a
page is written; a retitle keeps the URL.

## Write

- **From the source, never memory.** Take every claim about a tool or about
  Terrarium from its source: the cited file at `revision`, the package in
  `node_modules`, the official docs.
- **Stand alone.** A reader landing from search follows the page without
  reading another first: link a sibling for depth, never as a prerequisite.
- **Excerpts teach.** Excerpt the code that makes the decision, not a comment
  or a summary of it: short (about 12 lines), readable on its own, ending on a
  whole statement.
- **Cite** code with `:file[path]` or `::excerpt`, an ADR as
  `ADR-NNNN (:file[docs/adr/NNNN-….md])`, and a Journal page by its site path
  (a content page, or `/t/journal/<space>/{skills,frictions,ideas}`). A path
  holding `[` can't go in `:file[…]`: cite its folder. An Excerpt's `lines`
  follow its glossary entry. Don't Excerpt a Markdown table
  wider than about 80 characters: Excerpt the prose next to it, or link the
  table.
- **Don't paraphrase an ADR** in In Terrarium or What to watch for: show the
  files and link the ADR.
- **Link only pages that exist**, and promise none.
- **Link a sibling at its section.** Where a Lesson covers the same point, end
  the bullet or paragraph with a link to its section (`#why-its-built-this-way`,
  `#what-to-watch-for` or `#in-terrarium`). A link's text is the page's exact
  title, or lowercase running prose; only a Where next row to a guide page is
  bare, `[](path)`, since it shows the title itself.
- **Mechanism, not motive.** *In Terrarium* says what the code does, with no
  "so …" or "for …" clause; every design "because" goes in *Why it's built
  this way*.
- **Test the lede.** Check its summary claim against the edge cases the page
  itself mentions.
- **Verify each official-docs URL** by fetching it and checking it says what
  you cite, and re-read the docs section that every *What to watch for* and
  *Try it* line depends on. If the network blocks the fetch, read the page's
  source in the published docs package (e.g. `@nuxt/docs` from npm) or the
  docs repo on `raw.githubusercontent.com` (docs.github.com: `github/docs/...`;
  vuejs.org: `vuejs/docs/main/src/...`; nuxt.com: `nuxt/nuxt/main/docs/...`;
  MDN: `mdn/content/main/files/en-us/...`, whose folders can differ from the
  URL, e.g. `web/css/reference/values/color_value/light-dark/index.md`; WAI-ARIA
  spec: `w3c/aria/main/index.html`; playwright.dev:
  `microsoft/playwright/main/docs/src/...`; git-scm.com:
  `git/git/master/Documentation/...`), confirm the exact URL and title in
  web search results, and say so in the PR. Other blocked hosts:
  `docs/agents/environment-caveats.md`. A repo without GitHub access: attach
  it with `add_repo`. Zod links go to v3.zod.dev.
- **A second tool gets its own link** at its first mention, even though *The
  concept* ends on one Full reference.
- **Don't repeat a sibling page.** Check a Lesson's *Why it's built this way*
  and *What to watch for* against the other Lessons in the guide index; give a reason another
  Lesson owns one sentence and link that Lesson.
- **Name the command.** A watch item about a stale `.nuxt/`, the type check or
  a restart names the command it applies to, after checking what the repo's
  `pnpm` scripts already run (`package.json`).
- **Terms.** Wrap a word the reader may not know in `:term[…]`. For each id
  with no `layers/glassbox/content/guide/terms/<id>.yml`, add one: `term`, a
  `definition` in Glass Box's own words, and `lesson`, the site path of the
  Lesson that teaches it; with none, `source`, the glossary that defines it, if
  one does. Check the definition against that glossary's
  entry, not your memory of it. First check the Glass Box integration branch
  and open Glass Box PRs for the same id, and reuse one you find.

## Diagrams

Optional, and the prose carries every fact: #1985's *Diagrams* section has the
rules. Hand each to a subagent (`dispatch-subagents`): it drafts the
` ```mermaid ` fence, runs `pnpm render:mermaid`, looks at the page after
`pnpm build` (below, both schemes), redraws until it reads at a glance, and
commits the fence with its SVGs. With no subagent available, run that loop
yourself and say so in the PR. Done when its label text reads at about 12px or
larger in the 390px screenshot; if it doesn't, redraw it narrower (fewer nodes
side by side, shorter labels) or drop it.

A diagram is a simplified picture, read beside the steps (a Walkthrough shows it
next to them on wide screens, after them elsewhere). Draw about 5 to 7 boxes in
one mostly straight line, in the order of the steps and in their words, with at
most one side branch for the case that matters, and a loop only where it is the
point. Don't number the boxes after the steps: that promises a 1:1 match the
picture can't keep. Not every step needs a box, nor every box a step: match
them roughly, not hard. The model is
`walkthroughs/a-change-goes-live`: six boxes, one branch (a failed build keeps
the old site), and the lockfile and install detail left to the steps.

## Check

Read each section you changed from its first line to its last, as a reader
would: every sentence has its antecedent, steps come in the concept's order, and
each Excerpt follows the text that explains it.

`git fetch origin main` first: the layer test skips its git checks when the
clone lacks `revision`. Then run
`pnpm exec vitest run layers/glassbox/tests/unit/glassbox-pages.spec.ts` and
`pnpm validate:content`. `pnpm exec tsx layers/glassbox/page-checks.ts` prints
warnings that never fail (`glassboxPageWarnings` and `glassboxOrphans` list
them): fix each, or keep what the page needs, such as a "so" clause that
states mechanism or an Excerpt the decision needs. A capitalised-term warning
skips code, a "quoted" word and an *italic* title, so a name that must keep its
capital gets one of those marks: a key as `Space`, a page title in quotes.

After `pnpm build`, for a page whose layout, feature
or diagram changed, shoot it with `scripts/ui/preview.ts review <route>
<out-dir>` and look at all four shots (`docs/agents/verifying-ui-changes.md`).
Retake them after the last content edit. Done when both are green and, for a
shot page, each shot matches the page's shape in the glossary.
