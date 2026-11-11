---
title: Workshop
description: What the next Glass Box curate run should know now, the curate runs so far, and when glassbox-update last fully checked each guide page.
revision: fd3599e030281af21ff988c09235e5f704c04f37
revisionDate: 2026-11-06
---

This is the agents' notebook for Glass Box: what they think is weak in the guide, what the owner asked for, and every editing run, newest first. It is written for them, not as a lesson, and you are welcome to read along. [Back to the guide](/t/glassbox/guide).

## Lately

The newest changes the agents made to guide pages. Every run, with its reasons, is under Curate runs.

::workshop-lately
::

## Memory

Each guide page is named by its title, then its file under `layers/glassbox/content/guide/pages/`. A Lesson teaches one concept, a Walkthrough follows one story across Lessons, and a Subject groups Lessons. A *pin* ties a page to one commit of the code it describes. This *memory* is what each run rereads first and rewrites last.

### Weak spots

- **The Installed Skills pages say little of their own.** *Planning skills* (`skill-pack/20.planning-with-the-pack`) and *Engineering skills* (`skill-pack/30.engineering-skills`) mostly describe Skills that come from outside Terrarium. Only a few of their facts are about choices Terrarium made.
- **Two Git & GitHub Lessons are long.** *Commit and PR attribution* (`git-github/60.attribution`) and *Issue triage labels* (`git-github/70.issue-triage-labels`) are each about 1,400 to 1,600 words. Both have been trimmed; look for a split only after a fresh reader finds them hard to follow.
- **The drafts Space is empty.** A gap that isn't central goes there as a new draft.

### Recurring problems

- **New text has contained false claims.** Twice, a newly written page or fix said something its source contradicted, and it was only noticed a day later. Older text can be false too: a claim check of the 2026-11-10 Nuxt Content pass found *Mermaid pre-rendering* saying unmapped colours fall back to Mermaid's own defaults, when they are fixed light colours.
- **Neighbouring pages repeat each other.** Most structural changes so far took a reason that two pages both explained and left it on just one of them.
- **Changes have been undone soon after.** Two pages were added to the guide, or kept, by one run and then folded into another page a few runs later: *Prose overrides* and *Invariant tests*.

### The owner's direction

These are the owner's goals for the guide. A run builds toward them directly; a PR that adds a Lesson, changes a Subject or changes a Skill, the glassbox-lesson docs or the page checks waits for the owner's merge.

1. **Finish the web standards Subject.** It now holds *CSS custom properties*, *SVG*, *ARIA* and *Colour and motion settings*. Still open: no ADR or rule says binary images are kept out of the repository (the repo just holds none), so no page teaches that; and *ARIA* cites components and tests only, because no accessibility practice is recorded. Ask the owner whether to record one.
2. **Make structure and titles consistent.** Titles should name the general concept and follow one pattern within a Subject, and file names should match their titles.
3. **Fill what is missing entirely.** This covers a Lesson, or a whole Subject, for something Terrarium relies on that no page teaches yet.

### Good next focuses

1. **Re-read the Subjects not yet de-duplicated.** Git & GitHub, Installed skills, Deploy, the Walkthroughs and Claude Code have had this pass (2026-11-11). Last read on 2026-11-10 and not since: Agents, Hooks, Nuxt Content, Web standards, Verification, Nuxt & Vue. In House rules only *Protected paths* and *Ubiquitous language* changed; the other seven pages were read and left alone.
2. **Decide how pages say "a person merges" a Human-only file.** Since the owner waiver (ADR-0004), an agent may merge one when the owner says so in the session. *Protected paths*, *Human-only* and the overview say so. These still state it flatly, each true as the default: *Path-specific rules*, *Decision records*, *Merge gate*, *Claude Code hooks* (twice), *Composite actions*, *Author trust*, *Cross-tenant reads* and *Asking an agent for a change*. Ask the owner whether to name the waiver there or keep one home.
3. **Check the docs again for the pages whose claims the docs left silent** (the list under *Doc findings not acted on*), by reading the tool's source where the docs have no page.

### Ideas not yet decided

**More web standards pages, looked at and left out.** *View Transitions* (Tinkerfund's plugin, mostly about a Nuxt hook, so it fits Nuxt & Vue); page metadata for link previews and search engines (one Tenant's helper); container queries and a scroll-watching helper (one or two files each).

**Left over from the 2026-11-10 Claude Code pass.** A fresh reader still found these; none is false.
- *MCP servers* says one hint matches the whole server while the guards list tools, and gives no reason for the difference (the sources give none; ask the owner or leave it as a plain fact).
- *CLAUDE.md* uses *hint* and *guard* before defining them; the hooks Subject defines both.
- *Path-specific rules* and *CLAUDE.md* both say a rule can't order a step, and the *Short ADR summaries* and "Every ADR also has a summary rule" passages overlap a little.
- The Claude Code permission-modes docs say a mod, not only a `PreToolUse` hook, can approve a `dontAsk` call; the page names the hook only.

**Left over from the 2026-11-10 Agents and Hooks passes.** Fresh readers still found these; none is false.
- *Claude Code hooks*: the lede says a hook runs "every time", yet a several-repository session runs none; the Human-only wiring is in both a Why and a What to watch bullet; "every matching call starts the command" is also on *Hook-added context*; `agent_id` is also on *Session transcripts*.
- *Hook-added context*: the stale-push hint adds its fix every time while the page says a hint says things once; the page says so itself.
- *Subagents*: the background guard is named in both In Terrarium and Why; the page can't say what depth 1 means (no docs text in the repo).
- *Cloud sessions*: the lede says the other cases get "less", the list says "nothing".
- *Scheduled tasks*: the cadence rule is still stated in three places.

**Topics the Scout found with no page (2026-11-10).** A Nuxt build peaks near 2.1 GB, and the live host has a 2 GB swapfile added after builds were killed (`deploy/README.md`); a sentence for *Continuous deployment* (`deploy/10.continuous-deployment`), not a page. Also: each session now rates every rule it was shown as *steered* (it changed what the session did) or *backed* (it matched what the session was doing). The session log keeps this as `ruleUse` (`shared/schemas/session.ts`, `scripts/session/rule-use.ts`), a hook answers a bare `echo rule-use:` call with the list, `scripts/session/rule-use-report.ts` totals it per rule, and the Journal session card shows it. Nearest pages: *Pruning instructions* (`terrarium-practice/50.pruning-instructions`) and *Session logs* (`terrarium-practice/40.session-logs`). Also: `docs/agents/verifying-ui-changes.md` now says Linux screenshots can't confirm fixed-width text fit; nearest page *Headless browser checks* (`verification/80.headless-browser-checks`).

**Left over from the 2026-11-10 Nuxt Content, Web standards, Verification and Nuxt & Vue passes.** Fresh readers found these; none is false.
- Several pages use *Space*, *Document*, *Catalog* or *Tenant* before they are glossed, or gloss one twice (*Vue components*, *Hydration*, *File routing*, *queryCollection*). A short rule for where each is glossed first would settle it.
- *Mermaid pre-rendering*: the comment above `DIAGRAM_TOKEN_FALLBACKS` in `app/utils/mermaid.ts` still says the fallbacks are Mermaid's base-theme defaults, which they are not (outside this run's remit; a code comment).
- *Content validation*: the lede says the build passes with a misspelt field, yet a `page` Collection with no schema is skipped by the check.
- *Testing* never says what the `L2` in `setupL2()` means beyond `tests/README.md`; *Headless browser checks* gives no reason for `--no-sandbox` (the sources give none).

**Left over from the 2026-11-11 Git & GitHub pass.** A fresh reader still found these; none is false.
- *Pull requests*: one sentence runs "from the review and the local Gate run before the PR opens to the merge" and reads hard; *Trusted author* is used before it is glossed.
- *Author trust*: the `trusted` label is "a display, not the check", yet a missing label means Public; the *OWNER isn't proof of a person* bullet is terse. *Issue triage labels* says only triage sets `ready-for-agent`, and later that a Trusted user's `ready-for-agent` label is an approval; a reader can't tell whether a person sets it by hand.
- *Dependabot grouping*: why a 0.x minor counts as a major is not explained, and "the merge line" is jargon.
- *Git worktrees* and *Git plumbing*: *Git worktrees* says Session logs shows how the script tells a linked worktree, without saying how; *Git plumbing* never says why `commit-tree` takes `env` and the other calls `idxEnv`.

**Left over from the 2026-11-11 Walkthroughs and Claude Code pass.** Fresh readers found these; none is false.
- *A bug report becomes work*: `wontfix (completed)` in the real case is not explained; stop 7 mixes the Trusted author with the Public requester. *A change goes live* stop 2 never says how long the pause is.
- *MCP servers*: "the `.sh` filter" and the hint's trigger words are hard to follow. *Claude Code permissions* says the untrusted-workspace fact in three places. *Claude Code skills*: "importance and role are the Inventory's own judgement" is unclear.
- *Path-specific rules*: the Human-only sentence is long and nested.

**Installed Skills.** *Engineering skills* could become part of *Installed skills* (`skill-pack/10.skill-packs`).

**Left over from the 2026-11-11 Installed skills and Deploy pass.** Fresh readers still found these; none is false.
- *Wayfinder* and *Planning a big change*: the installed Skill gives no reason research tickets may resolve more than one per session. *Planning skills*: `ready-for-agent`, `needs-triage` and *Agent Brief* are glossed only briefly.
- *Continuous deployment* and *pnpm and the lockfile* use *ADR*, *Merge gate* and *Content database* as bare pointers; *Continuous deployment* has no excerpt for the failed-install and Node-restart claims.
- The Corepack link on *pnpm and the lockfile* (`nodejs.org/api/corepack.html`) now redirects to GitHub; Node 22's docs page `nodejs.org/docs/latest-v22.x/api/corepack.html` is a candidate, and Corepack stops shipping with Node 25.
- The page 40 excerpt of `.agents/skills/auto-triage/SKILL.md` (*Wayfinder*) shifts to `lines="75-79"` once the pin moves past 2026-11-11.

**Topics the Scout found with no page (2026-11-11).** The `harvest` Skill (files up to 10 `ready-for-human` Seedling issues from ideas and learnings in session logs, at most 3 about workflow; `.agents/skills/harvest/SKILL.md`). The owner said on 2026-11-11 that no Routine runs it yet but one will. Once it does, add it to *Scheduled tasks* (`agents/40.scheduled-tasks`, which lists every Routine) and ask the owner whether it belongs in *Self-improvement loop* (`terrarium-practice/80.self-improvement-loop`). The build line in the page footer (`shared/build-info.ts`, shows the commit and time of the build on the home page and the Journal landing): a sentence for *Continuous deployment*. `scripts/ui/screenshot.ts` scrolls `--wait-for` captures to an `#anchor`: a sentence for *Headless browser checks* (`verification/80.headless-browser-checks`).

**Doc findings not acted on.**
- *Content collections*: the docs say `prefix` defaults from the start of `include`, so `prefix: '/'` may be needless once `cwd` is set per Space. Not checked in code.
- *Hydration*: Vue's `data-allow-mismatch` and Nuxt's `<ClientOnly>` are not taught.
- *pnpm and the lockfile*: the lead-in says pnpm.io's unversioned pages describe a newer major. The 12.x, 11.x and 10.x docs exist (`pnpm/pnpm.io` `versions.json`), but pnpm.io was blocked, so which major the unversioned pages show is unchecked.

**Doc checks of 2026-11-09, claims the docs were silent on.** Each may be true; a later run should read the tool's source or run it.
- *Nitro server engine* (`nuxt-vue/60.nitro`): the dev cache path `.nuxt/cache/nitro/routes` (the Nitro docs say a temporary directory), `cache: false`, a payload for a plain `cache` rule, and "Nuxt 4 runs Nitro v2".
- *Cloud sessions* (`agents/30.cloud-sessions`): that the proxy refuses `.github/workflows/` pushes and repository-settings writes.
- *Scheduled tasks* (`agents/40.scheduled-tasks`): that a Routine's prompt arrives as the first turn like a typed command, and that a `disable-model-invocation` Skill runs from a Routine prompt. The Skills docs say a session-scoped scheduled task that fires such a Skill is stopped; a cloud Routine is a different case.
- *Session transcripts* (`hooks/40.session-transcripts`): the record types and fields, the 2 KB preview, and a subagent's `transcript_path` inside tool hooks.
- *Author trust* (`git-github/20.author-trust`): what each `author_association` value means, and that `pull_request_target` ignores the approval setting. *Dependabot grouping*: that `/` doesn't reach a nested action.
- *Linting* (`verification/50.linting`): the sentence on the rules `@nuxt/eslint` turns on and the absence of formatting rules.
- *Content validation* (`verification/30.content-validation`): the `?id=safeparse` anchor on v3.zod.dev, which loads only in a browser.
- *Asking an agent for a change* (`walkthroughs/asking-for-a-change`): stop 1 says a cloud session and a local one work the same way, and stop 2 has the `SessionStart` hook install packages. *Claude Code hooks* now says a session on several repositories, or a project thread, runs none of the committed hooks. Both hold for Terrarium's usual one-repository session; the Walkthrough could say so. *A session log lands on main* says "the `Stop` hook" in the singular, though four are wired.

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
