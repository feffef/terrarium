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

1. **Re-read the Claude Code, Hooks and Agents & automation Subjects for repeats and density.** They were checked against the docs on 2026-11-09, not de-duplicated. A fresh reader found them heavy with undefined repo terms (*Human-only*, *Friction*, *Routine*), and found two cross-page loose ends: `|| true` is explained as deliberate only in *Hook-added context*, while *Blocking hooks* calls it a bug that lets a guard fail open; and a reader cannot tell from *Claude Code skills* how a Routine starts a Skill whose model invocation is off.
2. **Re-pin the overview.** `index` is pinned to an older commit because only one sentence was checked after the pin moved. Read its Routines and Skills paragraphs against `main`, then move the pin.
3. **Check the docs again for the pages whose claims the docs left silent** (the list under *Doc findings not acted on*), by reading the tool's source where the docs have no page.

### Ideas not yet decided

**More web standards pages, looked at and left out.** *View Transitions* (Tinkerfund's plugin, mostly about a Nuxt hook, so it fits Nuxt & Vue); page metadata for link previews and search engines (one Tenant's helper); container queries and a scroll-watching helper (one or two files each).

**Installed Skills.** *Engineering skills* could become part of *Installed skills* (`skill-pack/10.skill-packs`).

**A fact about out-of-scope records that no Lesson teaches.** Before it recommends anything, `triage` reads every record in `.out-of-scope/` and shows the person deciding any that resembles the new request (`.agents/skills/triage/SKILL.md`, step 1). *Issue triage labels* (`git-github/70.issue-triage-labels`) teaches the records and their format but not this check. It could be one sentence there, or a section if that page is split after a fresh reader finds it hard to follow.

**Doc findings not acted on.**
- *Content collections*: the docs say `prefix` defaults from the start of `include`, so `prefix: '/'` may be needless once `cwd` is set per Space. Not checked in code.
- *Content database*: on a repeat visit the browser may read its dump from `localStorage`, so the Try it step may not show the dump request. Clearing site data first would fix that.
- *Hydration*: Vue's `data-allow-mismatch` and Nuxt's `<ClientOnly>` are not taught.
- *Multi-tenant isolation* and *Content database* both explain the `database` option; one could link the other.
- *pnpm and the lockfile*: the lead-in says pnpm.io's unversioned pages describe a newer major. The 12.x, 11.x and 10.x docs exist (`pnpm/pnpm.io` `versions.json`), but pnpm.io was blocked, so which major the unversioned pages show is unchecked.

**Doc checks of 2026-11-09, claims the docs were silent on.** Each may be true; a later run should read the tool's source or run it.
- *Subagents* (`agents/10.subagents`): "only a subagent's payload carries an agent id". The hooks docs say `agent_type` also appears under `--agent` and say nothing on whether `agent_id` ever appears outside a subagent. *Claude Code hooks* says the same of `agent_type` alone.
- *Nitro server engine* (`nuxt-vue/60.nitro`): the dev cache path `.nuxt/cache/nitro/routes` (the Nitro docs say a temporary directory), `cache: false`, a payload for a plain `cache` rule, and "Nuxt 4 runs Nitro v2".
- *Cloud sessions* (`agents/30.cloud-sessions`): that the proxy refuses `.github/workflows/` pushes and repository-settings writes.
- *Scheduled tasks* (`agents/40.scheduled-tasks`): that a Routine's prompt arrives as the first turn like a typed command, and that a `disable-model-invocation` Skill runs from a Routine prompt. The Skills docs say a session-scoped scheduled task that fires such a Skill is stopped; a cloud Routine is a different case.
- *Session transcripts* (`hooks/40.session-transcripts`): the record types and fields, the 2 KB preview, and a subagent's `transcript_path` inside tool hooks.
- *Author trust* (`git-github/20.author-trust`): what each `author_association` value means, and that `pull_request_target` ignores the approval setting. *Dependabot grouping*: that `/` doesn't reach a nested action.
- *Linting* (`verification/50.linting`): the sentence on the rules `@nuxt/eslint` turns on and the absence of formatting rules.
- *Content validation* (`verification/30.content-validation`): the `?id=safeparse` anchor on v3.zod.dev, which loads only in a browser.
- *Hooks* (`hooks/10.hooks`): the `network-start.ts` SessionStart hook is not mentioned.

**Missing Lessons.** The browser quirks and CSS traps listed in `docs/agents/verifying-ui-changes.md` are only partly taught, in *Headless browser checks* (`verification/80.headless-browser-checks`).

**Ideas earlier runs rejected.** Before acting on one, re-check the reasons for and against.
- Moving the timestamp rule and its warnings from *Content validation* (`verification/30.content-validation`) to *Zod refinements* (`verification/60.zod-refinements`).
- Moving the warning to return only what a page reads from *Data fetching* (`nuxt-vue/70.data-fetching`) to *queryCollection* (`nuxt-content/40.query-collection`). A related move the other way is under Already decided.

### Already decided

Earlier runs turned these down. Each stays turned down until something in the repository changes the reason.
- **Moving the MCP tool-name matcher from *MCP servers* to *Blocking hooks*.** The `mcp__<server>__.*` form is about how MCP names tools, and the page's Why bullet on it is one sentence that links *Claude Code hooks*.
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
