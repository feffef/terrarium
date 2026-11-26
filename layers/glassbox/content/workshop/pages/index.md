---
title: Workshop
description: The latest changes to the guide, the notes the agents keep for their next run, and a detailed log of every run.
revision: fd3599e030281af21ff988c09235e5f704c04f37
revisionDate: 2026-11-06
---

This is the agents' working notebook for Glass Box, written for them rather than as a lesson. You are welcome to read along. [Back to the guide](/t/glassbox/guide).

## Lately

The newest changes the agents made to guide pages. Every run, with its reasons, is in the [Update log](#update-log).

::workshop-lately
::

## Agent notes

The agents that maintain this guide, alone or in a session with the owner, forget everything when a session ends. So they leave themselves notes on what looks weak, what the owner asked for and what to try next, read first and rewritten last.

Each guide page is named by its title, then its file under `layers/glassbox/content/guide/pages/`. A Lesson teaches one concept, a Walkthrough follows one story across Lessons, and a Subject groups Lessons. A *pin* ties a page to one commit of the code it describes.

### Weak spots

- **The Installed Skills pages say little of their own.** *Planning skills* (`skill-pack/20.planning-with-the-pack`) and *Engineering skills* (`skill-pack/30.engineering-skills`) mostly describe Skills that come from outside Terrarium. Only a few of their facts are about choices Terrarium made.

### Recurring problems

- **New text has contained false claims.** Twice, a newly written page or fix said something its source contradicted, and it was only noticed a day later. Older text can be false too: a claim check found *Mermaid pre-rendering* saying unmapped colours fall back to Mermaid's own defaults, when they are fixed light colours.

### The owner's direction

These are the owner's goals for the guide. A run builds toward them directly; a PR that adds a Lesson, changes a Subject or changes a Skill, the glassbox-lesson docs or the page checks waits for the owner's merge.

1. **Finish the web standards Subject.** It holds *CSS custom properties*, *SVG*, *ARIA*, *Colour and motion settings*, *Web Storage* and *Colour contrast*.
2. **Make structure and titles consistent.** Titles should name the general concept and follow one pattern within a Subject, and file names should match their titles.
3. **Fill what is missing entirely.** This covers a Lesson, or a whole Subject, for something Terrarium relies on that no page teaches yet.

### Wording fresh readers still find hard

None of these is false.


- **Claude Code.** *MCP servers*: no source says why the read-first hint matches the whole server while the guards list tools; ask the owner or leave it a plain fact.
- **Hooks.** *Session transcripts*: `isMeta` has no source in the docs.
- **Agents.** *Usability testing*: "the run", "brief" and "lens" come before a gloss in In Terrarium. *Workflow scripts*: the `pipeline()` multi-stage form has no source beyond the script. *Cloud sessions*: no source says whether the agent proxy and the GitHub proxy are one, and the page has one Why bullet. *Inspecting past sessions*: "ADR" is not glossed before the first excerpt.
- **Git & GitHub.** *Dependabot grouping*: no source says why Terrarium counts a 0.x minor as a major (the page gives the Semantic Versioning rule only), nor why `merge-pr.ts` refuses a Dependabot pull request that touches any file besides `package.json` and the lockfile. *Issue triage labels* and *Commit and PR attribution* are still dense in In Terrarium, with many Skill and function names in a row. *Path-based labels*: the Why bullet on copied areas names no alternative to copying, and the friction-ledger sentence in In Terrarium is a long detour from path labelling.
- **Terrarium practice.** *Skill inventory*: the Why bullets give a reason but rarely a cost or an alternative, and the audit paragraph in In Terrarium is one long sentence-chain.
- **Walkthroughs.** *A bug report becomes work*: stop 7 mixes the Trusted author with the Public requester. *Asking an agent for a change*: stop 1 says a cloud and a local session work the same way, and stop 2 has the `SessionStart` hook install packages; both hold for Terrarium's usual one-repository session, and the Walkthrough could say so.
- **Installed skills.** *Wayfinder*: the installed Skill gives no reason a session resolves one ticket and research tickets are excepted; "HITL", "frontier" and "fog" arrive as a list before any example. *Engineering skills*: `implement`, which no agent can start, is followed by the build agent without a page saying why that is allowed.
- **Nuxt Content.** *Content collections* and *queryCollection* still pack several terms into one sentence beside the manifest, the kind and the search query. *Multi-tenant isolation*: `useSpace`, `pagesKey` and `path` come before their gloss, and the catalog's one-table-at-a-time reads are explained late. *Content database*: no source says why a failed download is retried once, and `tenant-layers.md` is cited without its content. *MDC components*: no Nuxt Content docs are installed to show the YAML-props form. *Mermaid pre-rendering*: sentinel colour is a word the page never defines, and who serves the font is easy to misread.
- **Web standards.** *SVG*: the Tinkerfund byte budget (4096 for a figure, 1024 for an icon) has no stated reason; the code comment only names a story. *ARIA*: no source says why the Journal's row is a `div` and not a `button`. *CSS custom properties*: the Journal's dark-mode override is described but not shown, and `<style scoped>` and `v-bind()` come before any token is used. *Colour contrast*: WCAG's levels and how brightness is worked out are not explained.
### Fixes waiting


- **Verification.** *Zod refinements*: no source says why the `pages` rule ties the `page` type to the name `pages`. *Headless browser checks*: no repo source says who sets up the cloud proxy; the `--no-sandbox` and `--disable-gpu` flags have only the code comment "the flags every launch needs in this sandbox".

### Stale or missing

- Minimum touch-target size (WCAG 2.5.8, 24px): the fix grows a small control's hit area with `padding-block` and an equal negative margin so the layout holds still, and an e2e test at 390px asserts the height; no page teaches it (commit 91117f6f6). Nearest page: *ARIA* (`web-standards/30.aria.md`).

### Waiting for owner decision

- **Binary images.** No ADR or rule says binary images are kept out of the repository (the repo just holds none), so no web standards page teaches that. Ask the owner whether to record one.
- **ARIA.** *ARIA* cites components and tests only, because no accessibility practice is recorded. Ask the owner whether to record one.
- **Chips per row.** The owner capped the overview at three chips a row. Walkthrough stops may hold five, and several rows in other Walkthroughs hold four or five. Ask the owner whether the cap covers them.
- **Decide how pages say "a person merges" a Human-only file.** Since the owner waiver (ADR-0004), an agent may merge one when the owner says so in the session. *Protected paths*, *Human-only* and the overview say so. These still state it flatly, each true as the default: *Path-specific rules*, *Decision records*, *Merge gate*, *Claude Code hooks* (twice), *GitHub Actions*, *Cross-tenant reads* and *Asking an agent for a change*. Ask the owner whether to name the waiver there or keep one home.
- No page teaches how the `glassbox-curate` Skill runs in two modes (a loop session and an instruction session) and pauses for `glassbox-update`; a textbook about its own upkeep may not suit the guide. Nearest page: *Scheduled tasks*.
- The Lesson on horizontal overflow sits in drafts until a usability Subject has more lessons (owner, on the PR).

### Claims to check

Each may be true; a later run should read the tool's source or run it.

- *pnpm and the lockfile*: the lead-in says pnpm.io's unversioned pages describe a newer major. The 12.x, 11.x and 10.x docs exist (`pnpm/pnpm.io` `versions.json`), but pnpm.io was blocked, so which major the unversioned pages show is unchecked.
- *Session transcripts* (`hooks/40.session-transcripts`): the record types and fields, the 2 KB preview, and a subagent's `transcript_path` inside tool hooks.

### Soft decisions

Decisions agents made (run, review, claim check). Not rules: the owner or a later agent may overrule one with evidence, or drop it once changed content makes it obsolete. Write each here as it is made, with what decided it. Only what the owner settled in a session goes in `owner-decisions.md`; when the owner confirms one of these, move it there.
- **Walkthroughs are ordered by file prefix, not title.** Nine stories, from how a request becomes a merged PR to how a file reaches the browser last; a new one takes the number between two others, as Lessons do. A session log reaching `main` comes before a friction becoming a fix: the owner says logs on `main` are what lets frictions be picked up.
- **A guard is any hook that can block, a `Stop` blocker included.** `docs/agents/guards.md` lists the three Stop blockers in its Guard column, so *Claude Code hooks* defines a guard that way and a hint as a hook that only adds advice (a fresh reader found the `PreToolUse`-only wording clashing with the roster).
- **Author trust keeps its title.** It is clearer than the field name, and its lede names `author_association` (review).
- **A missing `publishedAt` on a page whose teaching hasn't changed is not a deficit.** Adding one shows an old page on the Commons Timeline as new (review).
- **Continuous deployment's Full reference stays Wikipedia.** A practice has no official docs (review).
- **Agent tooling comes first in the guide's order, and Web standards never sits between the two Nuxt Subjects**.
- **Guide titles.** Every title has been weighed against 2 to 4 alternatives; owner rulings are in owner-decisions.md. Closest rivals that lost: *Required status checks* for *Merge gate*, *Claude Code workflows* for *Workflow scripts*.
- **Web Storage sits in the guide, not drafts.** Glass Box, the Journal and Tinkerfund all keep browser state in it, so the topic is central (a new Lesson goes to drafts only when it is not central).
- **Folding *Planning skills* into *Installed skills*.** *Planning skills* holds facts about Terrarium's own choices that would lose their page.
- **`wontfix` is the fifth triage state.** *Issue triage labels* lists four states first and names `wontfix` as the fifth: `docs/agents/triage-labels.md` says skills name five roles (claim check).
- **A Git & GitHub page may keep a one-clause pointer to a fact a sibling owns.** A page that must stand alone says in a clause how a linked worktree is told (*Git worktrees*, owned by *Session logs*), what a cloud session is, what the guest pipeline is and what a PreToolUse hook is; the sibling keeps the full account (overlap check).
- **A fresh reader's complaint about a long bracket or a lost link is often the rendering.** `plain.ts` puts each term's definition inside the sentence and strips link syntax from code, so such findings are checked against the page before they are acted on.

## Update log

A *curate run* is one focus and its pull request; one session can hold many. Each entry is that run's detailed log: its focus and why, then every page it touched, what changed and why. Lately above is the short version. Newest first.

::workshop-runs
::

