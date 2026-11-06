---
title: Workshop
description: What the next Glass Box curate run should know now, the curate runs so far, and when glassbox-update last fully checked each guide page.
revision: fd3599e030281af21ff988c09235e5f704c04f37
revisionDate: 2026-11-06
---

Working state of the Glass Box improvement Skills. It is not part of the textbook.

## Memory

### Weak spots

- **Installed Skills:** `skill-pack/02.planning-with-the-pack` and `03.engineering-skills` mostly retell upstream Skills, with little decided by Terrarium.
- **Overlong Git & GitHub Lessons:** `05.attribution` and `06.work-queue`; `05` teaches git hooks inside a page about attribution.
- **Claude Code** is the most tangled Subject: most open moves shuffle facts between its pages (Leads).
- **Uneven titles:** some name Terrarium's choice instead of the concept, some carry the tool's name and their neighbours don't.

### Recurring problems

- **Freshly written text carries false claims.** A new Lesson and a fix both shipped claims the source contradicted, found a day later.
- **Neighbouring Lessons restate each other.** Most structural changes so far moved a restated reason to its one home.
- **Churn.** Pages promoted or kept were folded a few runs later (Prose overrides, Invariant tests).

### Direction (the owner's)

1. **Split the Claude Code Subject** (Weak spots). A possible cut: instructions (`01`–`03`), hooks (`04`–`06`, `13`), agents and automation (`07`, `09`–`11`), with `08` and `12` placed by what they teach.
2. **Add a web standards Subject** for CSS and SVG, including how Terrarium keeps binary image files out of the repo. Candidates to move or draw on: `nuxt-vue/07.css-custom-properties`, `nuxt-content/07.mermaid-pre-rendering`, and `app/utils/svg.ts` (now only a lint example on `verification/05.linting`).
3. **Make structure and titles consistent:** concept names, the same pattern across a Subject (with or without the tool's name), file stems that match titles.
4. **Retire the drafts:** promote or remove each one until the drafts Space is empty.
5. **Fill what is missing entirely:** a Lesson, or a Subject, that Terrarium relies on and no page teaches.

A new Subject needs the owner's approval.

### Next focuses

1. Claude Code split (direction 1): propose the cut, using the hooks leads below.
2. The last draft, `walkthroughs/a-newcomers-first-hour` (direction 4): its blockers are a stale pin, a long description and no `publishedAt`; the case against is that three of its eight stops tour the Journal.
3. Titles (direction 3), one Subject at a time.
4. Git plumbing Lesson (direction 5).
5. Web standards Subject (direction 2): an issue for the owner with the proposed pages.

### Leads

**Claude Code** (each moves facts to one home, the source page keeping a link):
- `02.path-scoped-rules` → `06.hook-added-context`: the `adr-read-hint` paragraph.
- `06.hook-added-context` → `13.session-transcripts`: the subagent-reader watch item and the say-once mechanism.
- `08.mcp-servers` → `05.blocking-hooks`: the matcher Excerpts and the Name-tools-not-the-server reason.
- `13.session-transcripts` → `terrarium-practice/04.session-logs`: the Session logs paragraph.

**Installed Skills:** fold `skill-pack/03.engineering-skills` into `01.skill-packs`.

**Git & GitHub:** a git hooks Lesson, taking that part out of `05.attribution`.

**Missing Lessons:**
- Git plumbing: building a commit without a checkout, which the session-log lander relies on; only a Walkthrough stop shows it.
- UI checks (`scripts/ui/`): named only on `claude-code/07.subagents`. Not yet confirmed as a gap.

**Contested** (earlier runs ruled the other way; settle before acting):
- `verification/03.content-validation` → `06.schema-validation`: the timestamp refinement and its watch items.
- `nuxt-vue/06.use-async-data` → `nuxt-content/04.query-collection`: the payload-size watch item.

### Decided

Turned down by earlier runs; each stays decided until something on `main` changes its reason.
- Fold `skill-pack/02.planning-with-the-pack` into `01.skill-packs`: it would leave Terrarium's own two facts (the wayfinder mapping, the ready-for-agent rule) with no Lesson.
- Move the two-tier rule from `terrarium-practice/01.human-in-the-loop` to `git-github/04.trust-tiers`: it already links there.
- Move the do-not-apply-ready-for-agent rule to `git-github/06.work-queue`: its Excerpt already holds it.
- Move the payload-size reason from `nuxt-content/04.query-collection` to `nuxt-vue/06.use-async-data`: both state it; not worth the move.
- Move the resolver facts from `nuxt-content/02.multi-tenant-isolation` to `nuxt-vue/02.file-routing`: isolation keeps the resolver's testability.
- Merge `skill-pack/03.engineering-skills` into `02.planning-with-the-pack`: it would undo a recent split.
- Split the triage sweep out of `git-github/06.work-queue`: too soon after its last change; its length is still a live problem.

## Curate runs

Newest first.

::workshop-runs
::

## Update checks

When glassbox-update last fully checked each guide page, oldest check first.

::workshop-checks
::
