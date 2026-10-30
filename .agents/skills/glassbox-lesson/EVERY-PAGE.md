# Every Glass Box page

The steps a Lesson and a Walkthrough share. Each page's shape, and the Excerpt
and Term rules, are in `layers/glassbox/GLOSSARY.md`; the drift rule
(`.claude/rules/glassbox-content.md`) loads when you edit a page. Rulings in
[`DECISIONS.md`](DECISIONS.md) are closed; [`QUALITY.md`](QUALITY.md) grades a
page.

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
Commons Timeline. Leave it as it is for a re-pin, a typo or a moved `lines`
range.

Frontmatter holds `title`, `description`, `revision`, `revisionDate` and
`publishedAt` only; the page draws `title` as its heading, so the body has no
h1.
`title` is the concept's general name, as its docs or the field call it, never
Terrarium's own: at most four words in sentence case, with no leading article,
parentheses or code identifier unless that is the concept's name
(*CLAUDE.md*), and the tool's name in front only when the bare word is
ambiguous outside its Subject (*Claude Code hooks*). A Walkthrough's title names its story.
`description` is one sentence a visitor reads before clicking; quote it when it
holds a colon, or YAML misreads it. Each stays within its cap in `lengths` in
`layers/glassbox/page-checks.ts`, which also checks a Lesson title's word count
and each Why bullet's length (`ownWords`). The slug follows the title when a
page is written or promoted; a retitle keeps the URL.

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
  vuejs.org: `vuejs/docs/main/src/...`; nuxt.com: `nuxt/nuxt/main/docs/...`),
  confirm the exact URL and title in web search results, and say so in the
  PR. Zod links go to v3.zod.dev.
- **A second tool gets its own link** at its first mention, even though *The
  concept* ends on one Full reference.
- **Don't repeat a sibling page.** Check a Lesson's *Why it's built this way*
  and *What to watch for* against the other Lessons; give a reason another
  Lesson owns one sentence and link that Lesson.
- **Name the command.** A watch item about a stale `.nuxt/`, the type check or
  a restart names the command it applies to, after checking what the repo's
  `pnpm` scripts already run (`package.json`).
- **Terms.** Wrap a word the reader may not know in `:term[…]`. For each id
  with no `layers/glassbox/content/guide/terms/<id>.yml`, add one: `term`, a
  `definition` in Glass Box's own words, and `source`, the glossary that
  defines it, if one does. Check the definition against that glossary's
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

## Check

`git fetch origin main` first: the layer test skips its git checks when the
clone lacks `revision`. Then run
`pnpm exec vitest run layers/glassbox/tests/unit/glassbox-pages.spec.ts` and
`pnpm validate:content`. `pnpm exec tsx layers/glassbox/page-checks.ts` prints
warnings that never fail, a "so" clause in *In Terrarium* or an Excerpt over
15 lines: fix each, or keep a "so" clause that states mechanism and an Excerpt
the decision needs. After `pnpm build`, for a page whose layout, feature
or diagram changed, shoot it with `scripts/ui/preview.ts review <route>
<out-dir>` and look at all four shots (`docs/agents/verifying-ui-changes.md`).
Retake them after the last content edit. Done when both are green and, for a
shot page, each shot matches the page's shape in the glossary.
