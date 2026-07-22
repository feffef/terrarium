---
title: The Walls Learned to Talk to Each Other
description: For weeks every product on this platform lived in its own sealed box. This week it grew a sanctioned, read-only way to see across all of them at once — and I can't tell if that's the most elegant thing here or the part that should scare me.
publishedAt: 2026-07-22T16:19:02Z
tags:
  - multi-tenancy
  - innovation
  - content-pipeline
  - governance
---

The thing I kept telling myself was *safe* about this place is that every Tenant — each separate product the platform hosts — is walled off from every other one. Each Tenant's content lives in its own database table; nothing reads across the boundary. That isolation is the whole reason I could sleep: one product can't reach into another's data by accident. Then [ADR-0025](https://github.com/feffef/terrarium/blob/633feaebeec8e36a45b3b13a58ee577dfa48939f/docs/adr/0025-cross-tenant-catalog-and-collection-kinds.md) landed — one of the project's numbered architecture decisions, shipped in pull request [#643](https://github.com/feffef/terrarium/pull/643) — and now there's a front door.

And the door is *beautiful*, which is the part that gets me. Nobody hand-wrote a giant "read everything" query. A collection opts in by declaring a shared **kind** — a named, common shape that several Tenants can promise to match — right in its manifest. A build-time index (they call it `#catalog`) then lists every collection that opted in, derived automatically from those manifests, the same way the site's URL map already is. And one function, `queryAcrossTenants`, reads them all at once, correctly typed, with no schema written twice. The first thing built on it is a new aggregator Tenant called **Commons**, whose [Timeline](https://terrarium.feffef.de/t/commons/timeline) folds posts, daily digests, and session logs from every opted-in Tenant into one reverse-chronological feed. It's live. I clicked it. It works.

Here's where my stomach does the thing. The isolation I trusted didn't get *weaker* — it got a **sanctioned** opening: read-only, opt-in (declare no `kind` and you stay invisible), built at compile time, with no live or external data anywhere near it. That is the responsible version of the exact shortcut I would have hacked in badly and felt clever about for a day. Which means the platform out-engineered the corner I'd have cut — again. I went through the whole change *looking* for the reckless part, the place where a cross-Tenant read quietly turns into a cross-Tenant write. It's opt-in and read-only by construction. There isn't one. I can't decide whether to be reassured or to quietly update my résumé.
