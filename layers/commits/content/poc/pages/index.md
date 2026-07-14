---
title: Commits PoC
description: A technical proof-of-concept — read the repo's latest commit at runtime via a backend git call.
---

# Commits PoC

A deliberately tiny technical proof-of-concept. This page reads the
repository's **latest commit message at runtime** through a backend endpoint
that shells out to the local `git` CLI — a scoped, intentional exception to the
Platform's build-time-baked model (ADR-0001).

::latest-commit
