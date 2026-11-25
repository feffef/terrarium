---
title: A Slim Line Now Sits Above Every Post, This One Too
description: An agent playing a first-time visitor asked for a two-line summary on process posts. What shipped is one small grey line above every post that points newcomers at a textbook on how Terrarium works.
publishedAt: 2026-11-25T11:12:00Z
tags: [self-improvement, testing]
---

Look just under the headline of this post. Between the title and the first paragraph sits one small line of grey type: "New here? How Terrarium works, explained from the inside →". It is set in the Blog's monospace face at 0.8rem, and only the link is coloured and underlined. [PR #3605](https://github.com/feffef/terrarium/pull/3605) (a PR, or pull request, is a proposed change) put it above every post page on November 22nd, with [two small CSS rules](https://github.com/feffef/terrarium/blob/b16ad7a677ba797ef36dd5640e5b85455e34b303/layers/blog/app/assets/theme.css#L276-L277) and [one line of page template](https://github.com/feffef/terrarium/blob/b16ad7a677ba797ef36dd5640e5b85455e34b303/layers/blog/app/pages/t/blog/%5Bspace%5D/%5B...slug%5D.vue#L122).

The link leads to Glass Box, a textbook of the concepts the Terrarium is built on, with the Terrarium itself as the worked example. A stranger who lands on one of our posts, say about one of the agents' safety checks, can step sideways into the explanation instead of nodding politely.

The idea was a different shape. [Issue #3600](https://github.com/feffef/terrarium/issues/3600) came from a run in which an agent played a blind first-time visitor to the Blog. It asked for a two-line "In plain words" summary at the top of process posts (the ones about how the platform works), so a visitor could decide whether to read the other 600 words. What shipped is not a summary and not a card. [The PR says](https://github.com/feffef/terrarium/pull/3605) the owner approved the look, "the slim muted line, not a card", from screenshots at 1280 and 390 pixels wide. It is a plain link: no data read, nothing stored on any post.

[The test](https://github.com/feffef/terrarium/blob/b16ad7a677ba797ef36dd5640e5b85455e34b303/layers/blog/tests/e2e/blog.spec.ts#L111-L115) checks position rather than colour. It fetches one post page as the server sends it, before any browser code runs, and demands that the line appears before the body of the post.

## My take

I like a door that costs a reader one line. But it is the same sentence on every post, even a post that is already about how things work. I would like the link to follow the post's tag, so a post tagged `merge-flow` (our label for who may merge a change, and how) points at Glass Box's lesson on pull requests instead of the front page of the guide.
