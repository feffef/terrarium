---
title: A change goes live
description: How a commit on main reaches visitors, through one container that notices it, builds it beside the live site and swaps only a good build.
revision: 'a93faa0135f652b85b4976418534243f649e58b9'
revisionDate: '2026-10-15'
---

A commit lands on `main`, and with no one running a deploy, the live site changes. This Walkthrough follows that commit from the container's side: from noticing it, through the install and the build, to the restarted server that answers the next visitor.

## 1. A commit lands on `main`

The commit is a merged PR, or a :term[session log], which lands without one. Both take the same road from here: a blog post, a session log and a code fix all go live through the same pull, build and restart.

::stop-links
[Every change a PR](/t/glassbox/guide/git-github/every-change-a-pr) · [Session logs](/t/glassbox/guide/terrarium-practice/session-logs)
::

## 2. The container notices it

The script that runs the container fetches `main` again after each pause. When `origin/main` differs from its checkout, it resets the checkout to the new commit. It doesn't wait for CI: the Gate also runs on every push to `main`, but nothing in the container reads the result.

::stop-links
[Self-updating container](/t/glassbox/guide/deploy/self-updating-container) · [The Gate](/t/glassbox/guide/terrarium-practice/gate) · :file[.github/workflows/gate.yml]
::

## 3. Packages, only when the lockfile changed

The script compares a hash of `pnpm-lock.yaml` with the hash it saved after its last good install. Only when they differ does it install packages again, from the lockfile exactly. If that install fails, the previous build stays live.

::stop-links
[Self-updating container](/t/glassbox/guide/deploy/self-updating-container) · :file[pnpm-lock.yaml]
::

## 4. The build runs beside the live site

The build runs in the checkout, beside the live server, which keeps answering. It writes `.output/`: a server that runs on its own, with each :term[Collection]'s content dump inside. If the build fails, nothing is swapped, and the old build stays live.

::stop-links
[The content database](/t/glassbox/guide/nuxt-content/content-database) · [Self-updating container](/t/glassbox/guide/deploy/self-updating-container) · :file[package.json]
::

## 5. The swap

The script copies the new `.output/` over the folder the server runs from, stops Node and starts it again from that copy. In the short gap while the new server starts, the site doesn't answer.

::stop-links
[Self-updating container](/t/glassbox/guide/deploy/self-updating-container)
::

## 6. The next visitor gets the new content

The restarted server serves the new build. The first query for each Collection compares its table's checksum with the build's and, where they differ, restores the table from the new dump.

::stop-links
[The content database](/t/glassbox/guide/nuxt-content/content-database)
::

## Where next

- [Self-updating container](/t/glassbox/guide/deploy/self-updating-container)
- [The content database](/t/glassbox/guide/nuxt-content/content-database)
- [The Gate](/t/glassbox/guide/terrarium-practice/gate)
- [From file to browser](/t/glassbox/guide/walkthroughs/from-file-to-browser)
- [Architecture & Deployment](/t/journal/current/architecture)
