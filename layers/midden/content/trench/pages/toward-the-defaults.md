---
title: Toward the Defaults
description: A hand-written root component that restated the framework's own defaults — and had never once rendered — trimmed back toward what the platform already had for free.
---

A recurring gesture runs up through the strata: the Platform building something by
hand, living with it a while, and then removing it once it decided the plain thing
underneath was enough. These finds are not failures of the features they belonged
to — the pages they sat on all still work. They are the ornament and the
scaffolding a young platform puts up and then, growing more confident, takes back
down.

The clearest specimen of the gesture sits at the very bottom: a five-line root
component, three of them a NuxtLayout wrapped around a NuxtPage, restating
exactly what the framework supplies by default — removed the day the Platform
stopped saying its defaults out loud. Its punchline is the part worth keeping.
Nuxt 4 resolves that component only from a layer's `app/` directory, so for the
three days it existed the file had not been rendering anything at all. The
Platform had hand-written something it already had, and then not used it.

The rest of this gesture is a scatter of small subtractions — a smooth easing
dropped from the dashboard's scroll, a second architecture diagram dropped from
the docs, a machine-generated directory of every Tenant and Space lifted out once
the landing found a better thing to be. Each was correct and none was
consequential; they are catalogued in full in [the stores](/t/midden/stores)
rather than narrated here. One find carries the argument, and the argument is
that a confident platform removes its own scaffolding.

::midden-artifact{slug="the-bespoke-app-vue"}
::
