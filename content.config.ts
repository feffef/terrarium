// Dynamic Nuxt Content config (ADR-0013, supersedes the committed-codegen half of
// ADR-0007). This is an ORDINARY module — NOT generated, hand-edit freely.
//
// It builds the keyed `tenant_space_collection` collections at config-evaluation
// time by enumerating every Tenant manifest and running the same pure `expand()`
// the generator uses (shared/expand.ts). A manifest edit is therefore picked up by
// `nuxt dev`/`build`/`prepare` with no regenerate step. The routing map still needs
// to be committed for the runtime/client (shared/routing.generated.ts, produced by
// `pnpm gen`) — see ADR-0013.
import { defineCollection, defineContentConfig } from '@nuxt/content'
import { fileURLToPath } from 'node:url'
import { expand, loadManifests } from './shared/expand'

// Absolute path to a (Tenant, Space, Collection) content dir, resolved from this file.
const dir = (p: string) => fileURLToPath(new URL('./' + p, import.meta.url))

export default defineContentConfig({
  collections: Object.fromEntries(
    expand(loadManifests()).map((c) => [
      c.key,
      defineCollection({
        type: c.type,
        source:
          c.type === 'page'
            ? { cwd: dir(c.cwdRel), include: c.include, prefix: '/' }
            : { cwd: dir(c.cwdRel), include: c.include },
        schema: c.schema,
      }),
    ]),
  ),
})
