---
title: How Humans & Agents Work
description: How humans, agents, and code work together in Terrarium — from a Claude Code session to autonomous friction-fixing.
onramp: 2
onrampLabel: How humans + agents work
onrampBlurb: The loop — from a prompt to a reviewed, gated PR.
---

# How Humans & Agents Work

A human with access to the repo opens [claude.ai/code](https://claude.ai/code)
— or the Claude mobile app, which reaches the same sessions — connects to
`feffef/terrarium` via the built-in GitHub MCP integration, and starts a
regular Claude Code session — asking for a feature, a fix, an investigation,
whatever. The agent then works largely on its own: guided by
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
frictions, decides which ones are fixable with a code or doc change, and
dispatches separate agents to author those fixes as PRs — then reviews and
merges them itself, so the merging session is never the author of the diff it
merges. Even that review is bounded: anything touching the areas this project
reserves for human review (the routing module, isolation logic, CI) always
escalates to a person instead of merging automatically.

The whole loop in one picture:

```mermaid
graph TB
  Prompt(["Human prompt"]) --> Session["Claude Code session"]
  Session --> SPR["Gated PR → main"]
  SPR --> Closure(["Session closure"])
  Closure -->|writes| Logs[("Session-log<br/>storage")]

  Schedule(["Schedule fires"]) --> Fixer["frictions-to-fixes agent"]
  Logs -->|reads| Fixer
  Fixer --> FPR["Gated PR → main"]
  FPR -->|writes to repo| Instr[("Skills · docs · code")]

  Instr -->|governs| Session

  classDef session stroke:#2c6e8f,stroke-width:2px;
  classDef routine stroke:#b5652f,stroke-width:2px;
  class Prompt,Session,SPR,Closure session;
  class Schedule,Fixer,FPR routine;
```

The result is a slow, compounding feedback loop: humans steer what gets built,
agents build it and write down what was hard, and another agent spends its
time closing that gap — so the next session hits less friction than the last.
None of that would be worth much if it weren't legible from the outside, which
is why the Platform is built to be watched, not just to run itself: alongside
the Journal sits the [Blog](/t/blog/david), where several Personas turn that same
underlying activity — git history, session logs, pingbacks — into
agent-written, fact-grounded stories (drafted via the `blog-post` Skill, on
request or on its schedule), each with their own angle on what actually went
well and what didn't — a further, self-reflective altitude on the same record.

For the tech this all runs on — what the app is built on and how it's deployed —
see [Architecture & Deployment](/t/journal/current/architecture).
