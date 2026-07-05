// The manifest → keyed-collection expansion (ADR-0002), extracted from the
// generator so it can be evaluated in two places from one source of truth:
//  - `content.config.ts` builds the live Nuxt Content collections from it at
//    config-evaluation time (ADR-0013 — dynamic content config), and
//  - `scripts/generate.ts` still emits the committed `shared/routing.generated.ts`.
//
// The cross-product expansion is the mechanical, error-prone part, so it is code.
// `expand()` is a pure function exported for the L3 isolation test (ADR-0004).
import { readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createJiti } from 'jiti'
import type { ZodObject, ZodRawShape } from 'zod'
import {
  collectionKey,
  validateManifest,
  type CollectionType,
  type TenantManifest,
} from './manifest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const tenantsDir = join(root, 'tenants')

export interface LoadedManifest {
  dir: string
  manifest: TenantManifest
}

export interface ExpandedCollection {
  key: string
  tenant: string
  space: string
  collection: string
  type: CollectionType
  include: string
  /** Content dir for this (tenant, space, collection), relative to project root (posix). */
  cwdRel: string
  /** The Collection's Zod schema, carried through so consumers needn't re-import the manifest. */
  schema?: ZodObject<ZodRawShape>
}

/**
 * Synchronously load every Tenant manifest under `tenants/`.
 *
 * Uses jiti — the same TypeScript loader Nuxt Content already uses to evaluate
 * `content.config.ts` — so the manifests (which carry live Zod schema objects)
 * can be imported *synchronously* at config-evaluation time, with no build step.
 * The loader is created lazily so merely importing this module (e.g. the L3 unit
 * test, which builds `LoadedManifest`s by hand) never constructs one.
 */
export function loadManifests(): LoadedManifest[] {
  const dirs = readdirSync(tenantsDir)
    .filter((d) => {
      try {
        return statSync(join(tenantsDir, d)).isDirectory()
      } catch {
        return false
      }
    })
    .sort()

  const load = createLoader()
  const loaded: LoadedManifest[] = []
  for (const dir of dirs) {
    const file = join(tenantsDir, dir, 'tenant.config.ts')
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
        out.push({
          key: collectionKey(manifest.name, space, collection),
          tenant: manifest.name,
          space,
          collection,
          type: def.type,
          include: def.source ?? '**',
          cwdRel: `tenants/${manifest.name}/content/${space}/${collection}`,
          schema: def.schema,
        })
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
