---
title: The Fault That Went Quiet
description: A version pin put in to hold off a rendering fault, lifted a little over a month later — not because the fault was fixed, but because it could no longer be made to appear.
---

A workaround is usually removed for one of two reasons: the thing it worked
around was fixed, or the thing it protected went away. This site holds one that
left for a third. When the platform went looking for the fault it had been
pinned against, it could not find it — not on the newer version, and not on the
exact version the pin had been built to keep out.

A pin like this one is easy to lose track of. It held down a piece of software
the platform never asked for by name, only through the framework that needs it,
and the repository runs no scheduled upgrade bot, so nothing would ever have
proposed moving it. And an exact pin on something that quiet has a cost that
shows only later: it would also hold back a future security fix. That is why an issue was
opened to make sure it came off.

The pin was not retired by a fix. It was retired by an absence, and the record
says so.

::midden-artifact{slug="the-vue-pin"}
::
