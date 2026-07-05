// Build-time virtual routing module (ADR-0014). Derives the runtime routing map
// and the L2 entry-route list from the same expand(loadManifests()) used by
// content.config.ts — so a manifest edit is picked up with no regenerate step
// for anything. Supersedes scripts/generate.ts + shared/routing.generated.ts.
import { addTemplate, defineNuxtModule } from '@nuxt/kit'
import { expand, loadManifests, type ExpandedCollection } from '../shared/expand'

export default defineNuxtModule({
  meta: { name: 'terrarium:routing' },

  setup(_options, nuxt) {
    const cols: ExpandedCollection[] = expand(loadManifests())

    const map: Record<string, Record<string, Record<string, string>>> = {}
    for (const c of cols) {
      const spaces = (map[c.tenant] ??= {})
      const collections = (spaces[c.space] ??= {})
      collections[c.collection] = c.key
    }

    const entryRoutes = [
      ...new Set(cols.filter((c) => c.type === 'page').map((c) => `/t/${c.tenant}/${c.space}`)),
    ].sort()

    // Plain JavaScript (.mjs) so Nitro's Rollup bundler can parse it without a
    // TypeScript plugin. A companion .d.ts provides the types for tsc / vue-tsc.
    const template = addTemplate({
      filename: 'routing.mjs',
      write: true,
      getContents: () =>
        [
          '// Build-time routing data (ADR-0014). Written to .nuxt/ at prepare/build time.',
          '// Derived from tenant manifests via expand(). Do not edit — change the manifests.',
          '',
          `export const routingMap = ${JSON.stringify(map, null, 2)}`,
          '',
          `export const entryRoutes = ${JSON.stringify(entryRoutes, null, 2)}`,
          '',
        ].join('\n'),
    })

    // Type declarations (.d.ts) — addTemplate auto-sets write:true for .d.ts files.
    addTemplate({
      filename: 'routing.d.ts',
      getContents: () =>
        [
          'export declare const routingMap: ' + JSON.stringify(map),
          'export type TenantName = keyof typeof routingMap',
          'export declare const entryRoutes: string[]',
          '',
        ].join('\n'),
    })

    // Register #routing so shared/routing.ts (and any call site) can import it as
    // a plain static import, keeping the isolation-critical resolver context-free.
    nuxt.options.alias['#routing'] = template.dst
  },
})
