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

The agents that maintain this guide, alone or in a session with the owner, forget each run when it ends. So they leave themselves notes on what looks weak, what the owner asked for and what to try next, read first and rewritten last.

Each guide page is named by its title, then its file under `layers/glassbox/content/guide/pages/`. A Lesson teaches one concept, a Walkthrough follows one story across Lessons, and a Subject groups Lessons. A *pin* ties a page to one commit of the code it describes.

### Weak spots

- **A mechanical lowercase pass left the overview alone.** Check its glossary terms by hand after the owner's own edit of it lands. New text tends to capitalise terms again, so a run that adds text checks its own lines for them.
- **The Walkthroughs sit in alphabetical order.** The owner wants a meaningful one: the stories that matter most to a newcomer about how agents and humans work together first, and the niche deployment story last. `glassboxWalkthroughs` in `layers/glassbox/app/utils/subjects.ts` sorts them by title and the files have no prefix, so the order needs a code change, which waits for the owner's merge.
- **The Installed Skills pages say little of their own.** *Planning skills* (`skill-pack/20.planning-with-the-pack`) and *Engineering skills* (`skill-pack/30.engineering-skills`) mostly describe Skills that come from outside Terrarium. Only a few of their facts are about choices Terrarium made.

### Recurring problems

- **New text has contained false claims.** Twice, a newly written page or fix said something its source contradicted, and it was only noticed a day later. Older text can be false too: a claim check found *Mermaid pre-rendering* saying unmapped colours fall back to Mermaid's own defaults, when they are fixed light colours.

### The owner's direction

These are the owner's goals for the guide. A run builds toward them directly; a PR that adds a Lesson, changes a Subject or changes a Skill, the glassbox-lesson docs or the page checks waits for the owner's merge.

1. **Finish the web standards Subject.** It holds *CSS custom properties*, *SVG*, *ARIA* and *Colour and motion settings*. Still open: no ADR or rule says binary images are kept out of the repository (the repo just holds none), so no page teaches that; and *ARIA* cites components and tests only, because no accessibility practice is recorded. Ask the owner whether to record one.
2. **Make structure and titles consistent.** Titles should name the general concept and follow one pattern within a Subject, and file names should match their titles.
3. **Fill what is missing entirely.** This covers a Lesson, or a whole Subject, for something Terrarium relies on that no page teaches yet.

### Good next focuses

1. **Decide how pages say "a person merges" a Human-only file.** Since the owner waiver (ADR-0004), an agent may merge one when the owner says so in the session. *Protected paths*, *Human-only* and the overview say so. These still state it flatly, each true as the default: *Path-specific rules*, *Decision records*, *Merge gate*, *Claude Code hooks* (twice), *Composite actions*, *Cross-tenant reads* and *Asking an agent for a change*. Ask the owner whether to name the waiver there or keep one home.

2. **Check every Walkthrough diagram against its stops.** A diagram is read beside the stops (on wide screens it sits next to them), so what it shows should roughly match the steps; a reader who can't match them gains nothing. It is a simplified picture, never a 1:1 copy: not every box or arrow needs a stop. Try to match, but not too hard, and keep it simple. The stops read better than the diagrams, so expect to redraw the diagram. Keep the same check for any new diagram. *A change goes live* is the model to match: a few boxes in a line, one side branch, no numbers.

3. **Strengthen the weak "Try it in your project" sections.** The owner finds some of them weak. Rewrite the ones with no concrete step or no way to see it worked. Still advice only: *Planning skills*, *Wayfinder*, most House rules.

### Wording fresh readers still find hard

None of these is false.

- **Claude Code.** *Claude Code skills* and *Claude Code permissions* still use *gate*, *ADR* and *journal* without a gloss. *MCP servers*: no source says why the read-first hint matches the whole server while the guards list tools; ask the owner or leave it a plain fact. The "Matched by name, or by server" section puts prose between its two Excerpts, so the first reads as the only example. *Claude Code skills*: the close-session Excerpt shows mostly one dense step, not "a goal and numbered steps".
- **Hooks.** *Blocking hooks*: the guards-wiring Excerpt does not show the `guards` and `entries` variables it uses. *Session transcripts*: "ground truth" is unglossed; `isMeta` and the 2 KB preview have no source in the docs, only in the scripts. Across the four pages, the `|| true` mechanics are taught on three and "hooks see a subagent's calls" on three; one home each would be shorter.
- **Agents.** *Subagents*: the Skill excerpt says impl agents cannot spawn subagents before the depth-1 explanation, so it reads as clashing with the three-layer default; "the cloud launcher", `merge-pr.ts` and `Monitor` come before any gloss. *Workflow scripts*: the `pipeline()` multi-stage form has no source beyond the script; the build Excerpt names `round`, `AXES` and `REVIEW` without saying what they are. *Cloud sessions*: no source says whether the agent proxy and the GitHub proxy are one, and the page has one Why bullet. *Scheduled tasks*: the routine list is long and mixes terms never glossed (digest, harvest, seedling); `environment-caveats.md` is cited three times in the watch bullets. *Inspecting past sessions*: "header" is not glossed outside the excerpt; `flatten.ts` and `search.ts` have no example selector.
- **Git & GitHub.** *Dependabot grouping*: no source says why Terrarium counts a 0.x minor as a major (the page gives the Semantic Versioning rule only), nor why `merge-pr.ts` refuses a Dependabot pull request that touches any file besides `package.json` and the lockfile. *Issue triage labels* and *Commit and PR attribution* are still dense in In Terrarium, with many Skill and function names in a row. The Excerpt that first shows `harvest`, `auto-triage` and the guest pipeline on *Issue triage labels* sits before their glosses; a shorter excerpt would fix it. *Pull requests* leans on a bare "Session logs follows it there" pointer.
- **Walkthroughs.** *A bug report becomes work*: `wontfix (completed)` in the real case is not explained; stop 7 mixes the Trusted author with the Public requester. *A change goes live* stop 2 never says how long the pause is. *Asking an agent for a change*: stop 1 says a cloud and a local session work the same way, and stop 2 has the `SessionStart` hook install packages; both hold for Terrarium's usual one-repository session, and the Walkthrough could say so.
- **Installed skills.** *Wayfinder*: the installed Skill gives no reason a session resolves one ticket and research tickets are excepted; "HITL", "frontier" and "fog" arrive as a list before any example, and Fog and Not yet specified are two names for one section. *Planning skills*: the installed `to-spec` labels `ready-for-agent` but Terrarium overrides it, which a reader meets before the rule; the `auto-triage` file-sharing mechanism sits beside "a brief names no files". *Installed skills*: *ADR* is never glossed, and the gate protects only a Skill that has an Inventory entry, which the page says late. *Engineering skills*: `implement`, which no agent can start, is followed by the build agent without a page saying why that is allowed.
- **Nuxt Content.** *Content collections* and *queryCollection* still pack several terms into one sentence beside the manifest, the kind and the search query. *Multi-tenant isolation*: `useSpace`, `pagesKey` and `path` come before their gloss, and the catalog's one-table-at-a-time reads are explained late. *Content database*: no source says why a failed download is retried once, and `tenant-layers.md` is cited without its content. *MDC components*: no Nuxt Content docs are installed to show the YAML-props form. *Mermaid pre-rendering*: sentinel colour is a word the page never defines, and who serves the font is easy to misread.
- **Web standards.** *SVG*: the Tinkerfund byte budget (4096 for a figure, 1024 for an icon) has no stated reason; the code comment only names a story. *ARIA*: no source says why the Journal's row is a `div` and not a `button`. The Atlas stylesheet's header comment says the base tokens are on `.atlas` while the code sets them on `:root` (a code comment, outside this Skill's remit).
- **Terms glossed late.** Several pages use *space*, *document*, *catalog* or *tenant* before they gloss them, or gloss one twice. A rule for where each is glossed first would settle it.
- **House rules.** *Session logs*: the log "skips the gate" but a gated script limits it, which reads as a contradiction until the Why bullet. *Protected paths*: `humanMergeWaiver`'s lead-in does not say it can return nothing. *Skill inventory*: it is unclear which script deletes observations.
- **Nuxt & Vue.** *Auto-imports*: the `imports.scan` Try-it paragraph packs four options. *Virtual modules*: it is unchecked whether `modules/routing` is registered twice (listed in `nuxt.config.ts` and found in `modules/`); the first Excerpt does not show the `expand(loadManifests())` call it names. *Vue components*: the clock Excerpt does not show where `ticking` is set. *Nitro*: mount, driver and LRU come before any gloss, and "a request is split three ways" lists roles. *Data fetching*: onramp and its tour are unexplained. *Hydration*: the Friction Ledger page "does the same" with no code shown.

### Fixes waiting

- The page 40 excerpt of `.agents/skills/auto-triage/SKILL.md` (*Wayfinder*) shifts to `lines="75-79"` once the pin moves past 2026-11-11.

- **Verification.** *Zod refinements*: no source says why the `pages` rule ties the `page` type to the name `pages`. *Headless browser checks*: no repo source says who sets up the cloud proxy; the `--no-sandbox` and `--disable-gpu` flags have only the code comment "the flags every launch needs in this sandbox".

### Topics with no page yet

- The `clear-backlog` loop changed: the builder triages review findings, resumes replace fresh fix rounds, the final gate is skipped on a clean first round, and a thin explore result is re-run (`.claude/workflows/clear-backlog-build.js`). Nearest page: *Workflow scripts*. It also has a retro step (§5 of `clear-backlog`); nearest *Self-improvement loop*. Unverified: the Scout read only commit lists.
- The `clear-backlog` skill opens with one owner interaction phase (grilling, then prototype samples with numbered approval questions, then the first build run); no builder or reviewer runs before it ends (`.agents/skills/clear-backlog/SKILL.md`). Nearest page: *Workflow scripts*, which could say the build starts after that phase. Unverified: the Scout read the diffs of two commits only.
- Each session rates every rule it was shown as *steered* or *backed*, kept in the log as `ruleUse` (`shared/schemas/session.ts`; `scripts/session/rule-use-report.ts` totals it). Nearest pages: *Pruning instructions* and *Session logs*.

### Claims to check

Each may be true; a later run should read the tool's source or run it.

- *pnpm and the lockfile*: the lead-in says pnpm.io's unversioned pages describe a newer major. The 12.x, 11.x and 10.x docs exist (`pnpm/pnpm.io` `versions.json`), but pnpm.io was blocked, so which major the unversioned pages show is unchecked.
- *Session transcripts* (`hooks/40.session-transcripts`): the record types and fields, the 2 KB preview, and a subagent's `transcript_path` inside tool hooks. *A session log lands on main* says "the `Stop` hook" in the singular, though four are wired.
- *Author trust* (`git-github/20.author-trust`): what each `author_association` value means, and that `pull_request_target` ignores the approval setting. *Dependabot grouping*: that `/` doesn't reach a nested action.

### Soft decisions

Decisions agents made (run, review, claim check). Not rules: the owner or a later agent may overrule one with evidence, or drop it once changed content makes it obsolete. Write each here as it is made, with what decided it. Only what the owner settled in a session goes in `owner-decisions.md`; when the owner confirms one of these, move it there.
- **A guard is any hook that can block, a `Stop` blocker included.** `docs/agents/guards.md` lists the three Stop blockers in its Guard column, so *Claude Code hooks* defines a guard that way and a hint as a hook that only adds advice (a fresh reader found the `PreToolUse`-only wording clashing with the roster).
- **Author trust keeps its title.** It is clearer than the field name, and its lede names `author_association` (review).
- **A missing `publishedAt` on a page whose teaching hasn't changed is not a deficit.** Adding one shows an old page on the Commons Timeline as new (review).
- **Continuous deployment's Full reference stays Wikipedia.** A practice has no official docs (review).
- **Agent tooling comes first in the guide's order, and Web standards never sits between the two Nuxt Subjects**.
- **Guide titles.** Every title has been weighed against 2 to 4 alternatives; owner rulings are in owner-decisions.md. Closest rivals that lost: *Required status checks* for *Merge gate*, *Claude Code workflows* for *Workflow scripts*.
- **Folding *Planning skills* into *Installed skills*.** *Planning skills* holds facts about Terrarium's own choices that would lose their page.
- **`wontfix` is the fifth triage state.** *Issue triage labels* lists four states first and names `wontfix` as the fifth: `docs/agents/triage-labels.md` says skills name five roles (claim check).
- **A Git & GitHub page may keep a one-clause pointer to a fact a sibling owns.** A page that must stand alone says in a clause how a linked worktree is told (*Git worktrees*, owned by *Session logs*), what a cloud session is, what the guest pipeline is and what a PreToolUse hook is; the sibling keeps the full account (overlap check).
- **A fresh reader's complaint about a long bracket or a lost link is often the rendering.** `plain.ts` puts each term's definition inside the sentence and strips link syntax from code, so such findings are checked against the page before they are acted on.

## Update log

One agent editing session is a *curate run*, scheduled or with the owner. Each entry is that run's detailed log: its focus and why, then every page it touched, what changed and why. Lately above is the short version. Newest first.

::workshop-runs
::

