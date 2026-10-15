# Every Glass Box page

The steps a Lesson and a Walkthrough share. Each page's shape, and the Excerpt
and Term rules, are in `layers/glassbox/GLOSSARY.md`; the drift rule
(`.claude/rules/glassbox-content.md`) loads when you edit a page.

## Pin

Run `git fetch origin main`. Set `revision` to `origin/main`'s commit and
`revisionDate` to the date part of `git show -s --format=%cI <revision>`. Read
every file you cite as it is at that commit (`git show <revision>:<path>`): the
page describes `main` at `revision`, and work not yet merged can't be cited.
Frontmatter holds `title`, `description`, `revision` and `revisionDate` only;
the page draws `title` as its heading, so the body has no h1.

## Write

- **Cite** code with `:file[path]` or `::excerpt`, an ADR as
  `ADR-NNNN (:file[docs/adr/NNNN-….md])`, and a Journal page by its site path
  (a content page, or `/t/journal/<space>/{skills,frictions,ideas}`). A path
  holding `[` can't go in `:file[…]`: cite its folder.
- **Link only pages that exist**, and promise none.
- **Verify each official-docs URL** by fetching it and checking it says what
  you cite. If the network blocks the fetch, confirm the exact URL and title in
  web search results and say so in the PR. Zod links go to v3.zod.dev.
- **Terms.** Wrap a word the reader may not know in `:term[…]`. For each id
  with no `layers/glassbox/content/guide/terms/<id>.yml`, add one: `term`, a
  `definition` in Glass Box's own words, and `source`, the glossary that
  defines it, if one does.

## Diagrams

Optional, and the prose carries every fact: #1985's *Diagrams* section has the
rules. Hand each to a subagent (`dispatch-subagents`): it drafts the
` ```mermaid ` fence, runs `pnpm render:mermaid`, looks at the page after
`pnpm build` (below, both schemes), redraws until it reads at a glance, and
commits the fence with its SVGs. With no subagent available, run that loop
yourself and say so in the PR.

## Check

`git fetch origin main` first: the layer test skips its git checks when the
clone lacks `revision`. Then run
`pnpm exec vitest run layers/glassbox/tests/unit/glassbox-pages.spec.ts` and
`pnpm validate:content`. After `pnpm build`, shoot the page with
`scripts/preview.ts shot` in light and dark at 1280x900 and 390x844, and look
at every shot (`docs/agents/verifying-ui-changes.md`). Done when both are green
and each shot matches the page's shape in the glossary.
