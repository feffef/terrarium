// Build-time virtual routing module (ADR-0014). Derives the runtime routing map
// and the L2 entry-route list from the same expand(loadManifests()) used by
// content.config.ts — so a manifest edit is picked up with no regenerate step
// for anything. Supersedes scripts/generate.ts + shared/routing.generated.ts.
import { addTemplate, addTypeTemplate, defineNuxtModule } from '@nuxt/kit'
import { entryRoutesFrom, expand, loadManifests, type ExpandedCollection } from '../shared/expand'

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

    const entryRoutes = entryRoutesFrom(cols)

    // One JSON literal serves as BOTH the runtime data (routing.mjs) and the
    // precise declared type (routing.d.ts): every leaf is a string literal, so
    // the stringified map is itself a valid TS type literal.
    const mapJson = JSON.stringify(map, null, 2)

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
          `export const routingMap = ${mapJson}`,
          '',
          `export const entryRoutes = ${JSON.stringify(entryRoutes, null, 2)}`,
          '',
        ].join('\n'),
    })

    // Type declarations (.d.ts) — `addTypeTemplate` is the idiomatic Kit API for a
    // companion type file (#211): it writes the .d.ts (auto-setting write:true) AND
    // self-registers it in Nuxt's generated type references (via the `prepare:types`
    // hook), so the app-side wiring needs no hand-paired reference. The separate
    // `tsconfig.node.json` `paths['#routing']` mapping still stands on its own — that
    // `tsc -p tsconfig.node.json` pass runs outside Nuxt's generated references
    // (ADR-0014, wiring #3).
    // `routingMap` is declared with its precise literal type — the same `mapJson`
    // string the runtime data is written from, so type and data cannot diverge and
    // the key scheme stays single-homed in `collectionKey()` (shared/manifest.ts).
    // shared/routing.ts derives per-Tenant key unions from this type, which is what
    // lets every `Extract<keyof Collections, …>` cast at the call sites go (#96).
    // Churn is a non-issue: the file is generated into .nuxt/ and never committed.
    addTypeTemplate({
      filename: 'routing.d.ts',
      getContents: () =>
        [
          `export declare const routingMap: ${mapJson}`,
          'export declare const entryRoutes: string[]',
          '',
        ].join('\n'),
    })

    // Register #routing so shared/routing.ts (and any call site) can import it as
    // a plain static import, keeping the isolation-critical resolver context-free.
    nuxt.options.alias['#routing'] = template.dst
  },
})
