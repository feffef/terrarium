---
title: Reading across tenants
description: How a Blog post becomes a Commons Search result, through a kind named in a manifest, a catalog built with the site and one read function.
revision: 'f2f883b07d61679095f2a03a06c53d8189db6136'
revisionDate: '2026-11-07'
publishedAt: '2026-11-04T23:07:44Z'
---

Terrarium keeps each Tenant's content in tables of its own, yet the Commons Search lists pages from several Tenants at once. This Walkthrough follows a Blog post from the side of the code that reads it: from one field in the Blog's manifest, through a list built with the site, to a result in the search box. It ends where the reading stops, at the Collections that never opted in.

## 1. A Collection opts in

The Blog's :term[manifest] gives its `pages` :term[Collection] one extra field, `kind: 'page'`. That field is the whole opt-in: a Collection with no `kind` stays off every list below. The :term[Collection kinds]{id="collection-kind"} and their contracts live in :file[shared/kinds.ts], and the manifest check refuses a kind that isn't there or one meant for the other Collection type.

::lessons
[Cross-tenant reads](/t/glassbox/guide/terrarium-practice/cross-tenant-reads) · [Zod refinements](/t/glassbox/guide/verification/zod-refinements) · :file[layers/blog/tenant.config.ts]
::

## 2. The contract joins the schema

When `expand()` builds the Blog's collections, it adds the `page` contract's fields to the Blog's own page schema, keeping any Blog field of the same name. The Blog's schema doesn't declare `publishedAt`; its posts get that field from the contract. `pnpm validate:content` checks every post against the combined schema, so a reader can rely on those fields' names and types.

::lessons
[Content collections](/t/glassbox/guide/nuxt-content/content-collections) · [Content validation](/t/glassbox/guide/verification/content-validation)
::

## 3. The build lists it in the Catalog

`catalogFrom()` walks the same expansion and lists every Collection that named a kind, grouped by kind. :file[modules/catalog.ts] writes that list into the `#catalog` module each time Nuxt starts or builds. So the :term[Catalog] holds one entry for each Blog Space's `pages`, beside the other Tenants' opted-in Collections, and no one keeps that list by hand.

::lessons
[Virtual modules](/t/glassbox/guide/nuxt-vue/virtual-modules) · [Cross-tenant reads](/t/glassbox/guide/terrarium-practice/cross-tenant-reads)
::

## 4. The Search asks for every page

A visitor opens `/t/commons/search`. The Commons layer's Space page renders its `CommonsSearch` component, which calls `queryPages()` inside `useAsyncData`. That calls `queryAcrossTenants('page', …)`: one `queryCollection` for each key the Catalog lists under `page`, each row cut down to the page fields and tagged with its Tenant, Space and Collection. `queryPages()` then gives each row its own address with `documentUrl()`.

::lessons
[queryCollection](/t/glassbox/guide/nuxt-content/query-collection) · [Cross-tenant reads](/t/glassbox/guide/terrarium-practice/cross-tenant-reads)
::

## 5. The browser filters the list

The server renders the first rows; the whole list travels in the page's data. Typing in the box filters that list in the browser, by title, description, Tenant and Space, with no new query. The filter and the sort order are code in the Commons layer, not in the shared read functions. A click on a result goes to the post's own address under `/t/blog/`, where the Blog's own pages render it.

::lessons
[Data fetching](/t/glassbox/guide/nuxt-vue/data-fetching) · [File routing](/t/glassbox/guide/nuxt-vue/file-routing) · :file[layers/commons/app/components/commons/Search.vue] · :file[layers/commons/app/pages/t/commons/]
::

## 6. Where the reading stops

The Commons's own `pages` name no kind, so its Search never lists itself. A Collection with no `kind`, such as the Blog's `pingbacks`, is on no list, though no test stops a layer that passes another Tenant's key to `queryCollection` directly. The one exception to the Catalog is the Platform home page, which reads the Tenants it features directly.

::lessons
[Multi-tenant isolation](/t/glassbox/guide/nuxt-content/multi-tenant-isolation) · :file[layers/commons/tenant.config.ts] · :file[app/pages/index.vue]
::

## Where next

- [Cross-tenant reads](/t/glassbox/guide/terrarium-practice/cross-tenant-reads)
- [queryCollection](/t/glassbox/guide/nuxt-content/query-collection)
- [Virtual modules](/t/glassbox/guide/nuxt-vue/virtual-modules)
- [Adding a site](/t/glassbox/guide/walkthroughs/adding-a-site)
- [From file to browser](/t/glassbox/guide/walkthroughs/from-file-to-browser)
