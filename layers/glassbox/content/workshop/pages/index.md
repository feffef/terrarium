---
title: Workshop
description: What the next Glass Box curate run should know now, the curate runs so far, and when glassbox-update last fully checked each guide page.
revision: fd3599e030281af21ff988c09235e5f704c04f37
revisionDate: 2026-11-06
---

This page is the working state of the Skills that improve Glass Box. It is not part of the textbook.

## Memory

Pages are named by their title, followed by their file under `layers/glassbox/content/guide/pages/`. Subject, Lesson, Walkthrough and draft mean what `layers/glassbox/GLOSSARY.md` says.

### Weak spots

- **The Installed Skills pages say little of their own.** *Planning skills* (`skill-pack/20.planning-with-the-pack`) and *Engineering skills* (`skill-pack/30.engineering-skills`) mostly describe Skills that come from outside Terrarium. Only a few of their facts are about choices Terrarium made.
- **Two Git & GitHub Lessons are long.** *Commit and PR attribution* (`git-github/60.attribution`) and *Issue triage labels* (`git-github/70.issue-triage-labels`) are each about 1,400 to 1,600 words. Both have been trimmed; look for a split only after a fresh reader finds them hard to follow.
- **The drafts Space is empty.** A gap that isn't central goes there as a new draft.
- **The Claude Code, Hooks and Agents & automation Subjects still repeat each other.** The split moved pages without moving facts; the ideas below are about giving each fact one home.

### Recurring problems

- **New text has contained false claims.** Twice, a newly written page or fix said something its source contradicted, and it was only noticed a day later.
- **Neighbouring pages repeat each other.** Most structural changes so far took a reason that two pages both explained and left it on just one of them.
- **Changes have been undone soon after.** Two pages were added to the guide, or kept, by one run and then folded into another page a few runs later: *Prose overrides* and *Invariant tests*.

### The owner's direction

These are the owner's goals for the guide. A run builds toward them directly; a PR that adds a Lesson, changes a Subject or changes a Skill, the glassbox-lesson docs or the page checks waits for the owner's merge.

1. **Finish the web standards Subject.** It now holds *CSS custom properties*, *SVG*, *ARIA* and *Colour and motion settings*. Still open: no ADR or rule says binary images are kept out of the repository (the repo just holds none), so no page teaches that; and *ARIA* cites components and tests only, because no accessibility practice is recorded. Ask the owner whether to record one.
2. **Make structure and titles consistent.** Titles should name the general concept and follow one pattern within a Subject, and file names should match their titles.
3. **Fill what is missing entirely.** This covers a Lesson, or a whole Subject, for something Terrarium relies on that no page teaches yet.

### Order of the guide

Subjects and Lessons run prerequisites first, and Lesson prefixes go up in tens (10, 20, 30…) so a new Lesson fits between two others. The owner ruled that agent tooling comes first and Web standards never sits between the two Nuxt Subjects. Pages link each other in loops, so the order puts the broader concept first and its use later. A page that links a later one in its body is expected.

### Good next focuses

1. **Back more Lessons with the official docs.** Earlier runs wrote some Lessons while docs sites were blocked. A run on 2026-11-07 re-read the docs for ten (*Content collections*, *Multi-tenant isolation*, *Content database*, *queryCollection*, *Vue components*, *Hydration*, *Testing*, *Zod refinements*, *Schema evolution*, *Continuous deployment*). The same check is still open for pages whose claims came from npm packages or raw GitHub files: the other Nuxt & Vue Lessons (`nuxt-vue/10` to `40`, `60`, `70`), *Type checking*, *Content validation*, *Linting* and *Headless browser checks* in Verification, the Git & GitHub pages that link docs.github.com, and *Mermaid pre-rendering*. A fresh run can fetch each URL and check each tool claim; the writer needs the network open.

### Ideas not yet decided

**More web standards pages, looked at and left out.** *View Transitions* (Tinkerfund's plugin, mostly about a Nuxt hook, so it fits Nuxt & Vue); page metadata for link previews and search engines (one Tenant's helper); container queries and a scroll-watching helper (one or two files each).

**Claude Code and Hooks: giving each fact one home.** In each case the first page keeps a short link.
- *MCP servers* explains how hooks pick out MCP tools by name. That belongs on *Blocking hooks*.
- *Session transcripts* explains how a session log is built from the transcript. That belongs on *Session logs* (`terrarium-practice/40.session-logs`).

**Installed Skills.** *Engineering skills* could become part of *Installed skills* (`skill-pack/10.skill-packs`).

**A fact about out-of-scope records that no Lesson teaches.** Before it recommends anything, `triage` reads every record in `.out-of-scope/` and shows the person deciding any that resembles the new request (`.agents/skills/triage/SKILL.md`, step 1). *Issue triage labels* (`git-github/70.issue-triage-labels`) teaches the records and their format but not this check. It could be one sentence there, or a section if that page is split after a fresh reader finds it hard to follow.

**Doc findings left alone on 2026-11-07.** *Content collections*: the docs say a `prefix` defaults from the static part of `include`, so `prefix: '/'` may be redundant once `cwd` is set per Space (not checked in code). *Content database*: on a repeat visit in production the browser reads its dump from `localStorage`, so the Try it step may not show the dump request; clearing site data first would make it reliable. *Hydration*: Vue 3.5's `data-allow-mismatch` and Nuxt's `<ClientOnly>` are not taught. *Vue components*: the Vue docs allow some composables to be called inside a lifecycle hook, so "never later from a timer or a click handler" reads stricter than they do. *Multi-tenant isolation* and *Content database* both explain the `database` option; one could link the other. A fresh reader finds the *In Terrarium* sentences of *Content collections* and *Testing* crowded with term glosses; `plain.ts` prints every gloss inline, so check that on the rendered page first.

**Missing Lessons.** The browser quirks and CSS traps listed in `docs/agents/verifying-ui-changes.md` are only partly taught, in *Headless browser checks* (`verification/80.headless-browser-checks`).

**Ideas earlier runs rejected.** Before acting on one, re-check the reasons for and against.
- Moving the timestamp rule and its warnings from *Content validation* (`verification/30.content-validation`) to *Zod refinements* (`verification/60.zod-refinements`).
- Moving the warning to return only what a page reads from *Data fetching* (`nuxt-vue/70.data-fetching`) to *queryCollection* (`nuxt-content/40.query-collection`). A related move the other way is under Already decided.

### Already decided

Earlier runs turned these down. Each stays turned down until something in the repository changes the reason.
- **Guide titles.** Every Lesson, Walkthrough and the overview has been weighed against 2 to 4 alternatives; the owner's rulings are in DECISIONS.md. Closest rivals that lost: *Required status checks* for *Merge gate*, *Claude Code workflows* for *Workflow scripts*, *Adding a Tenant* for *Adding a site*.
- **Folding *Planning skills* into *Installed skills*.** *Planning skills* holds facts about Terrarium's own choices that would lose their page.
- **Moving the trust rules from *Human-in-the-loop agents* to *Author trust*.** The first page already links to the second.
- **Moving the rule about the `ready-for-agent` label into *Issue triage labels*.** That page already shows it.
- **Moving the payload-size reason from *queryCollection* to *Data fetching*.** Both pages already state it, so moving it gains nothing.
- **Moving the URL-resolver facts from *Multi-tenant isolation* to *File routing*.** They belong with isolation, because that is where their testability matters.
- **Merging *Engineering skills* into *Planning skills*.** That would undo a recent split.
- **A Lesson on git hooks.** The repo has one hook, `.githooks/commit-msg`, and *Commit and PR attribution* already teaches hooks and trailers; a separate Lesson would repeat it.
- **Splitting the unattended triage sweep out of *Issue triage labels*.** It came too soon after the page last changed. The page's length is still a problem.

## Curate runs

Newest first.

::workshop-runs
::

## Update checks

When glassbox-update last fully checked each guide page, oldest check first.

::workshop-checks
::
