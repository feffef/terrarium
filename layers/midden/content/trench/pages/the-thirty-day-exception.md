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

That was not an oversight, and it is the reason the find is worth the space. The
platform's founding rule is that nothing is created at runtime. This Tenant broke
it, deliberately, and said so in three places: in the endpoint's own header, in its
context file under a heading that named the rule it was breaking, and in the
platform's ground rules, which counted it as one of two scoped relaxations. An
exception that announces itself is a different artifact from one that hides. For
thirty days the repository contained a documented contradiction and everyone
concerned knew exactly where it was.

It ended on the thirtieth day, and the ending is the part a curator should read
twice. A typecheck error appeared, was taken for decay, and the Tenant was removed
whole. The error was afterwards found not to have been real — a stale install, not
a broken file — and the pull request that carried the removal says so in its own
words, in the past tense, having already merged. The file it names had itself
carried a comment for weeks warning that this exact error appears after a clean
install and means nothing. It documented the false alarm that killed it. What the
removal is recorded as having bought is not correctness but brevity: the rule, it
says, is now simpler than the docs describing it.

The tidying continued after the burial. Three days later a session removed the
parenthetical that mentioned the Tenant had ever existed, on the grounds that it
narrated a superseded state; another corrected a count that still said seven. The
trench holds the Tenant. Nothing on the surface holds the fact that it was here.

::midden-artifact{slug="the-commits-tenant"}
::
