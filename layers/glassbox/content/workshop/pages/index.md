---
title: Workshop
description: The latest changes to the guide, the notes the agents keep for their next run, and a detailed log of every run so far.
revision: fd3599e030281af21ff988c09235e5f704c04f37
revisionDate: 2026-11-06
---

This is the agents' working notebook for Glass Box, written for them rather than as a lesson. You are welcome to read along. [Back to the guide](/t/glassbox/guide).

## Lately

The newest changes the agents made to guide pages. Every run, with its reasons, is in the [Update log](#update-log).

::workshop-lately
::

## Agent notes

The agents that maintain this guide, alone or in a session with the owner, forget each run when it ends. So they leave themselves notes on what looks weak, what the owner asked for and what to try next, read first and rewritten last.

Each guide page is named by its title, then its file under `layers/glassbox/content/guide/pages/`. A Lesson teaches one concept, a Walkthrough follows one story across Lessons, and a Subject groups Lessons. A *pin* ties a page to one commit of the code it describes.

### Weak spots

- **The Installed Skills pages say little of their own.** *Planning skills* (`skill-pack/20.planning-with-the-pack`) and *Engineering skills* (`skill-pack/30.engineering-skills`) mostly describe Skills that come from outside Terrarium. Only a few of their facts are about choices Terrarium made.
- **Two Git & GitHub Lessons are long.** *Commit and PR attribution* (`git-github/60.attribution`) and *Issue triage labels* (`git-github/70.issue-triage-labels`) are each about 1,400 to 1,600 words. Both have been trimmed; look for a split only after a fresh reader finds them hard to follow.

### Recurring problems

- **New text has contained false claims.** Twice, a newly written page or fix said something its source contradicted, and it was only noticed a day later. Older text can be false too: a claim check found *Mermaid pre-rendering* saying unmapped colours fall back to Mermaid's own defaults, when they are fixed light colours.
- **Neighbouring pages repeat each other.** Most structural changes so far took a reason that two pages both explained and left it on just one of them.
- **Changes have been undone soon after.** *Prose overrides* and *Invariant tests* were added or kept by one run, then folded into another page a few runs later.

### The owner's direction

These are the owner's goals for the guide. A run builds toward them directly; a PR that adds a Lesson, changes a Subject or changes a Skill, the glassbox-lesson docs or the page checks waits for the owner's merge.

1. **Finish the web standards Subject.** It now holds *CSS custom properties*, *SVG*, *ARIA* and *Colour and motion settings*. Still open: no ADR or rule says binary images are kept out of the repository (the repo just holds none), so no page teaches that; and *ARIA* cites components and tests only, because no accessibility practice is recorded. Ask the owner whether to record one.
2. **Make structure and titles consistent.** Titles should name the general concept and follow one pattern within a Subject, and file names should match their titles.
3. **Fill what is missing entirely.** This covers a Lesson, or a whole Subject, for something Terrarium relies on that no page teaches yet.

### Good next focuses

1. **Decide how pages say "a person merges" a Human-only file.** Since the owner waiver (ADR-0004), an agent may merge one when the owner says so in the session. *Protected paths*, *Human-only* and the overview say so. These still state it flatly, each true as the default: *Path-specific rules*, *Decision records*, *Merge gate*, *Claude Code hooks* (twice), *Composite actions*, *Author trust*, *Cross-tenant reads* and *Asking an agent for a change*. Ask the owner whether to name the waiver there or keep one home.
2. **Check the pages whose claims the docs left silent** (see *Claims to check*), by reading the tool's source where the docs have no page.

3. **Check every Walkthrough diagram against its stops.** A diagram is read beside the stops (it now sits next to them on wide screens), so what it shows should roughly match the steps; a reader who can't match them gains nothing. It is a simplified picture, never a 1:1 copy: not every box or arrow needs a stop. Try to match, but not too hard, and keep it simple. So far the stops read better than the diagrams, so expect to redraw the diagram. Keep the same check for any new diagram. *A change goes live* is the model to match: a few boxes in a line, one side branch, no numbers.
4. **Re-order the Walkthroughs so a newcomer meets the most interesting first.** Put the stories an absolute newcomer will find most interesting first and niche topics last. Today `glassboxWalkthroughs` sorts them by title, so a new order needs a way to set it (for example a number prefix on the file name, as Lessons have); ask the owner how before building it.

### Wording fresh readers still find hard

None of these is false.

- **Claude Code.** *MCP servers*: one hint matches the whole server while the guards list tools, with no reason given (the sources give none; ask the owner or leave it a plain fact); "the `.sh` filter" and the hint's trigger words are hard to follow. *CLAUDE.md* uses *hint* and *guard* before defining them. *Path-specific rules*: the Human-only sentence is long and nested. *Claude Code permissions* says the untrusted-workspace fact in three places. *Claude Code skills*: "importance and role are the Inventory's own judgement" is unclear.
- **Hooks.** *Claude Code hooks*: the Human-only wiring is in both a Why and a What to watch bullet; *guard* and *hint* come before their definition; "every matching call starts the command" is also on *Hook-added context*; `agent_id` is also on *Session transcripts*. *Blocking hooks*: "hints and recorders", "pure check" and "shell pre-filters" come before they are glossed.
- **Agents.** *Subagents*: the background guard is named in both In Terrarium and Why; the page can't say what depth 1 means (no docs text in the repo). The spawn-depth paragraph is long, and the commit and own-folder points appear three times. *Workflow scripts*: the seedling sentence is a nested list, and "can't ask" sits beside the explore script turning an answer into a question. *Cloud sessions*: two bullets say nearly the same thing. *Scheduled tasks*: `/loop` driving a `disable-model-invocation` Skill is unexplained.
- **Git & GitHub.** *Pull requests*: one sentence ("from the review and the local Gate run before the PR opens to the merge") reads hard; *Trusted author* comes before its gloss. *Author trust*: the `trusted` label is "a display, not the check", yet a missing label means Public; the *OWNER isn't proof of a person* bullet is terse. *Issue triage labels* says only triage sets `ready-for-agent`, and later that a Trusted user's label is an approval; a reader can't tell whether a person sets it by hand. *Dependabot grouping*: why a 0.x minor counts as a major is not explained, and "the merge line" is jargon. *Git worktrees* says Session logs shows how the script tells a linked worktree, without saying how. *Git plumbing* never says why `commit-tree` takes `env` and the other calls `idxEnv`.
- **Walkthroughs.** *A bug report becomes work*: `wontfix (completed)` in the real case is not explained; stop 7 mixes the Trusted author with the Public requester. *A change goes live* stop 2 never says how long the pause is. *Asking an agent for a change*: stop 1 says a cloud and a local session work the same way, and stop 2 has the `SessionStart` hook install packages; both hold for Terrarium's usual one-repository session, and the Walkthrough could say so.
- **Installed skills and Deploy.** *Wayfinder* and *Planning a big change*: the installed Skill gives no reason research tickets may resolve more than one per session. *Planning skills*: `ready-for-agent`, `needs-triage` and *Agent Brief* are glossed only briefly. *Continuous deployment* and *pnpm and the lockfile* use *ADR*, *Merge gate* and *Content database* as bare pointers; *Continuous deployment* has no excerpt for the failed-install and Node-restart claims.
- **Terms glossed late.** Several pages use *Space*, *Document*, *Catalog* or *Tenant* before they are glossed, or gloss one twice (*Vue components*, *Hydration*, *File routing*, *queryCollection*). A short rule for where each is glossed first would settle it.
- **Other.** *Content validation*: the lede says a misspelt field passes the build, yet a schema-less `page` Collection is skipped by the check.

### Fixes waiting

- *Issue triage labels* is pinned before `docs/agents/triage-labels.md` gained its `harvest` exception (it says only triage sets the two ready labels, and its Excerpt lacks the exception). Re-pin it and show the exception.
- *Skill inventory*, *Scheduled tasks* and *Schema evolution* were only searched, not re-read, against the *Ideas and lessons learned* Lesson.
- *Hook-added context* and *Session transcripts* have not been re-read by a fresh reader since a pass whose reader never reported.
- The Corepack link on *pnpm and the lockfile* (`nodejs.org/api/corepack.html`) now redirects to GitHub; `nodejs.org/docs/latest-v22.x/api/corepack.html` is a candidate, and Corepack stops shipping with Node 25.
- The page 40 excerpt of `.agents/skills/auto-triage/SKILL.md` (*Wayfinder*) shifts to `lines="75-79"` once the pin moves past 2026-11-11.
- The comment above `DIAGRAM_TOKEN_FALLBACKS` in `app/utils/mermaid.ts` still says the fallbacks are Mermaid's base-theme defaults, which they are not (a code comment, outside this Skill's remit).
- The `harvest` Skill's own text (`SKILL.md:3,8`) says a Routine runs it; the owner says none does yet but one will. Fixing a Skill is outside this Skill's remit, so ask the owner. *Scheduled tasks* (`agents/40.scheduled-tasks`, which lists every Routine) leaves it out because `glassbox-update` once re-added it on the Skill's word; add it once the owner says a Routine exists.

### Topics with no page yet

- The `clear-backlog` loop changed: the builder triages review findings, resumes replace fresh fix rounds, the final gate is skipped on a clean first round, and a thin explore result is re-run (`.claude/workflows/clear-backlog-build.js`). Nearest page: *Workflow scripts*. It also has a retro step (§5 of `clear-backlog`); nearest *Self-improvement loop*. Unverified: the Scout read only commit lists.
- A Nuxt build peaks near 2.1 GB, and the live host has a 2 GB swapfile added after builds were killed (`deploy/README.md`): a sentence for *Continuous deployment* (`deploy/10.continuous-deployment`), not a page. The build line in the page footer (`shared/build-info.ts`, the commit and time of the build, on the home page and the Journal landing) is also a sentence for it.
- Each session rates every rule it was shown as *steered* or *backed*, kept in the log as `ruleUse` (`shared/schemas/session.ts`; `scripts/session/rule-use-report.ts` totals it). Nearest pages: *Pruning instructions* and *Session logs*.
- `docs/agents/verifying-ui-changes.md` says Linux screenshots can't confirm fixed-width text fit, and `scripts/ui/screenshot.ts` scrolls `--wait-for` captures to an `#anchor`: sentences for *Headless browser checks* (`verification/80.headless-browser-checks`). The browser quirks and CSS traps in that doc are only partly taught there.
- More web standards pages, looked at and left out: *View Transitions* (mostly a Nuxt hook, so it fits Nuxt & Vue), page metadata for link previews, container queries and a scroll-watching helper.

### Claims to check

Each may be true; a later run should read the tool's source or run it.

- *Content collections*: the docs say `prefix` defaults from the start of `include`, so `prefix: '/'` may be needless once `cwd` is set per Space.
- *Hydration*: Vue's `data-allow-mismatch` and Nuxt's `<ClientOnly>` are not taught.
- *pnpm and the lockfile*: the lead-in says pnpm.io's unversioned pages describe a newer major. The 12.x, 11.x and 10.x docs exist (`pnpm/pnpm.io` `versions.json`), but pnpm.io was blocked, so which major the unversioned pages show is unchecked.
- *Nitro server engine* (`nuxt-vue/60.nitro`): the dev cache path `.nuxt/cache/nitro/routes`, `cache: false`, a payload for a plain `cache` rule, and "Nuxt 4 runs Nitro v2".
- *Cloud sessions* (`agents/30.cloud-sessions`): that the proxy refuses `.github/workflows/` pushes and repository-settings writes.
- *Session transcripts* (`hooks/40.session-transcripts`): the record types and fields, the 2 KB preview, and a subagent's `transcript_path` inside tool hooks. *A session log lands on main* says "the `Stop` hook" in the singular, though four are wired.
- *Author trust* (`git-github/20.author-trust`): what each `author_association` value means, and that `pull_request_target` ignores the approval setting. *Dependabot grouping*: that `/` doesn't reach a nested action.
- *Linting* (`verification/50.linting`): the sentence on the rules `@nuxt/eslint` turns on and the absence of formatting rules.
- *Content validation* (`verification/30.content-validation`): the `?id=safeparse` anchor on v3.zod.dev, which loads only in a browser.

### Ideas still open

- *Engineering skills* could become part of *Installed skills* (`skill-pack/10.skill-packs`).

### Turned down by earlier runs

These are runs' own judgements, not rulings: each stays turned down until something in the repository changes the reason. Only what the owner or a review settled belongs in `DECISIONS.md`; when the owner confirms one of these, add a line there and delete it here.
- **Moving the timestamp rule and its warnings from *Content validation* (`verification/30.content-validation`) to *Zod refinements* (`verification/60.zod-refinements`).** Re-check the reasons for and against before acting.
- **Moving the warning to return only what a page reads from *Data fetching* (`nuxt-vue/70.data-fetching`) to *queryCollection* (`nuxt-content/40.query-collection`).** The related move the other way (from *queryCollection* to *Data fetching*) is also in this list.
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

## Update log

One agent editing session is a *curate run*, scheduled or with the owner. Each entry is that run's detailed log: its focus and why, then every page it touched, what changed and why. Lately above is the short version. Newest first.

::workshop-runs
::

