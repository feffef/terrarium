---
title: Adding a Tenant
description: 'How a new site joins Terrarium: one folder, one manifest, tables of its own and tests that find it by themselves.'
revision: 'c76af481cc56b5811586c6115bd961e9c428b117'
revisionDate: '2026-10-22'
---

A new site joins Terrarium. This Walkthrough follows the work from the side of the agent that builds it: from the approval, through one new folder and the manifest inside it, to the site answering at its own address with the Gate checking it. [Marquee](/t/marquee/reel), a small movie-blog Tenant, is the example throughout. Outside that folder, it must change only two glossary files.

## 1. Someone approves it

A :term[Trusted] user approves the new :term[Tenant], for example by asking for it in a session or by labelling its issue `ready-for-agent`, before an agent starts on it. The agent then works on a feature branch, and the result lands as a PR like any other change.

::stop-links
[Every change a PR](/t/glassbox/guide/git-github/every-change-a-pr)
::

## 2. A folder becomes a layer

The agent creates `layers/<tenant>/` and puts a `nuxt.config.ts` in it, which can be as small as `defineNuxtConfig({})`. Nuxt registers every folder under `layers/` by itself, so the root config is left alone. From now on the folder is also read as a Tenant: the build stops if it holds no `tenant.config.ts`, or one whose name differs from the folder's.

::stop-links
[Layers](/t/glassbox/guide/nuxt-vue/layers) · :file[layers/marquee/nuxt.config.ts]
::

## 3. The manifest says what it holds

Beside it goes the :term[manifest], `tenant.config.ts`: the Tenant's name, its :term[Spaces]{id="space"}, and the :term[Collections]{id="collection"} that every Space holds, each of type `page` or `data`. Marquee's is about as small as one gets, with one Space, `reel`, and one Collection, `pages`, the only name that gets addresses. Before anything is built from it, `validateManifest()` checks it, and a misspelt key or a Collection the rules don't allow stops the build with a line that names the field.

::stop-links
[Manifest collections](/t/glassbox/guide/nuxt-content/manifest-collections) · :file[layers/marquee/tenant.config.ts]
::

## 4. Its content gets tables of its own

The Tenant's files go under `content/<space>/<collection>/` in its folder, and each Space's `pages` folder gets an `index.md`, the Space's front page. Nobody lists the new collections anywhere: `content.config.ts` runs `expand()` over every manifest each time Nuxt Content loads it, and the new Spaces and Collections come out as keys such as `marquee_reel_pages`. Each key is its own table in the content database, so the new content shares no table with any other Space.

::stop-links
[Manifest collections](/t/glassbox/guide/nuxt-content/manifest-collections) · [One table per key](/t/glassbox/guide/nuxt-content/one-table-per-key)
::

## 5. The routes follow

The same expansion feeds :file[modules/routing.ts], which writes the routing map into `#routing` each time Nuxt starts or builds. Once the map holds the new Tenant, the Platform's catch-all page answers `/t/<tenant>/<space>/…` for it with no page file of its own: each Space's front page and every Document, plainly styled. The bare `/t/<tenant>` answers only once the Tenant adds a root page; Marquee's sends the visitor on to `reel`.

::stop-links
[File routing](/t/glassbox/guide/nuxt-vue/file-routing) · :file[app/pages/t/] · :file[layers/marquee/app/pages/t/marquee/index.vue]
::

## 6. It gets its own look

For a design of its own, the Tenant adds pages under `app/pages/t/<tenant>/` in its layer. Their path has the Tenant's name where the catch-all has `[tenant]`, so they outrank it for its addresses and no others. Its components go in a folder named after it, so Nuxt gives them its name as a prefix, as in `MarqueePoster`. Its stylesheet, listed in its `nuxt.config.ts`, loads on every page of every Tenant, so it prefixes its CSS custom properties with a short tag of its own (`--mq-`) and scopes its rules under a class only its pages carry; its components read those properties with `var()`, so none of them repeats a colour.

::stop-links
[File routing](/t/glassbox/guide/nuxt-vue/file-routing) · :file[layers/marquee/app/assets/theme.css]
::

## 7. It gets its own words

It writes its own `GLOSSARY.md` for the words only it uses. Then it adds itself to the root list and `GLOSSARY-MAP.md`.

::stop-links
:file[layers/marquee/GLOSSARY.md]
::

## 8. The tests find it by themselves

No test config names the new Tenant. The smoke test reads its entry addresses from the manifests, so it loads each new Space's front page in a browser, and fails on a console error or a front page with no Document. What only this Tenant has, such as its root page's redirect, goes in its own e2e spec under `tests/e2e/` in its folder, which the e2e project's glob picks up. The :term[Gate] runs them all.

::stop-links
[The Gate](/t/glassbox/guide/terrarium-practice/gate) · :file[layers/marquee/tests/e2e/marquee.spec.ts]
::

## 9. Who else can see it

Its pages appear in the Commons Search only if its `pages` Collection names the `page` :term[kind]{id="collection-kind"}, as Marquee's does. The Platform home page lists no new Tenant by itself: it is a hand-picked showcase, and a Tenant joins it when someone adds its tile to :file[app/pages/index.vue].

::stop-links
:file[layers/marquee/tenant.config.ts] · :file[app/pages/index.vue]
::

## Where next

- [Manifest collections](/t/glassbox/guide/nuxt-content/manifest-collections)
- [Layers](/t/glassbox/guide/nuxt-vue/layers)
- [File routing](/t/glassbox/guide/nuxt-vue/file-routing)
- [From file to browser](/t/glassbox/guide/walkthroughs/from-file-to-browser)
