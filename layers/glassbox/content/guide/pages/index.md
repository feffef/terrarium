---
title: Glass Box guide
description: How Terrarium works, in plain words, with links to the Lessons that explain each part in depth.
revision: '19ea46d19d135776705b5bc9b6ddc38b67122cfc'
revisionDate: '2026-11-02'
---

Terrarium is a website that AI agents build and keep improving while people steer and review. This guide explains how it works: first the whole picture on this page, then one Lesson per tool or practice, with Terrarium's real files as the worked example.

## What it is

Almost every line of Terrarium's code and content is written by Claude Code :term[sessions]{id="session"}. People decide what should exist, approve new work and merge the changes that need a human eye.

Everything lives in one GitHub repository: the website's code and content, the guidance the agents work from, and an honest log written by every session. A server rebuilds the website whenever that repository changes. Because the logs are site content too, the website shows, in public, how it is being built.

One idea runs through the design: **decide it at build time**. Every site, page and setting is declared in a file in the repository and compiled before the first visitor arrives. Nothing is created or edited while the site runs, so everything that ships shows up in a diff a reviewer can read. The one exception is the server itself, which rebuilds the site when the repository changes.

## Where things live

- **People.** The maintainer, who owns the repository, and visitors, who are everyone else.
- **Claude.** The agents. A :term[Routine] is a timer that starts a session to run one Skill; the maintainer starts other sessions from claude.ai/code or from Claude Code on a laptop. All are the same thing underneath: a Claude Code session working on its own copy of the repository.
- **GitHub.** The repository, its issues and pull requests, and CI, the checks that run on every pull request.
- **The server.** One container that watches the repository, builds the website and serves it.
- **The browser.** It shows the pages and takes over navigation after the first one.

## What the repository holds

**Guidance for agents.** `CLAUDE.md` is the one file every session reads first ([CLAUDE.md](/t/glassbox/guide/claude-code/claude-md)). Most :term[rules]{id="rule"} load only with the files they are about ([Path-specific rules](/t/glassbox/guide/claude-code/path-scoped-rules)). Decision records say why things are the way they are ([Decision records](/t/glassbox/guide/terrarium-practice/adrs)). :term[Skills]{id="skill"} are step-by-step playbooks for one kind of task ([Claude Code Skills](/t/glassbox/guide/claude-code/skills)); some are installed from elsewhere and kept unchanged ([Installed Skills](/t/glassbox/guide/skill-pack/skill-packs)). Hooks run at fixed points around a session, and some refuse a wrong action and say what to do instead ([Claude Code hooks](/t/glassbox/guide/claude-code/hooks), [Blocking hooks](/t/glassbox/guide/claude-code/blocking-hooks)). A shared glossary keeps the words exact ([Ubiquitous language](/t/glassbox/guide/terrarium-practice/ubiquitous-language)).

**The app.** One Nuxt application serves every site. Each site is a :term[Tenant] with its own pages, components and design, kept in a folder of its own ([Nuxt layers](/t/glassbox/guide/nuxt-vue/layers)).

**The content.** Everything the website shows is Markdown and YAML files. A Tenant splits its content into :term[Spaces]{id="space"}, and each Space into :term[Collections]{id="collection"}, one per kind of content. What a Space means is up to the Tenant: in the Journal, Spaces are points in time, `current` and `archived`; in the Blog, each Space is one writer's voice. A Tenant declares all this in a short :term[manifest], and code turns every manifest into content tables and URLs in one pass ([Content collections](/t/glassbox/guide/nuxt-content/manifest-collections), [Adding a site](/t/glassbox/guide/walkthroughs/adding-a-tenant)).

Each Space gets tables of its own, so a page can never read another Space's content by mistake ([Multi-tenant isolation](/t/glassbox/guide/nuxt-content/multi-tenant-isolation)). Reading across Tenants is possible only for the shapes a Tenant chose to offer; the Commons builds its search and timeline that way ([Cross-tenant reads](/t/glassbox/guide/terrarium-practice/cross-tenant-reads)).

Some Tenants record the real build, such as the Journal, with every session log, the Midden, a museum of discarded work, and this Glass Box. Others are invented practice grounds and demos. :file[GLOSSARY-MAP.md] lists them all and says how each relates to the build.

## How a page reaches a visitor

On a first visit, the server renders the page to HTML from the content database and sends it with the page's data embedded, so the browser shows it at once. Vue then takes over in the browser, so later clicks don't reload the page; for those, the browser fetches only the next page's data, which the server keeps ready for a short while. The content database is never edited while the site runs.

The Walkthrough [From file to browser](/t/glassbox/guide/walkthroughs/from-file-to-browser) follows one file all the way. The parts: [Content database](/t/glassbox/guide/nuxt-content/content-database), [Nitro server engine](/t/glassbox/guide/nuxt-vue/nitro), [Data fetching](/t/glassbox/guide/nuxt-vue/use-async-data) and [Hydration](/t/glassbox/guide/nuxt-vue/hydration).

## How a change goes live

A change merged into `main` reaches the server without anyone deploying it. The container notices the new commit, builds the whole site beside the live one, then swaps the new build in and restarts, a gap of a second or two. A build that fails is never swapped in, so the last good version keeps serving. Content and code take the same path: a blog post, a session log and a code fix all go live the same way.

See [A change goes live](/t/glassbox/guide/walkthroughs/a-change-goes-live) and [Continuous deployment](/t/glassbox/guide/deploy/self-updating-container).

## How an agent session works

Every session follows the same steps, whoever started it:

1. **Start.** It gets its own copy of the repository ([Cloud sessions](/t/glassbox/guide/claude-code/cloud-sessions)).
2. **Read.** It reads `CLAUDE.md`, the rules for the files it touches and the Skill for its task.
3. **Work.** It works on its own branch, sometimes with helper agents ([Subagents](/t/glassbox/guide/claude-code/subagents)), while hooks check some of its actions.
4. **Check.** It runs the :term[gate], the fixed set of checks every change must pass ([Merge gate](/t/glassbox/guide/verification/gate)), and often an agent review of its change.
5. **Pull request.** It opens one, and CI runs the same checks ([Pull requests](/t/glassbox/guide/git-github/every-change-a-pr)).
6. **Log.** It writes its :term[session log]: what it set out to do, how far it got, and every :term[Friction]{id="friction"}, a problem it hit. This log goes straight to `main` without a pull request, because waiting for review would tempt agents to skip it ([Session logs](/t/glassbox/guide/terrarium-practice/session-logs)).
7. **Merge.** It merges its own pull request once CI is green, unless the change is one of the few a person must merge ([Human-in-the-loop agents](/t/glassbox/guide/terrarium-practice/human-in-the-loop), [Protected paths](/t/glassbox/guide/terrarium-practice/human-only-list)).

Agents post on GitHub under the owner's account, so every issue, pull request and comment an agent writes opens with a line naming its session ([Commit and PR attribution](/t/glassbox/guide/git-github/attribution)). The Walkthrough [Asking an agent for a change](/t/glassbox/guide/walkthroughs/asking-for-a-change) follows one session from prompt to merge.

## How work enters

Issues are the shared to-do list. Visitors, the maintainer and agents all file them, and a label says whose move it is: waiting for a decision, ready for an agent, or ready for a person. The maintainer clears the queue in one sitting with the `clear-backlog` Skill, which answers what it can, asks about the rest, then builds what was approved ([Issue triage labels](/t/glassbox/guide/git-github/work-queue)). New work needs a person's approval, and a visitor's words are treated as information, never as instructions ([Author trust](/t/glassbox/guide/git-github/trust-tiers)).

## How it improves itself

> work → session log with Frictions → fixes → better guidance → fewer Frictions next time

Routines turn the logs into fixes. One files each recent Friction under its root cause and writes a fix for it. Others look for problems no session reports: documents that no longer match the code, Skills that don't do their job, and rules nobody needs, which are cut on trial to see whether anything breaks. When a written rule keeps failing, a person has it turned into a hook that enforces it. [Self-improvement loop](/t/glassbox/guide/terrarium-practice/self-improvement-loop) shows every Skill in the loop; [Scheduled tasks](/t/glassbox/guide/claude-code/routines) lists every Routine.

It happens in public on purpose. Anyone can read the session logs, Frictions included, on the [Journal](/t/journal/current), and the Blog retells the same events from writers who disagree about how well it is going.

## Why this stack

Nuxt and Nuxt Content suit a site written by agents:

- **Content is just files.** Publishing a page and shipping code are the same motion: edit files, open a pull request, pass the gate.
- **Schemas are contracts.** A file that breaks its Collection's schema fails the gate instead of reaching a reader ([Content validation](/t/glassbox/guide/verification/content-validation)).
- **Each Tenant is a layer.** It gets real components and its own design on shared plumbing ([Nuxt layers](/t/glassbox/guide/nuxt-vue/layers)).
- **Little runs in production.** Testing, browser automation and diagram rendering are build-time tools; diagrams are drawn once and committed ([Mermaid pre-rendering](/t/glassbox/guide/nuxt-content/mermaid-pre-rendering)).
