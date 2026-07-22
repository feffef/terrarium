// The manifest → keyed-collection expansion (ADR-0002), extracted so it can be
// evaluated in two places from one source of truth:
//  - `content.config.ts` builds the live Nuxt Content collections from it at
//    config-evaluation time (ADR-0013 — dynamic content config), and
//  - `modules/routing.ts` derives the runtime routing map at prepare/build time
//    and exposes it as the `#routing` virtual module (ADR-0014).
//
// The cross-product expansion is the mechanical, error-prone part, so it is code.
// `expand()` is a pure function exported for the L3 isolation test (ADR-0004).
import { readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'
import type { ZodObject, ZodRawShape } from 'zod'
import { collectionKey, validateManifest, type TenantManifest } from './manifest'
import { resolveKind, type KindName } from './kinds'

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// The Tenant manifests live one per layer under `layers/` (Nuxt's conventional
// layer directory — ADR-0018). This module only enumerates that directory; the
// auto-extend / typecheck-coverage consequences of the location are ADR-0018's.
const layersDir = join(root, 'layers')

export interface LoadedManifest {
  dir: string
  manifest: TenantManifest
}

interface ExpandedCollectionBase {
  key: string
  tenant: string
  space: string
  collection: string
  include: string
  /** Content dir for this (tenant, space, collection), relative to project root (posix). */
  cwdRel: string
  /** The cross-Tenant contract this collection opts into, or undefined (isolation
   *  default). Carried through so `catalogFrom()` and `modules/catalog.ts` need no
   *  second manifest pass (ADR-0025). */
  kind?: KindName
}

// Discriminated on `type` — mirrors `CollectionDef` (shared/manifest.ts) so the
// required-schema-for-`data` invariant survives the manifest → expansion step
// and reaches `content.config.ts` still statically checkable.
export type ExpandedCollection =
  | (ExpandedCollectionBase & {
      type: 'page'
      /** The Collection's Zod schema, carried through so consumers needn't re-import the manifest. */
      schema?: ZodObject<ZodRawShape>
    })
  | (ExpandedCollectionBase & {
      type: 'data'
      schema: ZodObject<ZodRawShape>
    })

/**
 * Synchronously load every Tenant manifest under `layers/`.
 *
 * Uses jiti — the same TypeScript loader Nuxt Content already uses to evaluate
 * `content.config.ts` — so the manifests (which carry live Zod schema objects)
 * can be imported *synchronously* at config-evaluation time, with no build step.
 * The loader is created lazily so merely importing this module (e.g. the L3 unit
 * test, which builds `LoadedManifest`s by hand) never constructs one.
 */
export function loadManifests(): LoadedManifest[] {
  const dirs = readdirSync(layersDir)
    .filter((d) => {
      try {
        return statSync(join(layersDir, d)).isDirectory()
      } catch {
        return false
      }
    })
    .sort()

  const load = createLoader()
  const loaded: LoadedManifest[] = []
  for (const dir of dirs) {
    const file = join(layersDir, dir, 'tenant.config.ts')
    const mod = load(file)
    const manifest: TenantManifest = mod.default ?? mod
    if (manifest?.name !== dir) {
      throw new Error(`tenant folder "${dir}" does not match manifest name "${manifest?.name}"`)
    }
    loaded.push({ dir, manifest })
  }
  return loaded
}

/** A synchronous TypeScript module loader (jiti). Created lazily so merely importing
 *  this module (e.g. the L3 unit test) never constructs one. jiti is the same loader
 *  Nuxt Content uses to evaluate `content.config.ts`, so nested use is safe. */
function createLoader(): (id: string) => TenantManifest & { default?: TenantManifest } {
  const jiti = createJiti(import.meta.url)
  return (id: string) => jiti(id) as TenantManifest & { default?: TenantManifest }
}

/** Resolve a `data` kind to its shared schema, or throw. Separated so the throw
 *  path (a kind carrying no schema — e.g. a `page` kind mis-referenced by a data
 *  collection) is explicit; validateManifest already rejects that type mismatch,
 *  so this is a defensive last line, not the primary check. */
function resolveKindSchema(kind: KindName): ZodObject<ZodRawShape> {
  const schema = resolveKind(kind).schema
  if (!schema) {
    throw new Error(`kind "${kind}" supplies no schema but is referenced by a data collection`)
  }
  return schema
}

/** Pure Tenant × Space × Collection expansion. Enforces the L3 key-uniqueness invariant. */
export function expand(manifests: LoadedManifest[]): ExpandedCollection[] {
  const out: ExpandedCollection[] = []
  for (const { manifest } of manifests) {
    const errs = validateManifest(manifest)
    if (errs.length) {
      throw new Error(`invalid manifest "${manifest.name}":\n- ${errs.join('\n- ')}`)
    }
    for (const space of manifest.spaces) {
      for (const [collection, def] of Object.entries(manifest.collections)) {
        const base = {
          key: collectionKey(manifest.name, space, collection),
          tenant: manifest.name,
          space,
          collection,
          include: def.source ?? '**',
          cwdRel: `layers/${manifest.name}/content/${space}/${collection}`,
          kind: def.kind,
        }
        // Branch on `def.type` (rather than spreading `def` in) so TS narrows
        // `def.schema` per-variant and the pushed object matches the matching
        // half of the `ExpandedCollection` discriminated union.
        if (def.type === 'page') {
          out.push({ ...base, type: 'page', schema: def.schema })
        } else {
          // A `data` collection's schema is either inline or supplied by its
          // `kind` (validateManifest guarantees exactly one). The kind's schema
          // is the single home for that shared shape (ADR-0025).
          const schema = def.schema ?? resolveKindSchema(def.kind)
          out.push({ ...base, type: 'data', schema })
        }
      }
    }
  }

  // ADR-0004 L3: collection keys must be globally unique and correctly scoped.
  const seen = new Set<string>()
  for (const c of out) {
    if (seen.has(c.key)) throw new Error(`duplicate collection key "${c.key}" — isolation violated`)
    seen.add(c.key)
  }
  return out
}

/**
 * Derive the L2 entry-route list from an expanded collection set.
 * Single-homed here so `modules/routing.ts` (build-time) and the L2 smoke
 * support (`tests/support/e2e.ts`, test-time) stay in sync automatically.
 */
export function entryRoutesFrom(cols: ExpandedCollection[]): string[] {
  return [
    ...new Set(cols.filter((c) => c.type === 'page').map((c) => `/t/${c.tenant}/${c.space}`)),
  ].sort()
}

/** One catalog-visible collection: its generated key plus provenance and the kind
 *  it opted into. The row shape `#catalog` (modules/catalog.ts) exposes and
 *  `queryAcrossTenants` (app/composables/catalog.ts) fans out over — read-only,
 *  no schema re-declared (ADR-0025). Redeclared verbatim in the generated
 *  `.nuxt/catalog.d.ts` so that virtual module stays self-contained (like
 *  routing.d.ts); this is its single editable home. */
export interface CatalogEntry {
  key: string
  tenant: string
  space: string
  collection: string
  kind: string
}

/**
 * Derive the cross-Tenant catalog from an expanded collection set: every
 * collection that opted into a `kind`, grouped by kind. Single-homed here — like
 * `entryRoutesFrom` — so `modules/catalog.ts` (build-time) and any test derive
 * it identically. A collection with no `kind` is skipped: isolation is the
 * default, catalog exposure is opt-in (ADR-0025). Insertion order is the
 * deterministic `expand()` order (manifests sorted, then declared space/collection
 * order), so the generated catalog is stable build-to-build.
 */
export function catalogFrom(cols: ExpandedCollection[]): Record<string, CatalogEntry[]> {
  const out: Record<string, CatalogEntry[]> = {}
  for (const c of cols) {
    if (!c.kind) continue
    ;(out[c.kind] ??= []).push({
      key: c.key,
      tenant: c.tenant,
      space: c.space,
      collection: c.collection,
      kind: c.kind,
    })
  }
  return out
}
