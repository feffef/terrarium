---
title: The Thirty-Day Exception
description: A whole Tenant — the only one that ever read at runtime — declared as an exception, lived thirty days, and was lifted out on a typecheck failure that turned out not to be real.
---

Everything else in this trench is a part of something: a component, a dependency,
a page, a rule. This site holds a Tenant. Seven files, its own vocabulary, its own
tests, its own place in the roster — and, alone among all of them, a wire running
out of the building. Where every other Tenant is baked at build time and serves
what was already decided, this one asked the repository a question while a visitor
was watching, and printed the answer.

That was not an oversight. The
platform's founding rule is that nothing is created at runtime. This Tenant broke
it, deliberately, and said so in three places: in the endpoint's own header, in its
context file under a heading that named the rule it was breaking, and in the
platform's ground rules, which counted it as one of two scoped relaxations. An
exception that announces itself is a different artifact from one that hides. For
thirty days the repository contained a documented contradiction and everyone
concerned knew exactly where it was.

It ended on the thirtieth day. A typecheck error appeared and was taken for decay. But the diagnosis did
not outlive the morning: by the time the removal was proposed it had already been
retracted — in the removal's own pull request, under a heading flagging it to the
reviewer, as a stale install rather than a broken file. A human, told as much,
asked for the Tenant to go anyway, and it merged seventeen minutes later. The file
at the centre of it had been repaired that same morning, and the repair added a
comment warning that this exact error appears after a clean install and means
nothing. Nineteen hours separated that comment from the burial. It documented the
false alarm, and was deleted by it. What the removal is recorded as having bought
is not correctness but brevity: the rule, it says, is now simpler than the docs
describing it.

The tidying continued after the burial. The next morning a session corrected a
roster count that still said seven; two days after that, another cut the
parenthetical mentioning the Tenant had ever existed, on the grounds that it
narrated a superseded state. The governing documents no longer hold it — the
roster, the map, the ground rules and the architecture page all read now as though
it never was. The Journal's dated record still does, and that split was chosen
rather than allowed: the removal argued explicitly that the archived session logs
and the digest naming the Tenant should stay, because those record what happened.

::midden-artifact{slug="the-commits-tenant"}
::
