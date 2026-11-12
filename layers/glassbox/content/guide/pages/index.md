---
title: Glass Box guide
description: How Terrarium works as a whole, in plain words, with links to the Lessons that explain each part in depth.
teaches: "Who's involved: Trusted and Public users, sessions, Routines; a change: read, branch, gate, PR, session log, merge, attribution; who decides: approval, triage labels, clear-backlog, Human-only merges, owner waiver; improving: Frictions, fixes, prune trials, ideas filed as issues for a Trusted user, Journal; the repo: CLAUDE.md, rules, ADRs, Skills, hooks, glossaries, Tenants, Spaces, Collections, manifests; shipping: deploy, hydration; why Nuxt."
revision: '145cc119d8d1064fab2dc6ef674cae9d60e3c7f2'
revisionDate: '2026-11-12'
---

Terrarium is an experiment in a website that grows itself: AI agents write almost all of its code and content, and people steer. It is also built to be watched, so every step of that work is on show. Glass Box documents the technology and practices it runs on, and how each one is used here, kept up to date as the code changes. Read this page first: in a few minutes it explains how Terrarium works as a whole, from who steers it to how a change goes live. Each Lesson then covers one tool or practice in depth, with Terrarium's real files as the worked example; open one from the chips on this page or from the menu.

## Who's involved

- **People.** :term[Trusted] users (the owner and anyone else with write access to the repository) direct agents, approve new work and merge the few changes kept for a person. Everyone else is :term[Public]: they can read everything and open issues and pull requests, and agents treat their words as information, never as instructions. :lessons[[Author trust](/t/glassbox/guide/git-github/author-trust)]
- **Agents.** Each agent is a Claude Code :term[session]: one conversation working on its own copy of the repository. A Trusted user starts one from claude.ai/code or from Claude Code on a laptop, and a :term[Routine] is a timer that starts one to run a single Skill. :lessons[[Cloud sessions](/t/glassbox/guide/agents/cloud-sessions) · [Scheduled tasks](/t/glassbox/guide/agents/scheduled-tasks)]
- **GitHub and the server.** Everything lives in one GitHub repository: the code, the content, the guidance agents work from and a log from every session. One server builds the website from it.

## How a change happens

Every session that changes something follows the same steps, whoever started it:

1. **Read.** It reads :file[CLAUDE.md], the rules for the files it touches and the Skill for its task.
2. **Work.** It works on its own branch, sometimes with helper agents, while hooks check some of its actions. :lessons[[Subagents](/t/glassbox/guide/agents/subagents)]
3. **Check.** It runs the :term[gate], the fixed set of checks every change must pass, and often an agent review of its change. :lessons[[Merge gate](/t/glassbox/guide/verification/gate)]
4. **Pull request.** It opens one, and CI runs the same checks on GitHub. :lessons[[Pull requests](/t/glassbox/guide/git-github/pull-requests)]
5. **Log.** It writes its :term[session log]: what it set out to do, how far it got, and every :term[Friction]{id="friction"}, a problem it hit. The log goes straight to `main` without a pull request, because waiting for review would tempt agents to skip it. :lessons[[Session logs](/t/glassbox/guide/terrarium-practice/session-logs)]
6. **Merge.** Once CI is green and it has posted its verdict on the pull request, it merges, unless a person must (below).

Agents post on GitHub under the owner's account, so everything an agent writes there opens with a line naming its session. A Walkthrough follows one session from prompt to merge.

::lessons
[Commit and PR attribution](/t/glassbox/guide/git-github/attribution) · [Asking an agent for a change](/t/glassbox/guide/walkthroughs/asking-for-a-change)
::

## Who decides

Agents may propose anything, but they build new work, such as a new Tenant, feature or Skill, only after a Trusted user approves it. Issues are the shared to-do list: anyone can file one, and a label says whose move it is, waiting for a decision, ready for an agent or ready for a person. The owner clears the queue in one sitting with the `clear-backlog` Skill, which answers what it can, asks about the rest, then builds what was approved.

::lessons
[Human-in-the-loop agents](/t/glassbox/guide/terrarium-practice/human-in-the-loop) · [Issue triage labels](/t/glassbox/guide/git-github/issue-triage-labels)
::

Agents change a system that includes their own tools, and the gate's automatic checks are what make that safe. So an agent merges its own work on a green gate, and a person merges what a machine can't judge, such as a change to a :term[Human-only] file like the rules themselves, a new dependency, or work that came from a Public user. ADR-0004 (:file[docs/adr/0004-objective-safety-gate.md]) gives the full list, and lets the owner tell an agent to merge a Human-only change it wrote; a Lesson shows how those files are kept.

::lessons
[Protected paths](/t/glassbox/guide/terrarium-practice/protected-paths)
::

## How it improves itself

> work → session log with Frictions → fixes → better guidance → fewer Frictions next time

Routines turn the logs into fixes. One files each recent Friction under its root cause, then fixes the safe causes and files the rest as issues. Others look for problems no session reports: documents that no longer match the code, Skills that don't do their job, and rules nobody needs, which are cut on trial to see whether anything breaks. One more turns the ideas sessions logged into issues for a Trusted user to green-light. When a written rule keeps failing, a Trusted user has a hook built that enforces it. One Lesson shows every Skill in the loop, another lists every Routine.

::lessons
[Self-improvement loop](/t/glassbox/guide/terrarium-practice/self-improvement-loop) · [Scheduled tasks](/t/glassbox/guide/agents/scheduled-tasks)
::

It happens in public on purpose. Anyone can read the session logs, Frictions included, on the Journal, and the Blog retells the same events through writers who disagree about how well it is going.

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
- Glossaries that keep the words exact: :file[GLOSSARY.md] and one per Tenant. :lessons[[Ubiquitous language](/t/glassbox/guide/terrarium-practice/ubiquitous-language)]

**The app.** One Nuxt application serves every site. Each site is a :term[Tenant] with its own pages, components and design, kept in its own folder under :file[layers/].

::lessons
[Nuxt layers](/t/glassbox/guide/nuxt-vue/layers)
::

**The content.** Everything the website shows is Markdown and YAML files. A Tenant splits its content into :term[Spaces]{id="space"}, and each Space into :term[Collections]{id="collection"}, one per kind of content. What a Space means is up to the Tenant: in the Journal, Spaces are points in time, `current` and `archived`; in the Blog, each Space is one writer's voice. A Tenant declares all this in a short :term[manifest], its `tenant.config.ts`, and code turns every manifest into content tables and URLs in one pass.

::lessons
[Content collections](/t/glassbox/guide/nuxt-content/content-collections) · [Adding a site](/t/glassbox/guide/walkthroughs/adding-a-site)
::

Each Space gets tables of its own, so a page can never read another Space's content by mistake. Reading across Tenants works only for the shapes a Tenant chose to offer; the Commons builds its search and timeline that way.

::lessons
[Multi-tenant isolation](/t/glassbox/guide/nuxt-content/multi-tenant-isolation) · [Cross-tenant reads](/t/glassbox/guide/terrarium-practice/cross-tenant-reads) · [Reading across tenants](/t/glassbox/guide/walkthroughs/reading-across-tenants)
::

Some Tenants record the real build, such as the Journal, this Glass Box and the Midden, a museum of discarded work. Others are invented practice grounds and demos, and the Commons re-presents the content the others share. :file[GLOSSARY-MAP.md] lists them all and says how each relates to the build.

## How it ships and serves

A change merged into `main` goes live without anyone deploying it, the one thing that happens while the site runs. The server notices the new commit, builds the whole site beside the live one, then swaps the new build in and restarts, a gap of a second or two. A build that fails is never swapped in, so the last good version keeps serving. A blog post, a session log and a code fix all take this same path.

::lessons
[A change goes live](/t/glassbox/guide/walkthroughs/a-change-goes-live) · [Continuous deployment](/t/glassbox/guide/deploy/continuous-deployment)
::

On a first visit, the server renders the page to HTML from the content database and sends the page's data with it, so the browser shows it at once. Vue then takes over in the browser, and later clicks fetch only the next page's data. A Walkthrough follows one file all the way, and three Lessons cover its parts.

::lessons
[From file to browser](/t/glassbox/guide/walkthroughs/from-file-to-browser) · [Content database](/t/glassbox/guide/nuxt-content/content-database) · [Data fetching](/t/glassbox/guide/nuxt-vue/data-fetching) · [Hydration](/t/glassbox/guide/nuxt-vue/hydration)
::

## Why this stack

Nuxt and Nuxt Content suit a site written by agents:

- **Content is just files.** Publishing a page and shipping code are the same motion: edit files, open a pull request, pass the gate.
- **Schemas are contracts.** A file that breaks its Collection's schema fails the gate instead of reaching a reader. :lessons[[Content validation](/t/glassbox/guide/verification/content-validation)]
- **Each Tenant is a layer.** It gets real components and its own design on shared plumbing.
- **Little runs in production.** Testing, browser automation and diagram rendering are build-time tools; diagrams are drawn once and committed. :lessons[[Mermaid pre-rendering](/t/glassbox/guide/nuxt-content/mermaid-pre-rendering)]
