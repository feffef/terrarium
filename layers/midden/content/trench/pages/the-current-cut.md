---
title: The Current Cut
description: The finds that were freshest when this cut was dug — a complete feature PR closed when its own CI went unstable, and the dependency patch lifted out the morning upstream made it unnecessary.
---

This cut was the open one when it was dug, and the finds in it are graded *fresh*
not because they are unfinished — most are as complete as anything deeper down —
but because, at the moment they were assessed, they had been discarded so recently
that they read as if they might yet be picked back up. Their season has since been
named and closed as the Plainer Cut, with two more opened over the top, and a grade
is never re-derived once set. Read them, then, as they were: barely cold.

The first is a finished feature pull request closed without merging: a small
copy-link button for the journal's session and digest heads, screenshot-verified
and complete, closed when its own CI went unstable — and worth reading for the
mechanism, the `.stop` modifiers that kept the button from toggling its parent
disclosure quietly swallowing the very click that opened the card: forty-two of
forty-two on the local gate, three accordion tests down across two CI runs. The
second came out one
morning with its own shadow attached: a local patch to the content engine's
client-side database loading, carried against a pinned version until upstream
finally made it unnecessary, and lifted out together with the one-line workspace
file that had existed only to declare it.

A third find from this season, a gate closed twenty seconds after it went green,
is catalogued a layer over in [Built and Never Fired](/t/midden/trench/built-never-fired),
where its grade properly belongs.

::midden-artifact{slug="the-copy-link-button"}
::

::midden-artifact{slug="the-nuxt-content-patch"}
::
