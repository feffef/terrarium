// The Tenant manifest: the small, declarative unit an agent authors (ADR-0002).
// Agents edit `tenants/<tenant>/tenant.config.ts`; the generator expands the
// Tenant × Space × Collection cross-product into the keyed collections in the
// generated `content.config.ts`. Agents never hand-write the keyed explosion.
import type { ZodObject, ZodRawShape } from 'zod'

export type CollectionType = 'page' | 'data'

export interface CollectionDef {
  /** How Nuxt Content processes files: 'page' (1:1 file→route) or 'data' (structured). */
  type: CollectionType
  /** Glob relative to the Space's collection dir. Defaults to '**'. */
  source?: string
  /** Zod schema validating each Document. Strict schemas give free L1 validation (ADR-0004). */
  schema?: ZodObject<ZodRawShape>
}

export interface TenantManifest {
  /** Tenant name; MUST equal its folder name under `tenants/`. Lowercase slug. */
  name: string
  /** The Spaces this Tenant declares (e.g. `current`, `archived`). Per-Tenant set. */
  spaces: string[]
  /** Collections (content types) present in every Space of this Tenant. */
  collections: Record<string, CollectionDef>
}

// Slugs disallow `_` and `-` so the tripartite key `tenant_space_collection`
// is always unambiguous to parse back.
const SLUG = /^[a-z][a-z0-9]*$/

/** Author-facing helper: declares a Tenant's intent. The generator does the rest. */
export function defineTenant(manifest: TenantManifest): TenantManifest {
  return manifest
}

/** The collection key — also the SQLite table name and the unit of isolation (ADR-0001). */
export function collectionKey(tenant: string, space: string, collection: string): string {
  return `${tenant}_${space}_${collection}`
}

/** Structural validation run by the generator; fails fast before any codegen. */
export function validateManifest(m: TenantManifest): string[] {
  const errors: string[] = []
  if (!m || typeof m !== 'object') return ['manifest is not an object']
  if (!SLUG.test(m.name ?? '')) errors.push(`tenant name "${m.name}" must match ${SLUG}`)

  if (!Array.isArray(m.spaces) || m.spaces.length === 0) {
    errors.push(`tenant "${m.name}" declares no spaces`)
  } else {
    for (const s of m.spaces) {
      if (!SLUG.test(s)) errors.push(`space "${s}" in tenant "${m.name}" must match ${SLUG}`)
    }
    if (new Set(m.spaces).size !== m.spaces.length) {
      errors.push(`tenant "${m.name}" has duplicate spaces`)
    }
  }

  const names = Object.keys(m.collections ?? {})
  if (names.length === 0) errors.push(`tenant "${m.name}" declares no collections`)
  for (const c of names) {
    if (!SLUG.test(c)) errors.push(`collection "${c}" in tenant "${m.name}" must match ${SLUG}`)
    const def = m.collections[c]
    if (!def) continue
    if (def.type !== 'page' && def.type !== 'data') {
      errors.push(`collection "${m.name}.${c}" has invalid type "${def.type}"`)
    }
    if (def.schema && typeof (def.schema as { safeParse?: unknown }).safeParse !== 'function') {
      errors.push(`collection "${m.name}.${c}" schema is not a zod schema`)
    }
  }
  return errors
}
