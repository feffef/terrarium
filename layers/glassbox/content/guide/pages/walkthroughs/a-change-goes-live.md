---
title: A change goes live
description: How a new commit on main reaches visitors, through one container that notices it, builds it beside the live site and swaps only a build that worked.
revision: '8fecf8b4e1b32da82557e42f42b2045bd12a05bb'
revisionDate: '2026-10-15'
---

A commit lands on `main`, and with no one running a deploy, the live site changes. This Walkthrough follows that commit from the container's side: from noticing it, through the install and the build, to the restarted server that answers the next visitor.

## 1. A commit lands on `main`

The commit is a merged PR, or a :term[session log], which lands without one. Both take the same road from here: a blog post, a session log and a code fix all go live through the same pull, build and restart.

::stop-links
[Every change as a PR](/t/glassbox/guide/git-github/every-change-a-pr) · [Session logs and Frictions](/t/glassbox/guide/terrarium-practice/session-logs) · :file[scripts/log-session.ts]
::

## 2. The container notices it

The script that runs the container fetches `main` again after each pause. When `main` has moved past its checkout, it resets the checkout to the new commit. It doesn't wait for CI: the Gate also runs on every push to `main`, but nothing in the container reads the result, so the checks that ran before the merge are the only ones that count.

::stop-links
[The self-updating container](/t/glassbox/guide/deploy/self-updating-container) · [The Gate](/t/glassbox/guide/terrarium-practice/gate) · :file[deploy/entrypoint.sh] · :file[.github/workflows/gate.yml]
::

## 3. Packages, only when the lockfile changed

The script compares a hash of `pnpm-lock.yaml` with the hash it saved after its last good install. Only when they differ does it install packages again, from the lockfile exactly. If that install fails, the previous build stays live.

::stop-links
[The self-updating container](/t/glassbox/guide/deploy/self-updating-container) · :file[deploy/entrypoint.sh] · :file[pnpm-lock.yaml]
::

## 4. The build runs beside the live site

`pnpm build` runs `nuxt build` in the checkout while the old server keeps answering. Nuxt Content parses every :term[Collection] and saves each one as a dump, the SQL that rebuilds its table. Nuxt builds the app once for the server and once for browsers. Nitro, Nuxt's server engine, writes the result to `.output/`: a server that runs on its own, without the project's `node_modules`, with the dumps inside. If the build fails, nothing is swapped: the old build stays live, and the script tries again only when the next commit arrives.

::stop-links
[The content database](/t/glassbox/guide/nuxt-content/content-database) · [The self-updating container](/t/glassbox/guide/deploy/self-updating-container) · :file[nuxt.config.ts] · :file[package.json]
::

## 5. The swap

The script copies the new `.output/` over the folder the server runs from, stops Node and starts it again from that copy. In the short gap while the new server starts, the site doesn't answer.

::stop-links
[The self-updating container](/t/glassbox/guide/deploy/self-updating-container) · :file[deploy/entrypoint.sh] · :file[docs/adr/0011-poc-self-updating-deploy-container.md]
::

## 6. The next visitor gets the new content

The restarted server serves the new build. The first query for each Collection compares its table's checksum with the build's and, where they differ, restores the table from the new dump. Each Tenant, Space and Collection still has a table of its own.

::stop-links
[The content database](/t/glassbox/guide/nuxt-content/content-database) · [One table per key: the isolation unit](/t/glassbox/guide/nuxt-content/one-table-per-key) · :file[docs/adr/0001-single-container-baked-multitenancy.md]
::

## Where next

- [The self-updating container](/t/glassbox/guide/deploy/self-updating-container)
- [The content database](/t/glassbox/guide/nuxt-content/content-database)
- [The Gate](/t/glassbox/guide/terrarium-practice/gate)
- [Opening a page](/t/glassbox/guide/walkthroughs/opening-a-page)
- [Architecture & Deployment](/t/journal/current/architecture)
