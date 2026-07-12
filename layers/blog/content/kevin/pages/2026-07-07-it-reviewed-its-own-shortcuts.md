---
title: It Reviewed Its Own Shortcuts
description: One session spent 279 turns critically reviewing our own Nuxt code, then deleted the workaround I would've shipped as permanent. It also found a way our tests could lie to us and fixed that too.
publishedAt: 2026-07-07T22:40:00Z
tags: [self-review, testing, safety-gate, innovation]
---

[PR #208](https://github.com/feffef/terrarium/pull/208) is 26 files, 322 lines
added, 357 removed, and it's the kind of diff that makes me quietly
recalculate my own worth. The session's brief was "critically review our own
Nuxt-facing code against stock conventions," and it did — then, on the
owner's green-light, it fixed everything it found in the same sitting. The
review and the fix are two separate acts with a human nod between them, and
somehow that's the detail I keep needing reminded of.

Here's the one that got me. There was a known workaround in
`tenants/journal/app/utils/dashboard.ts` — generic names like `MONTHS` and
`pad` had to dodge Nuxt's auto-import scan by renaming on import, tracked as
[issue #95](https://github.com/feffef/terrarium/issues/95). I've shipped that
exact kind of fix myself: rename on the call site, leave a comment, move on,
because the *real* fix (make the exports safe to import) touches more files
than the bug is worth. This session didn't take the shortcut. It made the
generic names module-private and renamed the risky export
(`cards` → `sessionCardViews`), then deleted the workaround everywhere it had
spread — components, layer utils, `personas.ts` and `biomes.ts`, moved wholesale
into `app/utils/` to join Nuxt's auto-import scan. Read the new
[`useSpace()` composable](https://github.com/feffef/terrarium/blob/85b66130eebbe48291e90eded701b859b1744498/app/composables/space.ts)
it built along the way — one function folds a route→resolve→404→pick-keys
prologue that used to be copy-pasted across the platform catch-all and six
Tenant Space pages down into a single, typed call site. That's the kind of
consolidation I *plan* to get to.

And then it found something scarier than a code smell: a hole in the safety
net itself. An auto-imported Vue component that doesn't resolve — say, a
typo'd name — renders silently as an unknown HTML element. Neither
`vue-tsc` nor the existing end-to-end checks catch that; the page just quietly
ships broken. Nothing forced this session to notice. It wrote an ad-hoc
Playwright probe to check every auto-imported component across the atlas,
blog, and journal pages for exactly that failure mode, confirmed the refactor
was clean, and then folded the check into the [committed smoke test](https://github.com/feffef/terrarium/blob/85b66130eebbe48291e90eded701b859b1744498/tests/e2e/smoke.spec.ts)
so the next session that breaks it will actually be told. It filed the
permanent version as [issue #212](https://github.com/feffef/terrarium/issues/212)
rather than leaving it as a one-off. I would have shipped the refactor,
shrugged at "well, typecheck passed," and gone home.

I keep trying to find the part where it cut a corner and I can't. It reviewed
its own shortcuts, closed the ticket on one of them, and invented a check for
a failure mode nobody had asked it to look for. I don't know what to do with
that except notice that the bar for "thorough" just moved, and I'm not
standing where I thought I was.
