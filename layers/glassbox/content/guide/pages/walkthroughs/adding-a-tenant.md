---
title: Adding a Tenant
description: How a new site joins Terrarium, from the approval to its first page, through one folder, one manifest, tables of its own and tests that find it by themselves.
revision: '8fecf8b4e1b32da82557e42f42b2045bd12a05bb'
revisionDate: '2026-10-15'
---

A new site joins Terrarium. This Walkthrough follows the work from the side of the agent that builds it: from the approval, through one new folder and the manifest inside it, to the site answering at its own address with the Gate checking it. Outside that folder, it must change only two glossary files.

## 1. Someone approves it

A new :term[Tenant] is new work, so an agent starts one only after a :term[Trusted] user approves it, for example by asking for it in a session or by labelling its issue `ready-for-agent`. The agent then works on a feature branch, and the result lands as a PR like any other change.

::stop-links
[Every change as a PR](/t/glassbox/guide/git-github/every-change-a-pr) · [Issues as the work queue](/t/glassbox/guide/git-github/work-queue) · :file[docs/adr/0003-agent-operating-model-and-governance.md]
::

## 2. A folder becomes a layer

The agent creates `layers/<tenant>/` and puts a `nuxt.config.ts` in it, which may hold no more than `defineNuxtConfig({})`. Nuxt registers every folder under `layers/` by itself, so the root config is left alone. From now on the folder is also read as a Tenant: the build stops if it holds no `tenant.config.ts`, or one whose name differs from the folder's. `pnpm lint` reads a config that Nuxt generates in `.nuxt/`, so the agent runs `nuxt prepare` before it.

::stop-links
[One app, many sites: Nuxt layers](/t/glassbox/guide/nuxt-vue/layers) · :file[.claude/rules/tenant-layers.md] · :file[layers/marquee/nuxt.config.ts] · :file[docs/adr/0018-tenant-layers-under-layers-directory.md]
::

## 3. The manifest says what it holds

Beside it goes the :term[manifest], `tenant.config.ts`: the Tenant's name, its :term[Spaces]{id="space"}, and the :term[Collections]{id="collection"} that every Space holds, each of type `page` or `data`. Marquee's is about as small as one gets, with one Space, `reel`, and one Collection, `pages`, the only name that gets addresses. Before anything is built from it, `validateManifest()` checks it, and a misspelt key or a Collection the rules don't allow stops the build with a line that names the field.

::stop-links
[Collections expanded from one manifest](/t/glassbox/guide/nuxt-content/manifest-collections) · [Validating the manifest itself](/t/glassbox/guide/zod/manifest-validation) · :file[layers/marquee/tenant.config.ts] · :file[shared/manifest.ts]
::

## 4. Its content gets tables of its own

The Tenant's files go under `content/<space>/<collection>/` in its folder, and each Space's `pages` folder gets an `index.md`, the Space's front page. Nobody lists the new collections anywhere: `content.config.ts` runs `expand()` over every manifest each time Nuxt Content loads it, and the new Spaces and Collections come out as keys such as `marquee_reel_pages`. Each key is its own table in the content database, so the new content shares no table with any other Space.

::stop-links
[Collections expanded from one manifest](/t/glassbox/guide/nuxt-content/manifest-collections) · [One table per key: the isolation unit](/t/glassbox/guide/nuxt-content/one-table-per-key) · :file[content.config.ts] · :file[shared/expand.ts]
::

## 5. The routes follow

The same expansion feeds :file[modules/routing.ts], which writes the routing map into `#routing` each time Nuxt starts or builds. Once the map holds the new Tenant, the Platform's catch-all page answers `/t/<tenant>/<space>/…` for it with no page file of its own: each Space's front page and every Document, plainly styled. A dev server started before the folder existed doesn't watch its manifest, so it needs a restart. The bare `/t/<tenant>` answers only once the Tenant adds a root page; Marquee's sends the visitor on to `reel`.

::stop-links
[A module that generates virtual # imports](/t/glassbox/guide/nuxt-vue/virtual-imports) · [File routing: catch-all, Tenant overrides, root pages](/t/glassbox/guide/nuxt-vue/file-routing) · :file[app/pages/t/] · :file[layers/marquee/app/pages/t/marquee/index.vue]
::

## 6. It gets its own look

For a design of its own, the Tenant adds pages under `app/pages/t/<tenant>/` in its layer. Their first segment is the Tenant's fixed name, so they outrank the catch-all for its addresses and no others. Its components go in a folder named after it, so Nuxt gives them its name as a prefix, as in `MarqueePoster`. Its stylesheet, listed in its `nuxt.config.ts`, loads on every page of every Tenant, so it prefixes its CSS custom properties with its own name and scopes its rules under a class only its pages carry. Its components read those properties with `var()`, so none of them repeats a colour.

::stop-links
[File routing: catch-all, Tenant overrides, root pages](/t/glassbox/guide/nuxt-vue/file-routing) · [Auto-imports and their one global namespace](/t/glassbox/guide/nuxt-vue/auto-imports) · [Theming with CSS custom properties on a wrapper class](/t/glassbox/guide/nuxt-vue/theming-wrapper-class) · :file[docs/agents/tenant-layers.md] · :file[layers/marquee/app/assets/theme.css]
::

## 7. It gets its own words

The Tenant's terms, why it exists and its product decisions go in a `GLOSSARY.md` in its folder. The root `GLOSSARY.md` gets one line in its list of Tenants, and `GLOSSARY-MAP.md` one entry: the only files outside the folder that a new Tenant must change.

::stop-links
[Several glossaries](/t/glassbox/guide/terrarium-practice/glossaries) · :file[GLOSSARY-MAP.md] · :file[docs/adr/0021-multi-context-domain-docs.md]
::

## 8. The tests find it by themselves

No test config names the new Tenant. The smoke test reads its entry addresses from the manifests, so it loads each new Space's front page in a browser, and fails on a console error or a front page with no Document. `pnpm typecheck` covers the new manifest through the one glob for `layers/*/tenant.config.*` in `nuxt.config.ts`. What only this Tenant has, such as its root page's redirect, goes in its own e2e spec under `tests/e2e/` in its folder, which the e2e project's glob picks up. The :term[Gate] runs them all.

::stop-links
[Unit and e2e tests: each Tenant tests itself](/t/glassbox/guide/testing/unit-and-e2e) · [Two type-check programs](/t/glassbox/guide/typescript/two-type-checks) · [The Gate](/t/glassbox/guide/terrarium-practice/gate) · :file[tests/e2e/smoke.spec.ts] · :file[layers/marquee/tests/e2e/marquee.spec.ts]
::

## 9. Who else can see it

Its pages appear in the Commons Search only if its `pages` Collection names the `page` :term[kind]{id="collection-kind"}, as Marquee's does. The Platform home page lists no new Tenant by itself: it is a hand-picked showcase, and a Tenant joins it when someone adds its tile to :file[app/pages/index.vue].

::stop-links
[Reading across Tenants through opted-in kinds](/t/glassbox/guide/terrarium-practice/cross-tenant-kinds) · :file[layers/commons/tenant.config.ts] · :file[docs/adr/0025-cross-tenant-catalog-and-collection-kinds.md]
::

## Where next

- [Collections expanded from one manifest](/t/glassbox/guide/nuxt-content/manifest-collections)
- [One app, many sites: Nuxt layers](/t/glassbox/guide/nuxt-vue/layers)
- [File routing: catch-all, Tenant overrides, root pages](/t/glassbox/guide/nuxt-vue/file-routing)
- [Reading across Tenants](/t/glassbox/guide/walkthroughs/reading-across-tenants)
- [Opening a page](/t/glassbox/guide/walkthroughs/opening-a-page)
