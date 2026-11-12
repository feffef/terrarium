---
title: A change goes live
description: How a commit on main reaches visitors, through one container that notices it, builds it beside the live site and swaps only a good build.
teaches: "Story: a commit on main reaching visitors, from the container's side. Start: a merged PR or session log. End: the restarted server; a Collection's first query restores its table from the dump. Code: reset to origin/main, pnpm-lock.yaml hash, install, build to .output/, copy, restart; Gate result unread. A real case: issue #1701, deploy/entrypoint.sh skipped installs after a failed one; PR #1717."
revision: '145cc119d8d1064fab2dc6ef674cae9d60e3c7f2'
revisionDate: '2026-11-12'
publishedAt: '2026-10-27T18:52:18Z'
---

A commit lands on `main`, and with no one running a deploy, the live site changes. This Walkthrough follows that commit from the container's side: from noticing it, through the install and the build, to the restarted server that answers the next visitor.

```mermaid
flowchart TD
  main["A commit<br>lands on main"] --> notice["The container<br>notices it"]
  notice --> build["It builds beside<br>the live site"]
  build -- "build works" --> swap["It swaps the build<br>in and restarts"]
  build -. "build fails" .-> old["The old site<br>stays live"]
  swap --> visitor["The next visitor<br>sees the change"]
  classDef beside stroke-dasharray:5 4
  classDef live stroke-width:2.5px
  class notice,build beside
  class swap,visitor,old live
```

## 1. A commit lands on `main`

The commit is a merged PR, or a :term[session log], which lands without one. Both take the same road from here: a blog post, a session log and a code fix all go live through the same pull, build and restart.

::lessons
[Pull requests](/t/glassbox/guide/git-github/pull-requests) · [Session logs](/t/glassbox/guide/terrarium-practice/session-logs)
::

## 2. The container notices it

The script that runs the container fetches `main` again after each pause. When `origin/main` differs from its checkout, it resets the checkout to the new commit. It doesn't wait for CI: the Gate also runs on every push to `main`, but nothing in the container reads the result.

::lessons
[Continuous deployment](/t/glassbox/guide/deploy/continuous-deployment) · [Merge gate](/t/glassbox/guide/verification/gate) · :file[.github/workflows/gate.yml]
::

## 3. Packages, only when the lockfile changed

The script compares a hash of `pnpm-lock.yaml` with the hash it saved after its last good install. Only when they differ does it install packages again, from the lockfile exactly. If that install fails, the previous build stays live, and the next commit installs again.

::lessons
[pnpm and the lockfile](/t/glassbox/guide/deploy/pnpm-lockfile) · [Continuous deployment](/t/glassbox/guide/deploy/continuous-deployment)
::

## 4. The build runs beside the live site

The build runs in the checkout, beside the live server, which keeps answering. It writes `.output/`: a server that runs on its own, with the content inside. If the build fails, nothing is swapped, the old build stays live, and the next commit tries again.

::lessons
[Nitro server engine](/t/glassbox/guide/nuxt-vue/nitro) · [Continuous deployment](/t/glassbox/guide/deploy/continuous-deployment) · [Content database](/t/glassbox/guide/nuxt-content/content-database)
::

## 5. The swap restarts the server

The script copies the new `.output/` over the folder the server runs from, stops Node and starts it again from that copy. In the short gap while the new server starts, the site doesn't answer.

::lessons
[Continuous deployment](/t/glassbox/guide/deploy/continuous-deployment)
::

## 6. The next visitor gets the new content

The restarted server serves the new build. The first query for each Collection compares its table's checksum with the build's and, where they differ, restores the table from the new dump.

::lessons
[Content database](/t/glassbox/guide/nuxt-content/content-database)
::

## A real case

On 9 October 2026 an agent checking story 4 of the Terrarium overview's diagram against :file[deploy/entrypoint.sh] found a gap in the step stop 3 covers: the script moved its checkout to the new commit before installing, so after a failed install the next commit's lockfile hash already matched, the install was skipped, and the build ran on the old packages. It filed [issue #1701](https://github.com/feffef/terrarium/issues/1701); the case had not happened on the live server yet. [PR #1717](https://github.com/feffef/terrarium/pull/1717) made the script keep the hash of its last good install outside the checkout, leaving the script stop 3 describes. Its description said no test covers the script's behaviour, so a human had to merge it, and a Trusted user did at 05:53 UTC on 10 October.

## Where next

- [Continuous deployment](/t/glassbox/guide/deploy/continuous-deployment)
- [pnpm and the lockfile](/t/glassbox/guide/deploy/pnpm-lockfile)
- [Content database](/t/glassbox/guide/nuxt-content/content-database)
- [From file to browser](/t/glassbox/guide/walkthroughs/from-file-to-browser)
