---
title: From file to browser
description: How a Markdown file in a Tenant folder becomes a table, a dump, a rendered page and a payload the browser reuses.
revision: '6b91957069a4e77c04c7b86a2b7fdbbd07411dc5'
revisionDate: '2026-10-25'
---

A Markdown file is committed, and later a visitor reads it as a page. This Walkthrough follows one file from its folder to the visitor's screen: through the manifest that names its table, the build that packs the table into a dump, the server that loads the dump and renders the page, and the payload the browser reuses on the next click. Only on a route the server doesn't cache does the browser load the dump into a database of its own.

```mermaid
flowchart TD
  file["A Markdown file<br>in a Space's folder"] --> key["The manifest's key<br>names its table"]
  key --> build["The build packs<br>each table's dump"]
  build --> dump[("The dumps,<br>inside the build")]
  dump -- "first query" --> sdb[("The server's<br>SQLite")]
  dump -. "uncached route" .-> bdb[("The browser's<br>SQLite")]
  sdb --> server["The server<br>renders a page"]
  server -- "HTML, payload" --> browser["The browser"]
  bdb -.-> browser
  classDef repo stroke-dasharray:5 4
  classDef reader stroke-width:2.5px
  class file,key,build repo
  class browser reader
```

## 1. A file lands in a Space's folder

A :term[Document] starts as a Markdown or YAML file in its Tenant's folder under `layers/`, at `content/<space>/<collection>/`, merged to `main` like any other change. The folders name its :term[Tenant], its :term[Space] and its :term[Collection]; nothing else says where it belongs.

::stop-links
[Content collections](/t/glassbox/guide/nuxt-content/manifest-collections) · :file[layers/glassbox/content/]
::

## 2. The manifest names its table

The Tenant's :term[manifest] lists its Spaces and Collections. Each time Nuxt Content loads `content.config.ts`, `expand()` turns every manifest into one collection per Tenant, Space and Collection, each pointed at its own folder and named by a key such as `blog_david_pages`. That key is the name of the file's table.

::stop-links
[Content collections](/t/glassbox/guide/nuxt-content/manifest-collections) · [Multi-tenant isolation](/t/glassbox/guide/nuxt-content/multi-tenant-isolation)
::

## 3. The build parses it into SQLite and a dump

`pnpm build` runs `nuxt build`, and Nuxt Content parses every file a collection matches. It inserts each Collection's rows into a table of its own in an SQLite database, and packs each table's SQL dump into the server it builds. The build writes no HTML: every page is rendered when someone asks for it. [A change goes live](/t/glassbox/guide/walkthroughs/a-change-goes-live) follows that build onto the live server.

::stop-links
[Content database](/t/glassbox/guide/nuxt-content/content-database) · [Content validation](/t/glassbox/guide/verification/content-validation)
::

## 4. A request renders it, or the cache answers

A Caddy proxy passes the visitor's request to :term[Nitro], Nuxt's server, which first checks its page cache: a copy rendered moments ago goes back as it is. On a miss, Nuxt picks the page file that matches the address, and its `useSpace` turns the address into the keys of one Space's Collections, or a 404. The page's `useAsyncData` then calls `queryCollection` with its key, on the server.

::stop-links
[Nitro server engine](/t/glassbox/guide/nuxt-vue/nitro) · [Data fetching](/t/glassbox/guide/nuxt-vue/use-async-data) · [File routing](/t/glassbox/guide/nuxt-vue/file-routing) · [Multi-tenant isolation](/t/glassbox/guide/nuxt-content/multi-tenant-isolation)
::

## 5. The first query restores the table from the dump

The first query for a Collection since the server started compares the checksum stored with its table to the build's. Where they differ, Nuxt Content runs that Collection's dump into the server's SQLite database before it answers; where they match, it answers from the table as it is. Either way the query reads only its key's table.

::stop-links
[Content database](/t/glassbox/guide/nuxt-content/content-database) · [Multi-tenant isolation](/t/glassbox/guide/nuxt-content/multi-tenant-isolation)
::

## 6. The browser hydrates, then navigates by payload

Vue renders the page to HTML with the `useAsyncData` result inside, and the browser shows it, then takes the page over without fetching that data again. When the pointer rests on a link, a finger touches it or the keyboard focuses it, the browser fetches that route's code and its `_payload.json`, and the click builds the next page from them with no query. A route the server doesn't cache has no payload: its query runs in an SQLite database in the browser, which first downloads a WebAssembly runtime and the Collection's dump.

::stop-links
[Data fetching](/t/glassbox/guide/nuxt-vue/use-async-data) · [Content database](/t/glassbox/guide/nuxt-content/content-database)
::

## Where next

- [Content collections](/t/glassbox/guide/nuxt-content/manifest-collections)
- [Content database](/t/glassbox/guide/nuxt-content/content-database)
- [Data fetching](/t/glassbox/guide/nuxt-vue/use-async-data)
- [Continuous deployment](/t/glassbox/guide/deploy/self-updating-container)
- [A change goes live](/t/glassbox/guide/walkthroughs/a-change-goes-live)
