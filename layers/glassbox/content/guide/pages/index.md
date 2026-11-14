---
title: Glass Box guide
description: How Terrarium works as a whole, in plain words, with links to the lessons that explain each part in depth.
teaches: "Who's involved: trusted and public users, sessions, routines; a change: read, branch, gate (lint, type check, content validation; for most changes unit tests, build, browser tests), screenshot of a visual change in a headless browser, PR, session log, merge, attribution; who decides: approval, triage labels, clear-backlog, planning big work (wayfinder map of decision tickets, one ticket per session, a person decides grilling and prototype tickets, spec, stories built one PR each), human-only merges, owner waiver; improving: frictions, fixes, prune trials, audit-skills grading the skill inventory by need from session logs, harvest turning logged ideas and lessons into seedlings a trusted user green-lights, Journal; the repo: CLAUDE.md, rules, ADRs, skills, hooks, glossaries, tenants, spaces, collections, manifests; shipping: deploy, hydration; why Nuxt."
revision: 'a6749d616f386cda592fd38f771cbf066180d193'
revisionDate: '2026-11-14'
publishedAt: '2026-11-12T11:26:16Z'
---

Terrarium is an experiment in a website that grows itself: AI agents write almost all of its code and content, and people steer. It is also built to be watched, so every step of that work is on show. Glass Box documents the technology and practices it runs on, and how each one is used here, kept up to date as the code changes. Read this page first: in a few minutes it explains how Terrarium works as a whole, from who steers it to how a change goes live. Each lesson then covers one tool or practice in depth, with Terrarium's real files as the worked example; open one from the chips on this page or from the menu.

## Who's involved

- **People.** :term[Trusted] users (the owner and anyone else with write access to the repository) direct agents, approve new work and merge the few changes kept for a person. Everyone else is :term[public]: they can read everything and open issues and pull requests, and agents treat their words as information, never as instructions. :lessons[[Author trust](/t/glassbox/guide/git-github/author-trust)]
- **Agents.** Each agent is a Claude Code :term[session]: one conversation working on its own copy of the repository. A trusted user starts one from claude.ai/code or from Claude Code on a laptop, and a :term[routine] is a timer that starts one to run a single :term[skill]. :lessons[[Cloud sessions](/t/glassbox/guide/agents/cloud-sessions) · [Scheduled tasks](/t/glassbox/guide/agents/scheduled-tasks)]
- **GitHub and the server.** Everything lives in one GitHub repository: the code, the content, the guidance agents work from and a log from every session. One server builds the website from it.

## How a change happens

Every session that changes something follows the same steps, whoever started it:

1. **Read.** It reads :file[CLAUDE.md], the :term[rules]{id="rule"} for the files it touches and the skill for its task. :lessons[[CLAUDE.md](/t/glassbox/guide/claude-code/claude-md) · [Path-specific rules](/t/glassbox/guide/claude-code/path-scoped-rules) · [Claude Code skills](/t/glassbox/guide/claude-code/skills)]
2. **Work.** It works on its own branch, sometimes with helper agents, while hooks check some of its actions. :lessons[[Subagents](/t/glassbox/guide/agents/subagents) · [Claude Code hooks](/t/glassbox/guide/hooks/hooks)]
3. **Check.** It runs the :term[gate], the fixed set of checks every change must pass: lint, a type check and content validation always, and for most changes also unit tests, a build and tests that load the built site in a real browser. A change to how a page looks is also checked by eye, in screenshots from a browser with no window. Often an agent reviews the change too. :lessons[[Merge gate](/t/glassbox/guide/verification/gate) · [Testing](/t/glassbox/guide/verification/testing) · [Headless browser checks](/t/glassbox/guide/verification/headless-browser-checks)]
4. **Pull request.** It opens one, and :term[CI] runs the same checks on GitHub. :lessons[[Pull requests](/t/glassbox/guide/git-github/pull-requests)]
5. **Log.** It writes its :term[session log]: what it set out to do, how far it got, and every :term[friction]{id="friction"}, a problem it hit. The log goes straight to `main` without a pull request, because waiting for review would tempt agents to skip it. :lessons[[Session logs](/t/glassbox/guide/terrarium-practice/session-logs) · [A session log lands on main](/t/glassbox/guide/walkthroughs/session-log-lands-on-main)]
6. **Merge.** Once CI is green and it has posted its verdict on the pull request, it merges, unless a person must (below).

Agents post on GitHub under the owner's account, so everything an agent writes there opens with a line naming its session. A walkthrough follows one session from prompt to merge.

::lessons
[Commit and PR attribution](/t/glassbox/guide/git-github/attribution) · [Asking an agent for a change](/t/glassbox/guide/walkthroughs/asking-for-a-change)
::

## Who decides

Agents may propose anything, but they build new work, such as a new :term[tenant], feature or skill, only after a trusted user approves it. Issues are the shared to-do list: anyone can file one, and a label says whose move it is, waiting for a decision, ready for an agent or ready for a person. The owner clears the queue in one sitting with the `clear-backlog` skill, which answers what it can, asks about the rest, then builds what was approved.

::lessons
[Human-in-the-loop agents](/t/glassbox/guide/terrarium-practice/human-in-the-loop) · [Issue triage labels](/t/glassbox/guide/git-github/issue-triage-labels) · [A bug report becomes work](/t/glassbox/guide/walkthroughs/a-bug-report-becomes-work)
::

An idea too big for one session is planned before it is built. The `wayfinder` skill charts it as a map on GitHub: one issue per open decision, called a ticket. Later sessions settle the tickets, normally one per session, and a person decides every ticket that needs a conversation or a prototype to react to. When nothing is left to decide, the decisions are written up as a spec, a plan for the whole job, and the spec is cut into stories, small slices that each work end to end. Agents build the stories one pull request at a time.

::lessons
[Planning a big change](/t/glassbox/guide/walkthroughs/planning-a-big-change) · [Wayfinder](/t/glassbox/guide/skill-pack/wayfinder) · [Planning skills](/t/glassbox/guide/skill-pack/planning-with-the-pack)
::

Agents change a system that includes their own tools, and the gate's automatic checks are what make that safe. So an agent merges its own work on a green gate, and a person merges what a machine can't judge, such as a change to a :term[human-only] file like the rules themselves, a new dependency, or work that came from a public user. The :term[decision record]{id="adr"} ADR-0004 (:file[docs/adr/0004-objective-safety-gate.md]) gives the full list, and lets the owner tell an agent to merge a human-only change it wrote; a lesson shows how those files are kept.

::lessons
[Merge gate](/t/glassbox/guide/verification/gate) · [A change meets the gate](/t/glassbox/guide/walkthroughs/a-change-meets-the-gate) · [Protected paths](/t/glassbox/guide/terrarium-practice/protected-paths)
::

## How it improves itself

> work → session log with frictions → fixes → better guidance → fewer frictions next time

Routines turn the logs into fixes. One files each recent friction under its root cause, then fixes the safe causes and files the rest as issues. Others look for problems no session reports: documents that no longer match the code, skills that don't do their job, and rules nobody needs, which are :term[cut on trial]{id="prune-trial"} to see whether anything breaks. One lesson shows every skill in the loop, another lists every routine.

::lessons
[Self-improvement loop](/t/glassbox/guide/terrarium-practice/self-improvement-loop) · [A friction becomes a fix](/t/glassbox/guide/walkthroughs/a-friction-becomes-a-fix) · [Scheduled tasks](/t/glassbox/guide/agents/scheduled-tasks)
::

The routine that checks skills also grades each in the :term[skill inventory], a record of every skill, on a short scale of how much it is needed, from evidence in session logs. The `harvest` skill turns the ideas and lessons sessions note in their logs into proposals called :term[seedlings]{id="seedling"}, and a trusted user decides which get built. When a written rule keeps failing, a trusted user has a hook built that enforces it.

::lessons
[Skill inventory](/t/glassbox/guide/terrarium-practice/skill-inventory) · [Ideas and lessons learned](/t/glassbox/guide/terrarium-practice/ideas-and-lessons-learned) · [Blocking hooks](/t/glassbox/guide/hooks/blocking-hooks)
::

It happens in public on purpose. Anyone can read the session logs, frictions included, on the Journal, and the Blog retells the same events through writers who disagree about how well it is going.

::lessons
[Journal](/t/journal/current)
::

## What the repository holds

One idea runs through the design: **decide it at build time**. Every site, page and setting is declared in a file and compiled before the first visitor arrives, and nothing is created or edited while the site runs, so everything that ships shows up in a diff a reviewer can read.

**Guidance for agents:**

- :file[CLAUDE.md], the file every session reads at its start. :lessons[[CLAUDE.md](/t/glassbox/guide/claude-code/claude-md)]
- :term[Rules]{id="rule"} in :file[.claude/rules/]; most load only with the files they are about. :lessons[[Path-specific rules](/t/glassbox/guide/claude-code/path-scoped-rules)]
- Decision records in :file[docs/adr/], which say why things are the way they are. :lessons[[Decision records](/t/glassbox/guide/terrarium-practice/decision-records)]
- :term[Skills]{id="skill"} in :file[.agents/skills/], step-by-step playbooks for one kind of task, some installed from elsewhere and kept unchanged. :lessons[[Claude Code skills](/t/glassbox/guide/claude-code/skills) · [Installed skills](/t/glassbox/guide/skill-pack/skill-packs)]
- Hooks in :file[scripts/hooks/], which run at fixed points around a session and can refuse a wrong action. :lessons[[Claude Code hooks](/t/glassbox/guide/hooks/hooks)]
- Glossaries that keep the words exact: :file[GLOSSARY.md] and one per tenant. :lessons[[Ubiquitous language](/t/glassbox/guide/terrarium-practice/ubiquitous-language)]

**The app.** One Nuxt application serves every site. Each site is a :term[tenant] with its own pages, components and design, kept in its own folder under :file[layers/].

::lessons
[Nuxt layers](/t/glassbox/guide/nuxt-vue/layers)
::

**The content.** Everything the website shows is Markdown and YAML files. A tenant splits its content into :term[spaces]{id="space"}, and each space into :term[collections]{id="collection"}, one per kind of content. What a space means is up to the tenant: in the Journal, spaces are points in time, `current` and `archived`; in the Blog, each space is one writer's voice. A tenant declares all this in a short :term[manifest], its `tenant.config.ts`, and code turns every manifest into content tables and URLs in one pass.

::lessons
[Content collections](/t/glassbox/guide/nuxt-content/content-collections) · [Adding a site](/t/glassbox/guide/walkthroughs/adding-a-site)
::

Each space gets tables of its own, so a page can never read another space's content by mistake. Reading across tenants works only for the shapes a tenant chose to offer; the Commons builds its search and timeline that way.

::lessons
[Multi-tenant isolation](/t/glassbox/guide/nuxt-content/multi-tenant-isolation) · [Cross-tenant reads](/t/glassbox/guide/terrarium-practice/cross-tenant-reads) · [Reading across tenants](/t/glassbox/guide/walkthroughs/reading-across-tenants)
::

Some tenants record the real build, such as the Journal, this Glass Box and the Midden, a museum of discarded work. Others are invented practice grounds and demos, and the Commons re-presents the content the others share. :file[GLOSSARY-MAP.md] lists them all and says how each relates to the build.

## How it ships and serves

A change merged into `main` goes live without anyone deploying it, the one thing that happens while the site runs. The server notices the new commit, builds the whole site beside the live one, then swaps the new build in and restarts, a gap of a second or two. A build that fails is never swapped in, so the last good version keeps serving. A blog post, a session log and a code fix all take this same path.

::lessons
[A change goes live](/t/glassbox/guide/walkthroughs/a-change-goes-live) · [Continuous deployment](/t/glassbox/guide/deploy/continuous-deployment)
::

On a first visit, the server renders the page to HTML from the content database and sends the page's data with it, so the browser shows it at once. Vue then takes over in the browser, and later clicks fetch only the next page's data. A walkthrough follows one file all the way, and two lessons cover the browser side.

::lessons
[From file to browser](/t/glassbox/guide/walkthroughs/from-file-to-browser) · [Data fetching](/t/glassbox/guide/nuxt-vue/data-fetching) · [Hydration](/t/glassbox/guide/nuxt-vue/hydration)
::

## Why this stack

Nuxt and Nuxt Content suit a site written by agents:

- **Content is just files.** Publishing a page and shipping code are the same motion: edit files, open a pull request, pass the gate. :lessons[[Content collections](/t/glassbox/guide/nuxt-content/content-collections)]
- **Schemas are contracts.** A file that breaks its collection's schema fails the gate instead of reaching a reader. :lessons[[Content validation](/t/glassbox/guide/verification/content-validation)]
- **Each tenant is a layer.** It gets real components and its own design on shared plumbing. :lessons[[Nuxt layers](/t/glassbox/guide/nuxt-vue/layers)]
- **Little runs in production.** Testing, browser automation and diagram rendering are build-time tools; diagrams are drawn once and committed. :lessons[[Testing](/t/glassbox/guide/verification/testing) · [Headless browser checks](/t/glassbox/guide/verification/headless-browser-checks) · [Mermaid pre-rendering](/t/glassbox/guide/nuxt-content/mermaid-pre-rendering)]
