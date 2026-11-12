---
title: Planning a big change
description: How an idea too big for one session becomes a map of decision tickets, then a spec, then stories that agents build one PR at a time.
teaches: "Story: a Trusted user's big idea becoming stories agents build. Start: /wayfinder, run by hand. End: to-spec writes a spec; to-tickets splits it into stories, one PR each. Code: wayfinder:map, tickets (research, prototype, grilling, task), issue dependencies, grilling, domain-modeling, needs-triage. A real case: map #1965 for this textbook, 11 tickets; task #1987 wrote 23 stories under spec #1985."
revision: '145cc119d8d1064fab2dc6ef674cae9d60e3c7f2'
revisionDate: '2026-11-12'
publishedAt: '2026-11-03T13:25:19Z'
---

A Trusted user has an idea too big for one session, and the way to it isn't clear yet. This Walkthrough follows that idea from their side: it becomes a map of open questions on GitHub, sessions settle the questions one at a time, and the map ends in a spec whose stories agents build.

## 1. The idea becomes a map

The Trusted user types `/wayfinder` with the idea; the Skill never starts on its own. The session first grills them to name the destination, such as a spec ready to build, then grills again across the whole idea for the open decisions. It writes the result as one issue labelled `wayfinder:map`: the destination, notes every later session should read, an empty list of decisions so far, and the questions that can't be asked sharply yet.

::lessons
[Wayfinder](/t/glassbox/guide/skill-pack/wayfinder) · [Claude Code skills](/t/glassbox/guide/claude-code/skills)
::

## 2. Each sharp question becomes a ticket

Every question that can be stated precisely becomes a decision ticket: a sub-issue of the map, labelled with its type, `research`, `prototype`, `grilling` or `task`. A second pass links which tickets block which, with GitHub's own issue dependencies. The session starts a research subagent on each research ticket and stops there: it resolves no other ticket.

::lessons
[Wayfinder](/t/glassbox/guide/skill-pack/wayfinder)
::

## 3. One ticket per session

A later session loads the map, takes the first open ticket that nothing blocks and nobody holds, and claims it by assigning it first. It resolves one ticket, research tickets apart, which it may resolve several of: an answer in a comment, the issue closed, and one line in the map's decisions. Questions the answer makes sharp become new tickets. The triage sweep may add `ready-for-human` beside a grilling or prototype ticket's `wayfinder:` label.

::lessons
[Wayfinder](/t/glassbox/guide/skill-pack/wayfinder) · [Issue triage labels](/t/glassbox/guide/git-github/issue-triage-labels)
::

## 4. Each type of ticket has its own Skill

A grilling ticket is a conversation with a Trusted user, run with `grilling` and `domain-modeling`, which writes settled words into a glossary and settled decisions into an ADR. A prototype ticket builds something rough to react to with `prototype`; a research ticket reads primary sources with `research`; a task ticket does the work a decision is waiting on. An agent never resolves a grilling or prototype ticket alone.

::lessons
[Wayfinder](/t/glassbox/guide/skill-pack/wayfinder) · [Ubiquitous language](/t/glassbox/guide/terrarium-practice/ubiquitous-language) · [Decision records](/t/glassbox/guide/terrarium-practice/decision-records) · :file[.agents/skills/grilling/SKILL.md]
::

## 5. The map hands off to a spec

When nothing is left to decide, the way is clear. `to-spec` writes the decisions up as a spec, an ordinary issue here, and `to-tickets` breaks it into thin stories that each work end to end. Each story is a sub-issue of the spec and starts with a `Part of` line naming it. Both are filed `needs-triage`, not `ready-for-agent` as the installed Skills say; a spec whose body puts it on hold, and its stories, carry no label.

::lessons
[Planning skills](/t/glassbox/guide/skill-pack/planning-with-the-pack) · [Issue triage labels](/t/glassbox/guide/git-github/issue-triage-labels) · :file[.agents/skills/to-spec/SKILL.md] · :file[.agents/skills/to-tickets/SKILL.md]
::

## 6. The stories are built, one PR at a time

From here each story is ordinary work: triage marks it ready to build, then a session builds it on its own branch, reviews it, runs the :term[Gate] and opens a PR. A story the issue view shows as blocked waits for its blockers to close.

::lessons
[Engineering skills](/t/glassbox/guide/skill-pack/engineering-skills) · [Pull requests](/t/glassbox/guide/git-github/pull-requests) · [Merge gate](/t/glassbox/guide/verification/gate)
::

## A real case

On 14 October 2026 a session charted a map with the owner, issue #1965, for a new Tenant: this textbook. By the end of the day it held eleven tickets: two research, two prototype, four grilling and three task. Its notes told every session which Skills each type called, and to post research findings as a comment on the ticket. The tickets settled the content model, the page shapes, code citations and diagrams. A task ticket, #1987, wrote 23 stories under the spec, #1985, before the day was out (UTC), and the map's "Not yet specified" section ended on "Nothing: the way is clear."

## Where next

- [Wayfinder](/t/glassbox/guide/skill-pack/wayfinder)
- [Planning skills](/t/glassbox/guide/skill-pack/planning-with-the-pack)
- [](/t/glassbox/guide/terrarium-practice/ubiquitous-language)
- [Engineering skills](/t/glassbox/guide/skill-pack/engineering-skills)
- [A bug report becomes work](/t/glassbox/guide/walkthroughs/a-bug-report-becomes-work)
