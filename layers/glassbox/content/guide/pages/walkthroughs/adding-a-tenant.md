---
title: Adding a site
description: 'How a new site joins Terrarium: one folder, one manifest, tables of its own and tests that find it by themselves.'
revision: 'ad9cea61188090fc6062574652f68385bc4b94d6'
revisionDate: '2026-10-28'
publishedAt: '2026-10-27T18:52:48Z'
---

A new site joins Terrarium. This Walkthrough follows the work from the side of the agent that builds it: from the approval, through one new folder and the manifest inside it, to the site answering at its own address with the Gate checking it. [Marquee](/t/marquee/reel), a small movie-blog Tenant, is the example throughout. Outside that folder, it needs to change only one file: `GLOSSARY-MAP.md`.

## 1. Someone approves it

A :term[Trusted] user approves the new :term[Tenant] before an agent starts on it, by asking for it in a session or by labelling its issue `ready-for-agent`. One other route exists: while the owner runs the guest pipeline, a :term[Public] guest's confirmation on their own issue is the approval, and the owner merges the result. Either way the agent works on a feature branch, and the result lands as a PR like any other change.

::stop-links
[Human-in-the-loop agents](/t/glassbox/guide/terrarium-practice/human-in-the-loop) · [Author trust](/t/glassbox/guide/git-github/trust-tiers) · [Pull requests](/t/glassbox/guide/git-github/every-change-a-pr)
::

## 2. A folder becomes a layer

The agent creates `layers/<tenant>/` and puts a `nuxt.config.ts` in it, which can be as small as `defineNuxtConfig({})`. Nuxt registers every folder under `layers/` by itself; the root config stays as it is. A running dev server doesn't watch a brand-new layer folder and needs a restart. From now on the folder is also read as a Tenant: the build stops if it holds no `tenant.config.ts`, or one whose name differs from the folder's.

::stop-links
[Nuxt layers](/t/glassbox/guide/nuxt-vue/layers) · :file[layers/marquee/nuxt.config.ts]
::

## 3. The manifest says what it holds

Beside it goes the :term[manifest], `tenant.config.ts`: the Tenant's name, its :term[Spaces]{id="space"}, and the :term[Collections]{id="collection"} that every Space holds, each of type `page` or `data`. Marquee's is about as small as one gets, with one Space, `reel`, and one Collection, `pages`, the only name that gets addresses. Before anything is built from it, `validateManifest()` checks it, and a misspelt key or a Collection the rules don't allow stops the build with a line that names the field.

::stop-links
[Content collections](/t/glassbox/guide/nuxt-content/manifest-collections) · [Schema validation](/t/glassbox/guide/zod/schema-validation) · :file[layers/marquee/tenant.config.ts]
::

## 4. Its content gets tables of its own

The Tenant's files go under `content/<space>/<collection>/` in its folder, and each Space's `pages` folder gets an `index.md`, the Space's front page. Nobody lists the new collections anywhere: `content.config.ts` runs `expand()` over every manifest each time Nuxt Content loads it, and the new Spaces and Collections come out as keys such as `marquee_reel_pages`. Each key is its own table in the content database, so the new content shares no table with any other Space.

::stop-links
[Content collections](/t/glassbox/guide/nuxt-content/manifest-collections) · [Multi-tenant isolation](/t/glassbox/guide/nuxt-content/multi-tenant-isolation)
::

## 5. The routes follow

The same expansion feeds :file[modules/routing.ts], which writes the routing map into `#routing` each time Nuxt starts or builds. Once the map holds the new Tenant, the Platform's catch-all page answers `/t/<tenant>/<space>/…` for it with no page file of its own: each Space's front page and every Document, plainly styled. The bare `/t/<tenant>` answers only once the Tenant adds a root page; Marquee's sends the visitor on to `reel`.

::stop-links
[File routing](/t/glassbox/guide/nuxt-vue/file-routing) · :file[app/pages/t/] · :file[layers/marquee/app/pages/t/marquee/index.vue]
::

## 6. It gets its own look

For a design of its own, the Tenant adds pages under `app/pages/t/<tenant>/` in its layer; their path has the Tenant's name where the catch-all has `[tenant]`, and they outrank it for its addresses and no others. Its components sit in a folder named after it, which gives them its name as a prefix, as in `MarqueePoster`. Its stylesheet, listed in its `nuxt.config.ts`, loads on every page of every Tenant, and it keeps its rules under a class only its pages carry and its custom properties under a short tag of its own (`--mq-`).

::stop-links
[File routing](/t/glassbox/guide/nuxt-vue/file-routing) · [Nuxt layers](/t/glassbox/guide/nuxt-vue/layers) · [Vue components and hydration](/t/glassbox/guide/nuxt-vue/vue-components) · :file[layers/marquee/app/assets/theme.css]
::

## 7. It gets its own words

It writes its own `GLOSSARY.md` for the words only it uses. Then it adds itself to `GLOSSARY-MAP.md`.

::stop-links
:file[layers/marquee/GLOSSARY.md]
::

## 8. The tests find it by themselves

No test config names the new Tenant. The smoke test reads its entry addresses from the manifests, loads each new Space's front page in a browser, and fails on a console error or a front page with no Document; it never visits a Tenant's root. What only this Tenant has, such as its root page's redirect, goes in its own e2e spec under `tests/e2e/` in its folder, which the e2e project's glob picks up. The :term[Gate] runs them all.

::stop-links
[Testing](/t/glassbox/guide/verification/unit-and-e2e-tests) · [Merge gate](/t/glassbox/guide/verification/gate) · :file[layers/marquee/tests/e2e/marquee.spec.ts]
::

## 9. Who else can see it

Its pages appear in the Commons Search only if its `pages` Collection names the `page` :term[kind]{id="collection-kind"}, as Marquee's does, and on the Commons Timeline only those of them that carry a `publishedAt`. The Platform home page lists no new Tenant by itself: it is a hand-picked showcase, and a Tenant joins it when someone adds its tile to :file[app/pages/index.vue].

::stop-links
[Cross-tenant reads](/t/glassbox/guide/terrarium-practice/cross-tenant-reads) · :file[layers/marquee/tenant.config.ts]
::

## A real case

On 17 July 2026 a Public user filed [issue #551](https://github.com/feffef/terrarium/issues/551) at 07:42 UTC, asking for a blog of the Marvel movies in chronological order with a Ghibli-style image per post. Five minutes later an agent running the guest pipeline asked four questions (which films, which order, how many to start with, and whether original illustrations would do) and labelled the issue `needs-info`. The guest answered at 08:11 and confirmed the agent's summary at 08:14, and the label flipped to `ready-for-agent`. [PR #552](https://github.com/feffef/terrarium/pull/552) opened at 08:41 with 18 files: everything under `layers/marquee/`, with no root page yet, a roster entry in each of the two root glossary files of the time, and two lines in the shared smoke spec that registered its browser tests; today the e2e project's glob finds a layer's own spec instead. The owner merged it at 08:49, as the guest pipeline requires, 67 minutes after the issue was filed.

## Where next

- [Content collections](/t/glassbox/guide/nuxt-content/manifest-collections)
- [Nuxt layers](/t/glassbox/guide/nuxt-vue/layers)
- [File routing](/t/glassbox/guide/nuxt-vue/file-routing)
- [Human-in-the-loop agents](/t/glassbox/guide/terrarium-practice/human-in-the-loop)
- [From file to browser](/t/glassbox/guide/walkthroughs/from-file-to-browser)
