---
title: Planning a big change
description: How an idea too big for one session becomes a map of decision tickets, then a spec, then stories that agents build one PR at a time.
revision: '8fecf8b4e1b32da82557e42f42b2045bd12a05bb'
revisionDate: '2026-10-15'
---

The owner has an idea too big for one session, and the way to it isn't clear yet. This Walkthrough follows that idea from the owner's side: it becomes a map of open questions on GitHub, sessions settle the questions one at a time, and the map ends in a spec whose stories agents build.

## 1. The idea becomes a map

The owner types `/wayfinder` with the idea; the Skill never starts on its own. The session first grills the owner to name the destination, such as a spec ready to build, then grills again across the whole idea for the open decisions. It writes the result as one issue labelled `wayfinder:map`: the destination, notes every later session should read, an empty list of decisions so far, and the questions that can't be asked sharply yet.

::stop-links
[Planning with the pack](/t/glassbox/drafts/skill-pack/planning-with-the-pack) · [Skills](/t/glassbox/guide/claude-code/skills) · :file[.agents/skills/wayfinder/SKILL.md]
::

## 2. Each sharp question becomes a ticket

Every question that can be stated precisely becomes a decision ticket: a sub-issue of the map, labelled with its type, `research`, `prototype`, `grilling` or `task`. A second pass links which tickets block which, with GitHub's own issue dependencies. The session starts a research subagent on each research ticket and stops there: it resolves no other ticket.

::stop-links
[Planning with the pack](/t/glassbox/drafts/skill-pack/planning-with-the-pack) · [Issues as the work queue](/t/glassbox/drafts/git-github/work-queue)
::

## 3. One ticket per session

A later session loads the map and takes the first open ticket that nothing blocks and nobody holds, and assigns it to claim it before any work. It resolves only that ticket, research tickets apart: an answer in a comment, the issue closed, and one line in the map's decisions. Questions the answer makes sharp become new tickets. The triage sweep may also label a ticket, beside its `wayfinder:` label: a research ticket can go to `ready-for-agent`, a grilling or prototype ticket goes to `ready-for-human`, and a task ticket either way.

::stop-links
[Planning with the pack](/t/glassbox/drafts/skill-pack/planning-with-the-pack) · [Issues as the work queue](/t/glassbox/drafts/git-github/work-queue)
::

## 4. Each type of ticket has its own Skill

A grilling ticket is a conversation with the owner, run with `grilling` and `domain-modeling`, which writes settled words into a glossary and settled decisions into an ADR. A prototype ticket builds something rough to react to with `prototype`; a research ticket reads primary sources with `research`; a task ticket does the work a decision is waiting on. An agent never resolves a grilling or prototype ticket alone.

::stop-links
[The engineering loop](/t/glassbox/drafts/skill-pack/engineering-loop) · [Several glossaries](/t/glassbox/drafts/terrarium-practice/glossaries) · [ADRs: one decision, no history](/t/glassbox/guide/terrarium-practice/adrs) · :file[.agents/skills/grilling/SKILL.md]
::

## 5. The map hands off to a spec

When nothing is left to decide, the way is clear and the work is handed off. `to-spec` writes the decisions up as a spec, an ordinary issue here, and `to-tickets` breaks a spec into thin stories that each work end to end and can be checked alone. Each story is a sub-issue of the spec and starts with a `Part of` line naming it. The pack labels what it publishes `ready-for-agent`, which here is a :term[Trusted] user's approval to build. A spec on hold carries no label and says so in its body.

::stop-links
[Planning with the pack](/t/glassbox/drafts/skill-pack/planning-with-the-pack) · [Issues as the work queue](/t/glassbox/drafts/git-github/work-queue) · :file[.agents/skills/to-spec/SKILL.md] · :file[.agents/skills/to-tickets/SKILL.md]
::

## 6. The stories are built, one PR at a time

From here each story is ordinary work. A session builds it on its own branch, reviews it, runs the :term[Gate] and opens a PR; a story the issue view shows as blocked waits for its blockers to close.

::stop-links
[The engineering loop](/t/glassbox/drafts/skill-pack/engineering-loop) · [Every change as a PR](/t/glassbox/guide/git-github/every-change-a-pr) · [The Gate](/t/glassbox/guide/terrarium-practice/gate)
::

## A real case

On 14 October 2026 a session charted a map with the owner, issue #1965, for a new Tenant: this textbook. By the end of the day it held eleven tickets: two research, two prototype, four grilling and three task. Its notes told every session which Skills each type called, and to post research findings as a comment on the ticket. The tickets settled the content model, the page shapes, code citations and diagrams. A task ticket, #1987, wrote 23 stories under the spec, #1985, before the day was out, and the map's "Not yet specified" section ended on "Nothing: the way is clear."

## Where next

- [Planning with the pack](/t/glassbox/drafts/skill-pack/planning-with-the-pack)
- [Issues as the work queue](/t/glassbox/drafts/git-github/work-queue)
- [The engineering loop](/t/glassbox/drafts/skill-pack/engineering-loop)
- [A bug report becomes work](/t/glassbox/drafts/walkthroughs/a-bug-report-becomes-work)
