---
title: The Generated Map
description: The committed, drift-checked routing machinery, dug out whole when the build learned to derive it in memory.
---

At the very bottom of the trench lies a complete little machine for keeping a
file honest. For the Platform's first day, the runtime routing map — every
Tenant, Space and Collection, flattened to the keys the client needs — was
*generated* by a script, *committed* to the tree, and *drift-checked* on every
build so the committed copy could never fall out of step with the manifests it
came from. It worked. It was also an entire apparatus built to guard a file that,
it turned out, did not need to exist on disk at all.

When the build learned to derive the map in memory and expose it as a virtual
module, the whole assembly came out together, in a single stratum, over two days:
the generated file itself, the generator that wrote it, the generated form of the
content config beside it, the little `pnpm gen &&` that opened every build script,
and the CI step that policed them all. The Platform's own commentator posted an
obituary the next morning — a live post titled "The Generator Is Gone" — which is
how we can date the layer so precisely. What follows is the machine, laid out in
the order it was assembled and abandoned.

::midden-artifact{slug="committed-routing-map"}
::

::midden-artifact{slug="the-generator"}
::

::midden-artifact{slug="the-committed-config"}
::

::midden-artifact{slug="the-gen-prefix"}
::

::midden-artifact{slug="the-drift-check"}
::
