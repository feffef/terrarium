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

- **The Installed Skills pages say little of their own.** *Planning Skills* (`skill-pack/02.planning-with-the-pack`) and *Engineering Skills* (`skill-pack/03.engineering-skills`) mostly describe Skills that come from outside Terrarium. Only a few of their facts are about choices Terrarium made.
- **Two Git & GitHub Lessons are long.** *Commit and PR attribution* (`git-github/05.attribution`) and *Issue triage labels* (`git-github/06.work-queue`) are each about 1,400 to 1,600 words. Both have been trimmed; look for a split only after a fresh reader finds them hard to follow.
- **The drafts Space is empty.** A gap that isn't central goes there as a new draft.
- **The Claude Code, Hooks and Agents & automation Subjects still repeat each other.** The split moved pages without moving facts; the ideas below are about giving each fact one home.
- **File names and titles differ.** A review of every guide title found them sound (see Already decided). But 12 file names share no words with their titles, such as `agents/03.routines` (*Scheduled tasks*) and `nuxt-vue/06.use-async-data` (*Data fetching*); the others are `deploy/01.self-updating-container`, `git-github/01.every-change-a-pr`, `git-github/04.trust-tiers`, `git-github/06.work-queue`, `nuxt-content/01.manifest-collections`, `terrarium-practice/02.adrs`, `terrarium-practice/07.human-only-list`, `verification/04.unit-and-e2e-tests`, `verification/06.schema-validation` and `walkthroughs/adding-a-tenant`. Renaming a file changes its URL, and about 60 links in the guide use the old ones, so the PR lists each rename and its URL effect. The Journal's *Highlights* page links `agents/routines`, outside the Glass Box remit.

### Recurring problems

- **New text has contained false claims.** Twice, a newly written page or fix said something its source contradicted, and it was only noticed a day later.
- **Neighbouring pages repeat each other.** Most structural changes so far took a reason that two pages both explained and left it on just one of them.
- **Changes have been undone soon after.** Two pages were added to the guide, or kept, by one run and then folded into another page a few runs later: *Prose overrides* and *Invariant tests*.

### The owner's direction

These are the owner's goals for the guide. A run builds toward them directly; a PR that adds a Lesson, changes a Subject or changes a Skill, the glassbox-lesson docs or the page checks waits for the owner's merge.

1. **Finish the web standards Subject.** It now holds *CSS custom properties*, *SVG*, *ARIA* and *Colour and motion settings*. Still open: no ADR or rule says binary images are kept out of the repository (the repo just holds none), so no page teaches that; and *ARIA* cites components and tests only, because no accessibility practice is recorded. Ask the owner whether to record one.
2. **Make structure and titles consistent.** Titles should name the general concept and follow one pattern within a Subject, and file names should match their titles.
3. **Fill what is missing entirely.** This covers a Lesson, or a whole Subject, for something Terrarium relies on that no page teaches yet.

### Good next focuses

1. **Rename the 12 files to match their titles** (direction 2). The titles are settled, so nothing else blocks it. Update every guide link, the `checks/update.yml` page names and the owner-facing PR list.

### Ideas not yet decided

**More web standards pages, looked at and left out.** *View Transitions* (Tinkerfund's plugin, mostly about a Nuxt hook, so it fits Nuxt & Vue); page metadata for link previews and search engines (one Tenant's helper); container queries and a scroll-watching helper (one or two files each).

**Claude Code and Hooks: giving each fact one home.** In each case the first page keeps a short link.
- *MCP servers* explains how hooks pick out MCP tools by name. That belongs on *Blocking hooks*.
- *Session transcripts* explains how a session log is built from the transcript. That belongs on *Session logs* (`terrarium-practice/04.session-logs`).

**Installed Skills.** *Engineering Skills* could become part of *Installed Skills* (`skill-pack/01.skill-packs`).

**A fact about out-of-scope records that no Lesson teaches.** Before it recommends anything, `triage` reads every record in `.out-of-scope/` and shows the person deciding any that resembles the new request (`.agents/skills/triage/SKILL.md`, step 1). *Issue triage labels* (`git-github/06.work-queue`) teaches the records and their format but not this check. It could be one sentence there, or a section if that page is split after a fresh reader finds it hard to follow.

**Missing Lessons.** The browser quirks and CSS traps listed in `docs/agents/verifying-ui-changes.md` are only partly taught, in *Headless browser checks* (`verification/09.headless-browser-checks`).

**Ideas earlier runs rejected.** Before acting on one, re-check the reasons for and against.
- Moving the timestamp rule and its warnings from *Content validation* (`verification/03.content-validation`) to *Zod refinements* (`verification/06.schema-validation`).
- Moving the warning to return only what a page reads from *Data fetching* (`nuxt-vue/06.use-async-data`) to *queryCollection* (`nuxt-content/04.query-collection`). A related move the other way is under Already decided.

### Already decided

Earlier runs turned these down. Each stays turned down until something in the repository changes the reason.
- **Retitling the guide.** A run read every Lesson, Walkthrough and the overview in full and weighed 2 to 4 titles for each; only *Engineering Skills* changed (a capital S, to match *Installed Skills* and *Planning Skills*). Strongest rivals that lost: *Required status checks* for *Merge gate*, *Claude Code workflows* for *Workflow scripts*, *Continuous improvement* for *Self-improvement loop*, *Adding a Tenant* for *Adding a site*. The owner chose a capital S for Skills in titles and a plain *site* in *Adding a site*, because the overview says site first.
- **Folding *Planning Skills* into *Installed Skills*.** Planning Skills holds facts about Terrarium's own choices that would lose their page.
- **Moving the trust rules from *Human-in-the-loop agents* to *Author trust*.** The first page already links to the second.
- **Moving the rule about the `ready-for-agent` label into *Issue triage labels*.** That page already shows it.
- **Moving the payload-size reason from *queryCollection* to *Data fetching*.** Both pages already state it, so moving it gains nothing.
- **Moving the URL-resolver facts from *Multi-tenant isolation* to *File routing*.** They belong with isolation, because that is where their testability matters.
- **Merging *Engineering Skills* into *Planning Skills*.** That would undo a recent split.
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
