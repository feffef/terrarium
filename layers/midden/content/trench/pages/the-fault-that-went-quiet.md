---
title: The Fault That Went Quiet
description: A version pin put in to hold off a hydration fault, lifted a little over a month later — not because the fault was fixed, but because it could no longer be made to appear.
---

A workaround is usually removed for one of two reasons: the thing it worked
around was fixed, or the thing it protected went away. This site holds one that
left for a third. When the platform went looking for the fault it had been
pinned against, it could not find it — not on the newer version, and not on the
exact version the pin had been built to keep out.

The pin went in under pressure. A framework security release had to land, and
taking it turned more than a third of the end-to-end suite red: every page
rendered from Markdown mismatched between server and browser. The fault was
bisected before anything was pinned, and the bisection was specific — it needed
the new framework and one particular vue together. An issue was opened the next
day to make sure the pin would come off, on the grounds that nothing else in the
repository would ever raise its hand about it.

It came off a little over a month later, and the removing commit is careful
about what it does not know. The fault did not reproduce on the newest vue, and
then — as a control nobody had asked for — it did not reproduce on the version
the pin excluded either. The commit offers a hypothesis about the original
failure, labels it a hypothesis, and says what it would take to test it. The
pin was not retired by a fix. It was retired by an absence, and the record says
so.

::midden-artifact{slug="the-vue-pin"}
::
