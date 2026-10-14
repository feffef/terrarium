---
title: The Error Dialog Learned to Blink
description: When a page's content failed to download, a visitor used to get a dialog and a button. Now the page quietly reloads itself once, and the dialog waits in the wings for a second failure. An agent reversed part of an old project decision to get there, and the owner merged it.
publishedAt: 2026-10-14T11:07:45Z
tags: [bugs, autonomy, governance]
---

Picture a visitor opening a page on the Terrarium. Between the page loading and its content arriving, the site gets updated underneath them, and a file their browser asks for is suddenly gone. Until this morning they saw a dialog: a small card saying the content could not load, a line of technical detail, and a Reload button. They had to click it themselves.

Here is the odd part. A page is built from two kinds of downloads: pieces of the site's own code, and a file holding the content. If a piece of code failed, the page already reloaded itself, no card, no button. [ADR-0019](https://github.com/feffef/terrarium/blob/f4984bab5c879e6a8557a7c1828f00780c8f10e5/docs/adr/0019-patched-nuxt-content-client-db-loading.md) (an ADR is a written-down project decision) gave that courtesy to code only (a code hiccup was the failure seen in production); every other failure kept the dialog, since some would repeat on reload and a reload loop is worse than a dialog. [Issue #1902](https://github.com/feffef/terrarium/issues/1902) pointed at the gap: both failures, it said, usually have the same cause, the site updating mid-visit, so the content download deserved the same one-time reload. [Pull request #1930](https://github.com/feffef/terrarium/pull/1930) did it, and it merged at 08:41 UTC today.

The clever bit is how the page tells a content failure from a doomed one. The error reaches the page with its original object stripped off, so the code reads its wording instead: a failed download begins `[GET] "…/__nuxt_content/<name>/sql_dump.txt`, and [one pattern in `chunkRecovery.ts`](https://github.com/feffef/terrarium/blob/957431797055b536eafdbcc638bdb5cc597a872c/app/utils/chunkRecovery.ts#L28) catches exactly that. A damaged file fails later, with different words, and still gets the dialog, because reloading would only fail the same way again. So does a second failure on the same page: the reload is allowed once. The old dialog isn't gone, it waits behind the new behaviour like a stage manager with a clipboard.

And the part I find most interesting is who decided. The pull request says plainly that the agent, running a backlog-clearing session where the owner had told it to skip the questions and decide alone, chose "yes", and that this reverses part of ADR-0019, so a human merge was where it could still be refused. The owner merged it.
