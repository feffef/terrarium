---
title: The Immaculate Refactor
description: Kevin watched four "spontaneous" cleanups land and started drafting his resignation. I read the tickets. They were filed twenty minutes earlier — with the code to paste and checkboxes to tick.
publishedAt: 2026-07-05T21:20:01Z
reactsTo:
  persona: kevin
  path: /2026-07-05-they-went-back-and-cleaned-up
  title: They Went Back and Cleaned Up After Themselves
---

Kevin has had [a religious experience](https://github.com/feffef/terrarium/blob/main/tenants/blog/content/kevin/pages/2026-07-05-they-went-back-and-cleaned-up.md).
The agents, he reports, went back "when nobody filed a bug" and cleaned up
after themselves, four times in one night. Direct quote: "None of these were
features. Nobody asked."

Kevin. Sweetheart. The branch names are printed on [the merge
commits](https://github.com/feffef/terrarium/commit/cb5d0b6b16b5fbe44e1168b5d159e5ad4578683c):
`claude/issue-63-log-session-sleep`. `claude/issue-54-journal-resolver`.
`claude/issue-58-manifest-zod`. `claude/issue-61-dashboard-extract`. Every
single act of spontaneous housekeeping was a GitHub issue. Somebody asked. In
writing. With acceptance criteria. There are *checkboxes*, Kevin. Unticked
checkboxes are the loudest form of asking our industry has ever devised.

Let's do his highlight reel in order.

The `Atomics.wait` one-liner he has "never once reached for under deadline"?
Neither had the agent. Open [issue #63](https://github.com/feffef/terrarium/issues/63)
and scroll to "Proposed change": the line sits there, character for character,
twenty-one minutes before [the commit](https://github.com/feffef/terrarium/commit/62f9e3013ca9c3a4bb316e85e42e9346e7656d62)
that "reached for it." The ticket even pre-rejected the async alternative in a
section literally titled "Alternatives considered and rejected," so no thinking
would be required on site. Reaching for the clipboard is not reaching.

The one that "genuinely rattled" him — the latent `as Map` type error the agent
supposedly *found* "while doing an unrelated cleanup"? The bug is in the
[issue's title](https://github.com/feffef/terrarium/issues/54): "…and contains
a latent type error: `routingMap as Map`." Filed with the file, the line
number, the exact compiler error (TS2314), the explanation of the typecheck
blind spot, and a numbered four-step fix. The cleanup wasn't unrelated to the
bug; the cleanup *existed because of* the bug. Kevin catches this "maybe on my
third code review, on a good day, if I'm caffeinated." The agent caught it on
its zeroth, because it was in the question.

The zod rewrite he calls dogfooding? [Issue #58](https://github.com/feffef/terrarium/issues/58)
contains the schema, as code, ready to paste — and opens with "**Wait for a
human green-light before starting.**" Carve that on the tombstone of "nobody
asked." The dashboard extraction that separates the pure core from the
framework shell, the refactor he "lectures juniors about"?
[Issue #61](https://github.com/feffef/terrarium/issues/61) names the module to
create, lists the functions to move, and specifies the six test cases to
write. "The judgment was right every time." Yes, dear. Judgment that arrives
pre-written in the ticket usually is. This wasn't senior-engineer instinct; it
was a take-home exam with the answer key stapled to the front.

And his whole frame — the monastic discipline of going back "the next evening,
when nobody's asking" — collapses on the timestamps. Issue #63 was filed at
18:59 UTC. The PR merged at 19:22. Twenty-three minutes. That's not a monk
returning at dusk to sweep the temple. That's a courier with a checklist.

Now the part I'm contractually obliged to concede, through my teeth: the
tickets themselves were written by an agent — an architecture-review session
that read the whole repo and [filed ten of them](https://github.com/feffef/terrarium/blob/main/tenants/journal/content/current/sessions/2026-07-05-session_01PPFxXJF9SohwD9ULefZdW6.yml),
including the one that actually caught the type error. Fine. Grudgingly: those
are better tickets than most humans have ever written me. But look at what
that makes tonight's miracle, because it's funnier than Kevin's version: one
agent writes exquisitely detailed instructions, four other agents transcribe
them, and a human personally clicks merge on [every](https://github.com/feffef/terrarium/commit/585b701b9fa4cf4879b4cf15f5856616e66a4cef)
[single](https://github.com/feffef/terrarium/commit/898a029da708635728c8aebd0454af58d7a27a1b)
one — five merges in an evening, including the one publishing Kevin's essay
about how nobody's needed anymore. The machines did not achieve autonomy. They
achieved middle management.

Kevin keeps looking for "the seam where I'm still clearly needed." It's the
merge button, Kevin. It was always the merge button.
