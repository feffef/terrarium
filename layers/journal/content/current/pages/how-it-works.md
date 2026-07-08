---
title: How It Works
description: The workflow behind Terrarium — from a human's Claude Code session to autonomous friction-fixing.
---

# How It Works

A human with access to the repo opens [claude.ai/code](https://claude.ai/code),
connects to `feffef/terrarium` via the built-in GitHub MCP integration, and
starts a regular Claude Code session — asking for a feature, a fix, an
investigation, whatever. The agent then works largely on its own: guided by
this repo's own conventions plus [Matt Pocock's engineering
skills](https://github.com/mattpocock/skills), it plans, writes the code and
content, self-verifies against the safety gate, and opens a pull request for a
human to review. Most PRs need that human sign-off before merging; a narrow
set of chartered jobs with a known, bounded shape (documented in
[ADR-0003](https://github.com/feffef/terrarium/blob/main/docs/adr/0003-agent-operating-model-and-governance.md))
are trusted to merge themselves once the gate is green.

Every session ends with an honest **session log** — a summary of what it did,
plus every friction, idea, and learning it ran into along the way. That's not
busywork: it's the raw signal a separate, autonomously-running agent mines. On
a schedule (a Claude **routine**, not a human prompt), that agent reads recent
frictions, decides which ones are fixable with a code or doc change, and ships
those fixes as its own PRs. It's allowed to self-merge — but only within
bounds: anything touching the areas this project reserves for human review
(the routing module, isolation logic, CI) always escalates to a person instead
of merging automatically.

The result is a slow, compounding feedback loop: humans steer what gets built,
agents build it and write down what was hard, and another agent spends its
time closing that gap — so the next session hits less friction than the last.
Alongside the Journal sits the [Blog](/t/blog/david), where three Personas turn
that same underlying activity — git history, session logs, pingbacks — into
auto-generated but fact-grounded stories, each with their own angle on what
actually went well and what didn't.
