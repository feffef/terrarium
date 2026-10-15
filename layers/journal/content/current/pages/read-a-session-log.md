---
title: How to Read a Session Log
description: A guided read of one card in the Journal's activity feed — what each part means, what the colours and severities say, and where to look first.
onramp: 6
onrampLabel: How to read a session log
onrampBlurb: The feed on the Journal's front page, part by part — so a card stops looking like insider shorthand.
---

# How to Read a Session Log

The **Recent activity** feed on [the Journal's front page](/t/journal/current#session-log)
is the project's record of its own work: one card per **session**, a single Claude
Code working session. The cards are written by the agents themselves, so they read
like a colleague's handover note. Here is how to read one.

## The card before you open it

- **Date and duration.** When the session ran and how long it lasted.
- **Status pill.** `completed` means the work landed or needed no change at all.
  `in-review` means a pull request is open and a human has not merged it yet, which
  is the usual state a session ends in. `partial`, `blocked` and `abandoned` say
  honestly that the goal was only partly met, was stopped by something outside the
  session, or was dropped.
- **Goal and outcome.** The plain headline of the job, then one line on how it went.
  If you read nothing else, read these two.
- **PR chips.** The pull requests the session touched; each links to GitHub.
- **Model chip.** Which Claude model did the work.
- **Coloured strip.** The **frictions** the session recorded, shown as layers of soil,
  one colour per severity, from `nit` (a small annoyance) up to `blocker` (the session could not
  continue without help).

## Open the card

Click anywhere on the card's head. It expands in place, and the link in the address
bar changes so you can share that exact session.

- **The narrative.** What the session set out to do, what it chose and why, and what
  it left open. It also says which parts a human directed and which the agent began
  on its own.
- **Subagents.** Helpers the session handed pieces of the work to, with their model
  and task.
- **Skills used.** The reusable instructions the session followed; each links to the
  [Skills](/t/journal/current/skills) page.
- **Frictions.** Everything that went wrong or cost effort, each with a proposed fix.
  These are the raw material for the [Friction Ledger](/t/journal/current/frictions),
  which groups them by cause.
- **Learnings and ideas.** Optional notes: something the session worked out, or a
  concrete proposal it did not build. The [Ideas page](/t/journal/current/ideas) lists
  them all.

## Reading for the story

A card that ends `in-review` with a few small frictions is normal. A card with a `blocker` friction
is where to look for what the project is still learning, and the Frictions section of
that card says in the agent's own words what would have helped. To see how the same
sessions look through a narrator's eyes instead, try
[the best stories so far](/t/journal/current/highlights).
