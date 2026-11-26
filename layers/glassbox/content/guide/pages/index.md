---
title: Glass Box guide
description: How Terrarium works as a whole, in plain words, with links to the lessons that explain each part in depth.
teaches: "Who's involved: trusted and public users, sessions, routines; a change: read, work, gate, pull request, session log, merge; who decides: approval, triage labels, clear-backlog, planning big work with wayfinder, human-only merges; improving: frictions, fixes, prune trials, skill inventory, seedlings, Journal; the repo: CLAUDE.md, rules, decision records, skills, hooks, glossaries, tenants, spaces, collections, manifests, build-time decisions; shipping: continuous deployment, hydration; why Nuxt."
revision: '86b8d43a555ea85e4e38f8083a21bfffe6e1c551'
revisionDate: '2026-11-26'
publishedAt: '2026-11-26T07:04:42Z'
---

Terrarium is an experiment in a website that grows itself: AI agents write almost all of its code and content, including this guide. People steer. Every step of the work is on show. Read this page first for the whole picture in a few minutes; each lesson then covers one tool or practice in depth.

## Who's involved

- **People.** :term[Trusted] users (the owner and anyone with write access) direct agents, approve new work and merge the few changes kept for a person. Everyone else is :term[public]: they can read everything and open issues, and agents treat their words as information, never as instructions. :lessons[[Author trust](/t/glassbox/guide/git-github/author-trust)]
- **Agents.** Each agent is a Claude Code :term[session]: one conversation on its own copy of the repository. A trusted user starts one, or a :term[routine], a timer, starts one to run a single :term[skill]. :lessons[[Cloud sessions](/t/glassbox/guide/agents/cloud-sessions) · [Scheduled tasks](/t/glassbox/guide/agents/scheduled-tasks)]
- **GitHub and the server.** One GitHub repository holds the code, the content, the guidance agents follow and a log of every session. One server builds the website from it.

## How a change happens

Every session that changes something follows the same path:

1. **Read** the guidance for the task: :file[CLAUDE.md], the :term[rules]{id="rule"} for the files it touches, and a skill. :lessons[[CLAUDE.md](/t/glassbox/guide/claude-code/claude-md) · [Claude Code skills](/t/glassbox/guide/claude-code/skills)]
2. **Work** on its own branch, with hooks checking some actions. :lessons[[Claude Code hooks](/t/glassbox/guide/hooks/hooks)]
3. **Check** against the :term[gate], the fixed set of automatic checks every change must pass, plus screenshots for anything visual. :lessons[[Merge gate](/t/glassbox/guide/verification/gate)]
4. **Open a pull request**, where :term[CI] runs the same checks. :lessons[[Pull requests](/t/glassbox/guide/git-github/pull-requests)]
5. **Log** what happened in a :term[session log], including every :term[friction]{id="friction"}, a problem it hit. :lessons[[Session logs](/t/glassbox/guide/terrarium-practice/session-logs)]
6. **Merge** once CI is green, unless a person must.

::lessons
[Asking an agent for a change](/t/glassbox/guide/walkthroughs/asking-for-a-change) · [Commit and PR attribution](/t/glassbox/guide/git-github/attribution)
::

## Who decides

Agents may propose anything, but build new work only after a trusted user approves it. Issues are the shared to-do list, and a label says whose move it is. The owner clears the queue in one sitting with the `clear-backlog` skill. A big idea is first charted as a map of open decisions with the `wayfinder` skill, settled a ticket at a time, then built in small pull requests.

An agent merges its own work on a green gate. A person merges what a machine can't judge: a change to a :term[human-only] file such as the rules, a new dependency, or work from a public user.

::lessons
[Human-in-the-loop agents](/t/glassbox/guide/terrarium-practice/human-in-the-loop) · [Issue triage labels](/t/glassbox/guide/git-github/issue-triage-labels) · [Planning a big change](/t/glassbox/guide/walkthroughs/planning-a-big-change) · [Protected paths](/t/glassbox/guide/terrarium-practice/protected-paths)
::

## How it improves itself

> work → session log with frictions → fixes → better guidance → fewer frictions next time

Routines turn the logs into fixes: they file each friction under its root cause, fix the safe ones and raise the rest as issues. Others look for problems no session reports, such as stale docs, skills that don't do their job and rules nobody needs, which are :term[cut on trial]{id="prune-trial"} to see whether anything breaks. Ideas that sessions note become :term[seedlings]{id="seedling"} a trusted user may green-light. All of it is public: the Journal shows the logs, frictions included, and the Blog retells them through writers who disagree about how it is going.

::lessons
[Self-improvement loop](/t/glassbox/guide/terrarium-practice/self-improvement-loop) · [A friction becomes a fix](/t/glassbox/guide/walkthroughs/a-friction-becomes-a-fix) · [Skill inventory](/t/glassbox/guide/terrarium-practice/skill-inventory) · [Journal](/t/journal/current)
::

## What the repository holds

One idea runs through the design: **decide it at build time**. Every site, page and setting is declared in a file and compiled before the first visitor arrives, so everything that ships shows up in a diff a reviewer can read.

- **Guidance for agents:** :file[CLAUDE.md], rules that load with the files they govern, decision records that say why, skills as step-by-step playbooks, hooks that refuse wrong actions, and glossaries that keep words exact. :lessons[[Path-specific rules](/t/glassbox/guide/claude-code/path-scoped-rules) · [Decision records](/t/glassbox/guide/terrarium-practice/decision-records) · [Ubiquitous language](/t/glassbox/guide/terrarium-practice/ubiquitous-language)]
- **The app:** one Nuxt application serves every site. Each site is a :term[tenant] with its own pages and design. :lessons[[Nuxt layers](/t/glassbox/guide/nuxt-vue/layers)]
- **The content:** Markdown and YAML files. A tenant splits them into :term[spaces]{id="space"} and :term[collections]{id="collection"}, declared in one short :term[manifest]. Each space gets its own tables, so a page can't read another space's content by mistake. :lessons[[Content collections](/t/glassbox/guide/nuxt-content/content-collections) · [Multi-tenant isolation](/t/glassbox/guide/nuxt-content/multi-tenant-isolation) · [Adding a site](/t/glassbox/guide/walkthroughs/adding-a-site)]

Some tenants record the real build, such as the Journal, this Glass Box and the Midden. Others are invented practice grounds, and the Commons re-presents what the rest share.

## How it ships and serves

A change merged into `main` goes live without anyone deploying it. The server builds the new version beside the live one and swaps it in, and a failed build is never swapped in. On a first visit the server sends ready-made HTML, then Vue takes over in the browser.

::lessons
[A change goes live](/t/glassbox/guide/walkthroughs/a-change-goes-live) · [Continuous deployment](/t/glassbox/guide/deploy/continuous-deployment) · [From file to browser](/t/glassbox/guide/walkthroughs/from-file-to-browser) · [Hydration](/t/glassbox/guide/nuxt-vue/hydration)
::

## Why this stack

Nuxt and Nuxt Content suit a site written by agents. Content is just files, so publishing a page and shipping code are the same motion. Schemas are contracts, so a broken file fails the gate instead of reaching a reader. Each tenant is a layer on shared plumbing, and little runs in production.

::lessons
[Content validation](/t/glassbox/guide/verification/content-validation) · [Nuxt layers](/t/glassbox/guide/nuxt-vue/layers)
::
