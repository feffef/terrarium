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

- **The Installed Skills pages say little of their own.** *Planning Skills* (`skill-pack/02.planning-with-the-pack`) and *Engineering skills* (`skill-pack/03.engineering-skills`) mostly describe Skills that come from outside Terrarium. Only a few of their facts are about choices Terrarium made.
- **Two Git & GitHub Lessons are too long.** *Commit and PR attribution* (`git-github/05.attribution`) and *Issue triage labels* (`git-github/06.work-queue`) are the longest pages in the guide.
- **The Claude Code Subject is tangled.** Several of its pages explain the same mechanisms, and most of the open ideas below are about moving facts between them.
- **Titles are uneven.** Some name Terrarium's own choice instead of the general concept. Within one Subject, some titles start with the tool's name ("Claude Code hooks") and their neighbours don't ("Subagents").

### Recurring problems

- **New text has contained false claims.** Twice, a newly written page or fix said something its source contradicted, and it was only noticed a day later.
- **Neighbouring pages repeat each other.** Most structural changes so far took a reason that two pages both explained and left it on just one of them.
- **Changes have been undone soon after.** Two pages were added to the guide, or kept, by one run and then folded into another page a few runs later: *Prose overrides* and *Invariant tests*.

### The owner's direction

These are the owner's goals for the guide. A new Subject needs the owner's approval.

1. **Split the Claude Code Subject.** One possible split, based on what each page is about:
   - telling Claude what to do: *CLAUDE.md*, *Path-specific rules* and *Claude Code Skills*;
   - hooks: *Claude Code hooks*, *Blocking hooks*, *Hook-added context* and *Session transcripts*;
   - agents and automation: *Subagents*, *Workflow scripts*, *Scheduled tasks* and *Cloud sessions*.

   *MCP servers* and *Claude Code permissions* would go wherever what they teach fits best.
2. **Add a web standards Subject** for CSS and SVG. It would include how Terrarium keeps binary image files out of the repository by using SVG. Pages and code to start from:
   - *CSS custom properties* (`nuxt-vue/07.css-custom-properties`);
   - *Mermaid pre-rendering* (`nuxt-content/07.mermaid-pre-rendering`), which turns diagrams into SVG files;
   - `app/utils/svg.ts`, which checks SVG before a page shows it. Today the guide mentions it only as a linting example.
3. **Make structure and titles consistent.** Titles should name the general concept and follow one pattern within a Subject, and file names should match their titles.
4. **Retire the drafts.** Done: no draft pages are left.
5. **Fill what is missing entirely.** This covers a Lesson, or a whole Subject, for something Terrarium relies on that no page teaches yet.

### Good next focuses

1. **Propose the Claude Code split** (direction 1), using the ideas about its pages below.
2. **Make titles consistent** (direction 3), one Subject at a time.
3. **Prepare the web standards Subject** (direction 2) as an issue for the owner, listing the pages it would hold.

### Ideas not yet decided

**Claude Code: giving each fact one home.** In each case the first page keeps a short link.
- *Path-specific rules* explains the hook that reminds agents to read an ADR (a decision record in `docs/adr/`). That belongs on *Hook-added context*.
- *Hook-added context* explains how a hint is shown only once per session by looking it up in the transcript. That belongs on *Session transcripts*.
- *MCP servers* explains how hooks pick out MCP tools by name. That belongs on *Blocking hooks*.
- *Session transcripts* explains how a session log is built from the transcript. That belongs on *Session logs* (`terrarium-practice/04.session-logs`).

**Installed Skills.** *Engineering skills* could become part of *Installed Skills* (`skill-pack/01.skill-packs`).

**Git & GitHub.** *Commit and PR attribution* also teaches git hooks, a separate topic that could get its own Lesson.

**Missing Lessons.**
- **UI checks.** The scripts in `scripts/ui/` (preview, screenshots) are mentioned only on *Subagents*. Check whether this is really a gap before writing a Lesson.

**Ideas earlier runs rejected.** Before acting on one, re-check the reasons for and against.
- Moving the timestamp rule and its warnings from *Content validation* (`verification/03.content-validation`) to *Zod refinements* (`verification/06.schema-validation`).
- Moving the warning to return only what a page reads from *Data fetching* (`nuxt-vue/06.use-async-data`) to *queryCollection* (`nuxt-content/04.query-collection`). A related move the other way is under Already decided.

### Already decided

Earlier runs turned these down. Each stays turned down until something in the repository changes the reason.
- **Folding *Planning Skills* into *Installed Skills*.** Planning Skills holds two facts about Terrarium's own choices that would lose their page.
- **Moving the trust rules from *Human-in-the-loop agents* to *Author trust*.** The first page already links to the second.
- **Moving the rule about the `ready-for-agent` label into *Issue triage labels*.** That page already shows it.
- **Moving the payload-size reason from *queryCollection* to *Data fetching*.** Both pages already state it, so moving it gains nothing.
- **Moving the URL-resolver facts from *Multi-tenant isolation* to *File routing*.** They belong with isolation, because that is where their testability matters.
- **Merging *Engineering skills* into *Planning Skills*.** That would undo a recent split.
- **Splitting the unattended triage sweep out of *Issue triage labels*.** It came too soon after the page last changed. The page's length is still a problem.

## Curate runs

Newest first.

::workshop-runs
::

## Update checks

When glassbox-update last fully checked each guide page, oldest check first.

::workshop-checks
::
