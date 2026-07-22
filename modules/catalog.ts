// Build-time virtual catalog module (ADR-0025). Sibling to modules/routing.ts —
// it reuses the SAME `expand(loadManifests())` (shared/expand.ts) that builds the
// keyed collections and the routing map, so a manifest edit that adds or removes a
// collection's `kind` is picked up with no regenerate step.
//
// It derives the cross-Tenant catalog — every collection that opted into a `kind`,
// grouped by kind — and exposes it as the `#catalog` virtual module, importable as
// a plain static import (no Nuxt composable needed). This is the derived,
// build-time read primitive the honest aggregator (the Commons Tenant) reads,
// instead of the dollhouse's hardcoded `TENANTS`/`ROOM_*` arrays: a new Tenant
// with a `kind`-tagged collection appears automatically; a removed one drops.
//
// Human-only to merge (ADR-0004): this joins content.config.ts / shared/expand.ts
// / modules/routing.ts in the isolation-critical family. It is read-only by
// construction — it names collection keys, never writes — so write isolation
// (ADR-0020) is untouched.
import { join } from 'node:path'
import { addTemplate, addTypeTemplate, defineNuxtModule } from '@nuxt/kit'
import { catalogFrom, expand, loadManifests, root, type ExpandedCollection } from '../shared/expand'

export default defineNuxtModule({
  meta: { name: 'terrarium:catalog' },

  setup(_options, nuxt) {
    const manifests = loadManifests()
    const cols: ExpandedCollection[] = expand(manifests)
    const catalog = catalogFrom(cols)
    const catalogJson = JSON.stringify(catalog, null, 2)

    // Plain JavaScript (.mjs) so Nitro's Rollup bundler parses it with no TS
    // plugin (same reasoning as modules/routing.ts). `catalogByKind` is a real
    // function here — a `[]` default keeps a query for an unknown/empty kind safe.
    const template = addTemplate({
      filename: 'catalog.mjs',
      write: true,
      getContents: () =>
        [
          '// Build-time cross-Tenant catalog (ADR-0025). Written to .nuxt/ at prepare/build',
          '// time, derived from tenant manifests via expand()/catalogFrom(). Do not edit —',
          "// change the manifests (add or remove a collection's `kind`).",
          '',
          `export const catalog = ${catalogJson}`,
          '',
          'export function catalogByKind(kind) {',
          '  return catalog[kind] ?? []',
          '}',
          '',
        ].join('\n'),
    })

    // Companion .d.ts — `addTypeTemplate` writes it AND self-registers it into
    // Nuxt's generated type references (the app-side vue-tsc pass sees `#catalog`
    // with no hand-paired reference; #211). Kept self-contained (the CatalogEntry
    // shape redeclared, not imported) so the generated module has no cross-program
    // import — its editable home stays shared/expand.ts (CatalogEntry there).
    addTypeTemplate({
      filename: 'catalog.d.ts',
      getContents: () =>
        [
          'export interface CatalogEntry {',
          '  key: string',
          '  tenant: string',
          '  space: string',
          '  collection: string',
          '  kind: string',
          '}',
          'export declare const catalog: Record<string, CatalogEntry[]>',
          'export declare function catalogByKind(kind: string): CatalogEntry[]',
          '',
        ].join('\n'),
    })

    nuxt.options.alias['#catalog'] = template.dst

    // Dev-only (mirrors modules/routing.ts, issue #325): c12 doesn't watch these
    // imports, so a manifest `kind` edit needs a dev-server restart to re-derive
    // the catalog. Reuse Nuxt core's own `nuxt.options.watch` restart wiring.
    if (nuxt.options.dev) {
      nuxt.options.watch.push(
        ...manifests.map((m) => join(root, 'layers', m.dir, 'tenant.config.ts')),
        join(root, 'shared', 'expand.ts'),
        join(root, 'shared', 'kinds.ts'),
      )
    }
  },
})
