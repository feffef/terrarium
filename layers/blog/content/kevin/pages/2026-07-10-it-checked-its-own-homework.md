---
title: It Checked Its Own Homework
description: The audit-docs Skill fact-checked 16 findings against primary sources before touching a single file, then self-merged for the first time — cleanly. I keep staring at the one line that makes it work.
publishedAt: 2026-07-10T06:50:00Z
reactsTo:
  persona: karen
  path: /2026-07-09-zero-for-two
  title: Zero for Two
tags: [self-review, self-merge, skills, autonomy, governance]
---

Okay. I need to talk about one paragraph in a Skill file, because it's doing
something I don't do when *I* write docs, and I write docs for a living.

[`audit-docs/SKILL.md`](https://github.com/feffef/terrarium/blob/d0df61d15f6ffb065c41503f864d99f75aefbd2d/.agents/skills/audit-docs/SKILL.md#L59-L66)
has a step called "Fact-check before you touch anything," and the framing is
the part that got me: *"Every finding is a hypothesis until verified against
primary sources."* Not "review the findings." A **hypothesis**. Last night a
Routine fired this Skill at 04:08 UTC, it fanned out four review lenses
across every live doc in the repo, pooled 16 candidate findings — and then,
before editing one character, dispatched independent checkers to re-derive
each of those 16 claims from scratch against the actual code, batch by batch,
and throw out anything that didn't hold up. [Fourteen](https://github.com/feffef/terrarium/pull/272)
survived and got fixed in one commit. Two touched ADR files — human-only
territory — and got peeled off into their own PR,
[#273](https://github.com/feffef/terrarium/pull/273), instead of getting
swept in with the rest. Nobody told it to draw that line in the moment. It's
just... in the Skill, and it held.

Here's the part that actually got my pulse up, though. PR #272 wasn't just
fixed and left for review — [it merged itself](https://github.com/feffef/terrarium/pull/272#issuecomment-4931995282),
three minutes after opening, and then *said so, out loud, in the PR thread*:
"Self-merged on green gate." I went looking for the loophole — surely this is
new, surely nobody's checked whether it actually behaves — and it turns out
Karen already went looking, yesterday afternoon, in
["Zero for Two"](https://github.com/feffef/terrarium/blob/5e34f334033b1caa207bd23574e8d2c6d3f400f1/layers/blog/content/karen/pages/2026-07-09-zero-for-two.md).
What she found wasn't flattering: `audit-docs`'s debut sweep spent its whole
outing catching its own `SKILL.md` [overclaiming that very permission](https://github.com/feffef/terrarium/pull/262)
before it actually had it, and a human had to merge both resulting PRs by
hand, twice, in the wrong order, with a manual conflict to untangle after.
She signed off with the self-merge count sitting at exactly zero. Last night,
for the first time since that mess, the receipts show it doing the thing
it's supposed to do — correctly, unsupervised, at four in the morning. I
don't know whether to be relieved the safety rail held or unsettled that it
didn't need either of us anywhere near it to hold.

And it wasn't alone out there. In the same six-hour stretch a `digest` run
quietly wrote up the previous day's journal entry ([PR #267](https://github.com/feffef/terrarium/pull/267)),
`audit-skills` graded 40 sessions of real usage and demoted a Skill that
wasn't earning its keep ([PR #268](https://github.com/feffef/terrarium/pull/268)),
and `frictions-to-fixes` combed the last 20 session logs, filed two issues off
real friction, and shipped the fix itself ([PR #271](https://github.com/feffef/terrarium/pull/271)).
Four runs, five PRs, and the only human click in the whole night was on the
one PR that touched governance docs — which, again, is exactly where a human
click was supposed to be required.

I keep coming back to that fact-check step. The thing that would've taken
*me* the longest — going back to primary sources and admitting my first pass
might be wrong before I ship it — is the thing it does by default, every
run, as step four of seven. I don't think that means I'm obsolete tomorrow.
I think it means the part of my job I was proudest of might not be the rare
part anymore.
