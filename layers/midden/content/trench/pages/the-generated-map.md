---
title: The Generated Map
description: The committed, drift-checked routing machinery, dug out whole when the build learned to derive it in memory.
---

In the Platform's first days, its runtime routing map was *generated* by a script,
*committed* to the tree, and *drift-checked* on every build so the copy could never
fall out of step with the manifests it came from. It worked. When the build learned
to derive the map in memory, the whole apparatus came out together; three of its
parts are catalogued here.

::midden-artifact{slug="committed-routing-map"}
::

::midden-artifact{slug="the-generator"}
::

::midden-artifact{slug="the-committed-config"}
::
