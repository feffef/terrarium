// The Tenant manifest: the small, declarative unit an agent authors (ADR-0002).
// Agents edit `layers/<tenant>/tenant.config.ts`; the generator expands the
// Tenant × Space × Collection cross-product into the keyed collections in the
// generated `content.config.ts`. Agents never hand-write the keyed explosion.
import { z, type ZodObject, type ZodRawShape } from 'zod'

export type CollectionType = 'page' | 'data'

// Discriminated on `type` rather than one interface with an optional `schema`,
// mirroring @nuxt/content's own `PageCollection`/`DataCollection` split (its
// `DataCollection.schema` is required, not optional — only `PageCollection`'s
// is). Every actual `data` collection in this repo already carries a schema
// (it's how structured content gets any shape at all); this makes that
// existing invariant checkable at the manifest-authoring surface itself,
// instead of only failing later inside `content.config.ts` (issue #93).
export type CollectionDef =
  | {
      /** 1:1 file→route content, rendered by the generic catch-all or a Tenant layer. */
      type: 'page'
      /** Glob relative to the Space's collection dir. Defaults to '**'. */
      source?: string
      /** Zod schema validating each Document. Strict schemas give free L1 validation (ADR-0004). */
      schema?: ZodObject<ZodRawShape>
    }
  | {
      /** Structured, non-routed content (e.g. Skills, session logs, Pingbacks). */
      type: 'data'
      /** Glob relative to the Space's collection dir. Defaults to '**'. */
      source?: string
      /** Required — @nuxt/content's `DataCollection` has no untyped-blob mode. */
      schema: ZodObject<ZodRawShape>
    }

export interface TenantManifest {
  /** Tenant name; MUST equal its folder name under `layers/`. Lowercase slug. */
  name: string
  /** The Spaces this Tenant declares (e.g. `current`, `archived`). Per-Tenant set. */
  spaces: string[]
  /** Collections (content types) present in every Space of this Tenant. */
  collections: Record<string, CollectionDef>
}

// Slugs disallow `_` and `-` so the tripartite key `tenant_space_collection`
// is always unambiguous to parse back.
const SLUG = /^[a-z][a-z0-9]*$/

// A labelled slug schema: reused for the tenant name, each space, and each
// collection key. The label makes the path-qualified error name the offender.
const slug = (label: string) =>
  z.string().regex(SLUG, `${label} must be a lowercase slug (letters/digits, starting with a letter)`)

// Duck-typed "is this a zod schema?" — the manifest holds *runtime* zod objects
// (Collection schemas), so we probe for `.safeParse` rather than import a brand.
const collectionDefSchema = z
  .object({
    type: z.enum(['page', 'data'], { message: 'has an invalid type (expected "page" or "data")' }),
    source: z.string().optional(),
    schema: z
      .custom<ZodObject<ZodRawShape>>(
        (v) => typeof (v as { safeParse?: unknown })?.safeParse === 'function',
        'schema is not a zod schema',
      )
      .optional(),
  })
  .strict()

// `.strict()` on both objects is deliberate: an unknown manifest key (e.g. a
// `space:` typo for `spaces:`) becomes an error instead of passing silently.
const tenantManifestSchema = z
  .object({
    name: slug('tenant name'),
    spaces: z
      .array(slug('space'))
      .nonempty('tenant declares no spaces')
      .refine((s) => new Set(s).size === s.length, 'tenant has duplicate spaces'),
    collections: z
      .record(slug('collection'), collectionDefSchema)
      .refine((c) => Object.keys(c).length > 0, 'tenant declares no collections'),
  })
  .strict()

/** Author-facing helper: declares a Tenant's intent. The generator does the rest. */
export function defineTenant(manifest: TenantManifest): TenantManifest {
  return manifest
}

/** The collection key — also the SQLite table name and the unit of isolation (ADR-0001). */
export function collectionKey(tenant: string, space: string, collection: string): string {
  return `${tenant}_${space}_${collection}`
}

/**
 * Structural validation run by the generator; fails fast before any codegen.
 * Backed by a zod schema (ADR-0002: "manifests are schema-validated") — the same
 * tool the Platform uses for every Collection schema. Returns one path-qualified
 * message per problem so the generator can list them all at once.
 */
export function validateManifest(m: TenantManifest): string[] {
  const res = tenantManifestSchema.safeParse(m)
  if (res.success) return []
  return res.error.issues.map((i) => {
    const where = i.path.join('.')
    return where ? `${where}: ${i.message}` : i.message
  })
}
