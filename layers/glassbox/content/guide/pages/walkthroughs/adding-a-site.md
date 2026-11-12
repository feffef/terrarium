---
title: Adding a site
description: "How an agent adds a site to Terrarium: one folder, a manifest, tables of its own, a glossary entry and tests that find it."
teaches: "Story: an agent adding a Tenant, Marquee as the example. Start: a Trusted user's or guest's approval. End: tests find it; Commons Search via kind 'page'; home page by hand. Code: nuxt.config.ts, tenant.config.ts, validateManifest(), expand(), content.config.ts, modules/routing.ts (#routing), app/pages/t/, theme.css, GLOSSARY-MAP.md, marquee.spec.ts. A real case: issue #551 to PR #552, 67 minutes."
revision: '7ae232ae79144439d1b30cb974e9e14f7ae6163c'
revisionDate: '2026-11-12'
publishedAt: '2026-10-27T18:52:48Z'
---

A new site joins Terrarium. This Walkthrough follows the work from the side of the agent that builds it: from the approval, through one new folder and the manifest inside it, to the site answering at its own address with the gate checking it. [Marquee](/t/marquee/reel), a small movie-blog Tenant, is the example throughout. Outside that folder, the one file it must change is `GLOSSARY-MAP.md`; a tile on the home page is optional (stop 9).

## 1. Someone approves it

A :term[trusted] user approves the new :term[tenant] before an agent starts on it, by asking for it in a session or by labelling its issue `ready-for-agent`. One other route exists: while the owner runs the guest pipeline, a :term[public] guest's confirmation on their own issue is the approval, and the owner merges the result. Either way the agent works on a feature branch, and the result lands as a PR like any other change.

::lessons
[Human-in-the-loop agents](/t/glassbox/guide/terrarium-practice/human-in-the-loop) · [Author trust](/t/glassbox/guide/git-github/author-trust) · [Pull requests](/t/glassbox/guide/git-github/pull-requests) · [Outside contributions](/t/glassbox/guide/terrarium-practice/outside-contributions)
::

## 2. A folder becomes a layer

The agent creates `layers/<tenant>/` and puts a `nuxt.config.ts` in it, which can be as small as `defineNuxtConfig({})`. Nuxt registers every folder under `layers/` by itself; the root config stays as it is. A running dev server doesn't watch a brand-new layer folder and needs a restart. From now on the folder is also read as a tenant: the build stops if it holds no `tenant.config.ts`, or one whose name differs from the folder's.

::lessons
[Nuxt layers](/t/glassbox/guide/nuxt-vue/layers) · :file[layers/marquee/nuxt.config.ts]
::

## 3. The manifest says what it holds

Beside it goes the :term[manifest], `tenant.config.ts`: the tenant's name, its :term[spaces]{id="space"}, and the :term[collections]{id="collection"} that every space holds, each of type `page` or `data`. Marquee's is about as small as one gets, with one space, `reel`, and one collection, `pages`, the only name that gets addresses. Before anything is built from it, `validateManifest()` checks it, and a misspelt key or a collection the rules don't allow stops the build with a line that names the field.

::lessons
[Content collections](/t/glassbox/guide/nuxt-content/content-collections) · [Zod refinements](/t/glassbox/guide/verification/zod-refinements) · :file[layers/marquee/tenant.config.ts]
::

## 4. Its content gets tables of its own

The tenant's files go under `content/<space>/<collection>/` in its folder, and each space's `pages` folder gets an `index.md`, the space's front page. Nobody lists the new collections anywhere: `content.config.ts` runs `expand()` over every manifest each time Nuxt Content loads it, and the new spaces and collections come out as keys such as `marquee_reel_pages`. Each key is its own table in the content database, so the new content shares no table with any other space.

::lessons
[Content collections](/t/glassbox/guide/nuxt-content/content-collections) · [Multi-tenant isolation](/t/glassbox/guide/nuxt-content/multi-tenant-isolation)
::

## 5. The routes follow

The same expansion feeds :file[modules/routing.ts], which writes the routing map into `#routing` each time Nuxt starts or builds. Once the map holds the new tenant, the platform's catch-all page answers `/t/<tenant>/<space>/…` for it with no page file of its own: each space's front page and every document, plainly styled. The bare `/t/<tenant>` answers only once the tenant adds a root page; Marquee's sends the visitor on to `reel`.

::lessons
[File routing](/t/glassbox/guide/nuxt-vue/file-routing) · :file[app/pages/t/] · :file[layers/marquee/app/pages/t/marquee/index.vue]
::

## 6. It gets its own look

For a design of its own, the tenant adds pages under `app/pages/t/<tenant>/` in its layer, which outrank the platform's catch-all for its addresses only. Its components sit in a folder named after it, which prefixes their names, as in `MarqueePoster`. Its stylesheet, listed in its `nuxt.config.ts`, loads on every page of every tenant, so it keeps its rules under a class only its pages carry and its custom properties under a tag of its own (`--mq-`).

::lessons
[File routing](/t/glassbox/guide/nuxt-vue/file-routing) · [Nuxt layers](/t/glassbox/guide/nuxt-vue/layers) · [Vue components](/t/glassbox/guide/nuxt-vue/vue-components) · :file[layers/marquee/app/assets/theme.css]
::

## 7. It gets its own words

It writes its own `GLOSSARY.md` for the words only it uses. Then it adds itself to `GLOSSARY-MAP.md`.

::lessons
:file[layers/marquee/GLOSSARY.md]
::

## 8. The tests find it by themselves

No test config names the new tenant. The smoke test reads its entry addresses from the manifests, loads each new space's front page in a browser, and fails on a console error or a front page with no document; it never visits a tenant's root. What only this tenant has, such as its root page's redirect, goes in its own e2e spec under `tests/e2e/` in its folder, which the e2e project's glob picks up. The :term[gate] runs them all.

::lessons
[Testing](/t/glassbox/guide/verification/testing) · [Merge gate](/t/glassbox/guide/verification/gate) · :file[layers/marquee/tests/e2e/marquee.spec.ts]
::

## 9. Who else can see it

Its pages appear in the Commons Search only if its `pages` collection names the `page` :term[kind]{id="collection-kind"}, as Marquee's does, and on the Commons Timeline only those of them that carry a `publishedAt`. The platform home page lists no new tenant by itself: it is a hand-picked showcase, and a tenant joins it when someone adds its tile to :file[app/pages/index.vue].

::lessons
[Cross-tenant reads](/t/glassbox/guide/terrarium-practice/cross-tenant-reads) · :file[layers/marquee/tenant.config.ts]
::

## A real case

On 17 July 2026 a public user filed [issue #551](https://github.com/feffef/terrarium/issues/551) at 07:42 UTC, asking for a blog of the Marvel movies in chronological order with a Ghibli-style image per post. Five minutes later an agent running the guest pipeline asked four questions (which films, which order, how many to start with, and whether original illustrations would do) and labelled the issue `needs-info`. The guest answered at 08:11 and confirmed the agent's summary at 08:14, and the label flipped to `ready-for-agent`. [PR #552](https://github.com/feffef/terrarium/pull/552) opened at 08:41 with 18 files: everything under `layers/marquee/`, with no root page yet, a roster entry in each of the two root glossary files of the time, and two lines in the shared smoke spec that registered its browser tests; today the e2e project's glob finds a layer's own spec instead. The owner merged it at 08:49, as the guest pipeline requires, 67 minutes after the issue was filed.

## Where next

- [Content collections](/t/glassbox/guide/nuxt-content/content-collections)
- [Nuxt layers](/t/glassbox/guide/nuxt-vue/layers)
- [File routing](/t/glassbox/guide/nuxt-vue/file-routing)
- [Human-in-the-loop agents](/t/glassbox/guide/terrarium-practice/human-in-the-loop)
- [From file to browser](/t/glassbox/guide/walkthroughs/from-file-to-browser)
