// Dynamic Nuxt Content config (ADR-0013). This is an ORDINARY module — NOT
// generated, hand-edit freely.
//
// It builds the keyed `tenant_space_collection` collections at config-evaluation
// time by enumerating every Tenant manifest and running the same pure `expand()`
// the routing module uses (shared/expand.ts). There is no regenerate step for
// anything: every `nuxt prepare`/`build`/dev-server-start re-derives the
// collections from scratch (docs/research/nuxt-content-review-grounding.md §12).
// That "no regenerate step" claim is about those fresh runs. Nuxt Content's c12
// config loader only watches `content.config.ts` itself, not this file's imports
// (docs/research/nuxt-content-review-grounding.md §12) — modules/routing.ts
// (ADR-0014, issue #325) covers the dev-server gap that leaves.
import { defineCollection, defineContentConfig } from '@nuxt/content'
import { fileURLToPath } from 'node:url'
import { expand, loadManifests } from './shared/expand'

// Absolute path to a (Tenant, Space, Collection) content dir, resolved from this file.
const dir = (p: string) => fileURLToPath(new URL('./' + p, import.meta.url))

export default defineContentConfig({
  collections: Object.fromEntries(
    expand(loadManifests()).map((c) => [
      c.key,
      // Branch on `c.type` per call (rather than one `defineCollection({ type:
      // c.type, ... })`) so TS narrows `c` to the matching half of the
      // `ExpandedCollection` union in each branch — @nuxt/content's own
      // `PageCollection`/`DataCollection` types are likewise discriminated on
      // `type`, with `DataCollection.schema` required rather than optional.
      c.type === 'page'
        ? defineCollection({
            type: 'page',
            source: { cwd: dir(c.cwdRel), include: c.include, prefix: '/' },
            schema: c.schema,
          })
        : defineCollection({
            type: 'data',
            source: { cwd: dir(c.cwdRel), include: c.include },
            schema: c.schema,
          }),
    ]),
  ),
})
