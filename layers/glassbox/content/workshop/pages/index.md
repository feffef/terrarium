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

- **The Installed Skills pages say little of their own.** *Planning skills* (`skill-pack/20.planning-with-the-pack`) and *Engineering skills* (`skill-pack/30.engineering-skills`) mostly describe Skills that come from outside Terrarium. Only a few of their facts are about choices Terrarium made.
- **Only the overview and the Git & GitHub, Claude Code, Hooks and Agents & automation pages write glossary terms in lowercase.** The owner's rule (`owner-decisions.md`) is that a glossary term is lowercase in body text, mid-sentence. The other Subjects and the Walkthroughs still write Skill, Tenant, Routine, Gate and the like. Fix it a Subject at a time; it is wording only. A capital stays at the start of a sentence, in a linked page's exact title, in code and in an Excerpt.
- **Two Git & GitHub Lessons are long.** *Commit and PR attribution* (`git-github/60.attribution`) and *Issue triage labels* (`git-github/70.issue-triage-labels`) are each about 1,400 to 1,600 words. Both have been trimmed; look for a split only after a fresh reader finds them hard to follow.

### Recurring problems

- **New text has contained false claims.** Twice, a newly written page or fix said something its source contradicted, and it was only noticed a day later. Older text can be false too: a claim check found *Mermaid pre-rendering* saying unmapped colours fall back to Mermaid's own defaults, when they are fixed light colours.
- **Neighbouring pages repeat each other.** Most structural changes took a reason that two pages both explained and left it on just one of them.

### The owner's direction

These are the owner's goals for the guide. A run builds toward them directly; a PR that adds a Lesson, changes a Subject or changes a Skill, the glassbox-lesson docs or the page checks waits for the owner's merge.

1. **Finish the web standards Subject.** It holds *CSS custom properties*, *SVG*, *ARIA* and *Colour and motion settings*. Still open: no ADR or rule says binary images are kept out of the repository (the repo just holds none), so no page teaches that; and *ARIA* cites components and tests only, because no accessibility practice is recorded. Ask the owner whether to record one.
2. **Make structure and titles consistent.** Titles should name the general concept and follow one pattern within a Subject, and file names should match their titles.
3. **Fill what is missing entirely.** This covers a Lesson, or a whole Subject, for something Terrarium relies on that no page teaches yet.

### Good next focuses

1. **Decide how pages say "a person merges" a Human-only file.** Since the owner waiver (ADR-0004), an agent may merge one when the owner says so in the session. *Protected paths*, *Human-only* and the overview say so. These still state it flatly, each true as the default: *Path-specific rules*, *Decision records*, *Merge gate*, *Claude Code hooks* (twice), *Composite actions*, *Cross-tenant reads* and *Asking an agent for a change*. Ask the owner whether to name the waiver there or keep one home.
2. **Check the pages whose claims the docs left silent** (see *Claims to check*), by reading the tool's source where the docs have no page.

3. **Check every Walkthrough diagram against its stops.** A diagram is read beside the stops (on wide screens it sits next to them), so what it shows should roughly match the steps; a reader who can't match them gains nothing. It is a simplified picture, never a 1:1 copy: not every box or arrow needs a stop. Try to match, but not too hard, and keep it simple. The stops read better than the diagrams, so expect to redraw the diagram. Keep the same check for any new diagram. *A change goes live* is the model to match: a few boxes in a line, one side branch, no numbers.
4. **Re-order the Walkthroughs so a newcomer meets the most interesting first.** Put the stories an absolute newcomer will find most interesting first and niche topics last. `glassboxWalkthroughs` sorts them by title, so a new order needs a way to set it (for example a number prefix on the file name, as Lessons have); ask the owner how before building it.

### Wording fresh readers still find hard

None of these is false.

- **Claude Code.** *MCP servers*: no source says why the read-first hint matches the whole server while the guards list tools; ask the owner or leave it a plain fact. *Claude Code skills* and *Claude Code permissions* still use *gate*, *ADR* and *journal* without a gloss.
- **Hooks.** *Claude Code hooks*: the Human-only wiring is in both a Why and a What to watch bullet; *guard* and *hint* come before their definition; "every matching call starts the command" is also on *Hook-added context*; `agent_id` is also on *Session transcripts*. *Blocking hooks*: "hints and recorders", "pure check" and "shell pre-filters" come before they are glossed.
- **Agents.** *Subagents*: the Skill excerpt says impl agents cannot spawn subagents before the depth-1 explanation, so it reads as clashing with the three-layer default; "the cloud launcher" is unexplained. *Workflow scripts*: the first sentence on the clear-backlog Skill is long, and the `pipeline()` multi-stage form has no source beyond the script. *Cloud sessions*: "untrusted workspace" is unexplained, and no source says whether the agent proxy and the GitHub proxy are one. *Scheduled tasks*: the `disable-model-invocation` fact is told in the concept and again in In Terrarium. *Inspecting past sessions*: "header" is not glossed outside the excerpt.
- **Git & GitHub.** *Dependabot grouping*: no source says why Terrarium counts a 0.x minor as a major (the page gives the Semantic Versioning rule only), nor why `merge-pr.ts` refuses a Dependabot pull request that touches any file besides `package.json` and the lockfile. *Issue triage labels* and *Commit and PR attribution* are still dense in In Terrarium, with many Skill and function names in a row. The Excerpt that first shows `harvest`, `auto-triage` and the guest pipeline on *Issue triage labels* sits before their glosses; a shorter excerpt would fix it. *Pull requests* leans on a bare "Session logs follows it there" pointer.
- **Walkthroughs.** *A bug report becomes work*: `wontfix (completed)` in the real case is not explained; stop 7 mixes the Trusted author with the Public requester. *A change goes live* stop 2 never says how long the pause is. *Asking an agent for a change*: stop 1 says a cloud and a local session work the same way, and stop 2 has the `SessionStart` hook install packages; both hold for Terrarium's usual one-repository session, and the Walkthrough could say so.
- **Installed skills and Deploy.** *Wayfinder* and *Planning a big change*: the installed Skill gives no reason research tickets may resolve more than one per session. *Planning skills*: `ready-for-agent`, `needs-triage` and *Agent Brief* are glossed only briefly. *Continuous deployment* and *pnpm and the lockfile* use *ADR*, *Merge gate* and *Content database* as bare pointers; *Continuous deployment* has no excerpt for the failed-install and Node-restart claims.
- **Terms glossed late.** Several pages use *Space*, *Document*, *Catalog* or *Tenant* before they are glossed, or gloss one twice (*Vue components*, *Hydration*, *File routing*, *queryCollection*). A short rule for where each is glossed first would settle it.
- **Other.** *Content validation*: the lede says a misspelt field passes the build, yet a schema-less `page` Collection is skipped by the check.

### Fixes waiting

- *Skill inventory*, *Scheduled tasks* and *Schema evolution* were only searched, not re-read, against the *Ideas and lessons learned* Lesson.
- *Hook-added context* and *Session transcripts* have not been re-read by a fresh reader since a pass whose reader never reported.
- The Corepack link on *pnpm and the lockfile* (`nodejs.org/api/corepack.html`) redirects to GitHub; `nodejs.org/docs/latest-v22.x/api/corepack.html` is a candidate, and Corepack stops shipping with Node 25.
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

- The overview names neither web standards, how agents reach things (cloud sessions, permissions, MCP, worktrees) nor dependencies (lockfile, Dependabot). The owner chose other gaps for it; add one only with a reason.
- `plain.ts` (the fresh readers' view of a page) could keep link syntax in code and show each term's definition after its sentence, not inside it; a change to a Skill's script waits for the owner.
- The overview uses *CI* and *ADR-0004* without saying what they are, and "spec" and "stories" are glossed only in a clause.

### Soft decisions

Decisions agents made (run, review, claim check). Not rules: the owner or a later agent may overrule one with evidence, or drop it once changed content makes it obsolete. Write each here as it is made, with what decided it. Only what the owner settled in a session goes in `owner-decisions.md`; when the owner confirms one of these, move it there.
- **Author trust keeps its title.** It is clearer than the field name, and its lede names `author_association` (review).
- **A missing `publishedAt` on a page whose teaching hasn't changed is not a deficit.** Adding one shows an old page on the Commons Timeline as new (review).
- **Continuous deployment's Full reference stays Wikipedia.** A practice has no official docs (review).
- **Agent tooling comes first in the guide's order, and Web standards never sits between the two Nuxt Subjects**.
- **Guide titles.** Every title has been weighed against 2 to 4 alternatives; owner rulings are in owner-decisions.md. Closest rivals that lost: *Required status checks* for *Merge gate*, *Claude Code workflows* for *Workflow scripts*.
- **Folding *Planning skills* into *Installed skills*.** *Planning skills* holds facts about Terrarium's own choices that would lose their page.
- **`wontfix` is the fifth triage state.** *Issue triage labels* lists four states first and names `wontfix` as the fifth: `docs/agents/triage-labels.md` says skills name five roles (claim check).
- **A Git & GitHub page may keep a one-clause pointer to a fact a sibling owns.** A page that must stand alone says in a clause how a linked worktree is told (*Git worktrees*, owned by *Session logs*), what a cloud session is, what the guest pipeline is and what a PreToolUse hook is; the sibling keeps the full account (overlap check).
- **A fresh reader's complaint about a long bracket or a lost link is often the rendering.** `plain.ts` puts each term's definition inside the sentence and strips link syntax from code, so such findings are checked against the page before they are acted on.
- **Splitting the unattended triage sweep out of *Issue triage labels*.** Held back until the page is stable. The page's length is still a problem.

## Update log

One agent editing session is a *curate run*, scheduled or with the owner. Each entry is that run's detailed log: its focus and why, then every page it touched, what changed and why. Lately above is the short version. Newest first.

::workshop-runs
::

