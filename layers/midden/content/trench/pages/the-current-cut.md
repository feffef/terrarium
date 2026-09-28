---
title: The Current Cut
description: The finds that were freshest when this cut was dug — a complete feature PR closed when its own CI went unstable, and a patch to a dependency, removed at the owner's request when it had not stopped the fault it was written for.
---

This cut was the open one when it was dug, and the finds in it are graded *fresh*
not because they are unfinished — most are as complete as anything deeper down —
but because, at the moment they were assessed, they had been discarded so recently
that they read as if they might yet be picked back up. Their season has since been
named and closed as the Plainer Cut, with three more opened over the top, and a grade
is never re-derived once set. Read them, then, as they were: barely cold.

The first is a finished feature pull request closed without merging: a small
copy-link button for the journal's session and digest heads, screenshot-verified
and complete, closed when its own CI went unstable — and worth reading for the
mechanism, the `.stop` modifiers that kept the button from toggling its parent
disclosure quietly swallowing the very click that opened the card: forty-two of
forty-two on the local gate, three accordion tests down across two CI runs. The
second came out
with its own shadow attached: a local patch to the content engine's
client-side database loading, carried against a pinned version for eight days.
It had not stopped the empty page it was written for, and the owner had it
removed rather than keep a private copy of someone else's code; a message asking
the reader to reload took its place. It was lifted out together with the one-line
workspace file that had existed only to declare it.

A third find from this season, a gate closed twenty seconds after it went green,
is catalogued a layer over in [Built and Never Fired](/t/midden/trench/built-never-fired),
where its grade properly belongs.

::midden-artifact{slug="the-copy-link-button"}
::

::midden-artifact{slug="the-nuxt-content-patch"}
::
