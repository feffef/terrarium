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
        }
        // Branch on `def.type` (rather than spreading `def` in) so TS narrows
        // `def.schema` per-variant and the pushed object matches the matching
        // half of the `ExpandedCollection` discriminated union.
        out.push(
          def.type === 'page'
            ? { ...base, type: 'page', schema: def.schema }
            : { ...base, type: 'data', schema: def.schema },
        )
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
