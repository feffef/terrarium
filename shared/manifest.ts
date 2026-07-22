// The Tenant manifest: the small, declarative unit an agent authors (ADR-0002).
// Agents edit `layers/<tenant>/tenant.config.ts`; `shared/expand.ts` expands the
// Tenant × Space × Collection cross-product into the keyed collections that
// `content.config.ts` builds dynamically (ADR-0013). Agents never hand-write
// the keyed explosion.
import { z, type ZodObject, type ZodRawShape } from 'zod'
import { KINDS, type KindName } from './kinds'

export type CollectionType = 'page' | 'data'

// Discriminated on `type` rather than one interface with an optional `schema`,
// mirroring @nuxt/content's own `PageCollection`/`DataCollection` split (its
// `DataCollection.schema` is required, not optional — only `PageCollection`'s
// is). Every actual `data` collection in this repo already carries a schema
// (it's how structured content gets any shape at all); this makes that
// existing invariant checkable at the manifest-authoring surface itself,
// instead of only failing later inside `content.config.ts`.
// The `kind` field opts a collection into the cross-Tenant `#catalog` under a
// shared contract (ADR-0025). It is orthogonal to `type`: `type` is the local
// build/route mechanism (page vs data), `kind` is the cross-Tenant read contract
// and the catalog opt-in. A collection with no `kind` stays invisible to any
// aggregator — isolation is the default. The three-way union below keeps the
// "how does a data collection get its schema" invariant checkable at the
// authoring surface (ADR-0002): a `data` collection carries EITHER an inline
// `schema` XOR a `kind` (which supplies the shared one), never both and never
// neither. A `page` collection may carry both its own extra-frontmatter `schema`
// AND a `kind: 'page'` marker (the page kind adds no schema — see shared/kinds.ts).
export type CollectionDef =
  | {
      /** 1:1 file→route content, rendered by the generic catch-all or a Tenant layer. */
      type: 'page'
      /** Glob relative to the Space's collection dir. Defaults to '**'. */
      source?: string
      /** Zod schema validating each Document. Strict schemas give free L1 validation (ADR-0004). */
      schema?: ZodObject<ZodRawShape>
      /** Opt this routed collection into `#catalog` (ADR-0025). Only `'page'` applies. */
      kind?: KindName
    }
  | {
      /** Structured, non-routed content (e.g. Skills, session logs, Pingbacks). */
      type: 'data'
      /** Glob relative to the Space's collection dir. Defaults to '**'. */
      source?: string
      /** Required — @nuxt/content's `DataCollection` has no untyped-blob mode. Bespoke, Tenant-private. */
      schema: ZodObject<ZodRawShape>
      kind?: never
    }
  | {
      /** Structured, non-routed content whose shared shape comes from a `kind`. */
      type: 'data'
      source?: string
      /** The shared contract supplying this collection's schema (shared/kinds.ts) — no inline schema. */
      kind: KindName
      schema?: never
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
const zodSchemaField = z.custom<ZodObject<ZodRawShape>>(
  (v) => typeof (v as { safeParse?: unknown })?.safeParse === 'function',
  'schema is not a zod schema',
)

// `schema` stays optional on the base object (a `page` never requires one) and a
// `.superRefine` enforces the `type === 'data' ⇒ schema present` half — mirroring
// the `CollectionDef` TS union above, where only the `data` branch requires
// `schema`. A plain optional `schema` with no refinement would let a schema-less
// `data` collection pass runtime validation even though the TS type forbids it at
// compile time — it would fail only later, inside `content.config.ts`, instead
// of at this manifest-authoring surface (ADR-0002's
// "an agent's output can be checked before build" promise). (A `z.discriminatedUnion`
// was the other option here, but its built-in "invalid discriminator" issue isn't
// straightforwardly restyled into this file's labelled-message convention, so a
// refinement on the existing object schema is the more surgical fix.)
const collectionDefSchema = z
  .object({
    type: z.enum(['page', 'data'], { message: 'has an invalid type (expected "page" or "data")' }),
    source: z.string().optional(),
    schema: zodSchemaField.optional(),
    kind: z.string().optional(),
  })
  .strict()
  .superRefine((val, ctx) => {
    // A `kind`, if present, must name a known contract (shared/kinds.ts) and its
    // `type` must match the collection's — a `page` kind can't sit on a `data`
    // collection or vice-versa (ADR-0025). Checked here so a bad `kind` fails at
    // this authoring surface, not later inside `expand()` (the ADR-0002 promise).
    if (val.kind !== undefined) {
      if (!Object.hasOwn(KINDS, val.kind)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['kind'],
          message: `references unknown kind "${val.kind}" — see shared/kinds.ts`,
        })
      } else if (KINDS[val.kind as KindName].type !== val.type) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['kind'],
          message: `kind "${val.kind}" is a ${KINDS[val.kind as KindName].type} kind but the collection is type "${val.type}"`,
        })
      }
    }
    // A `data` collection needs exactly one schema source: an inline `schema` XOR
    // a `kind` that supplies the shared one (the CollectionDef union above).
    if (val.type === 'data') {
      const hasSchema = val.schema !== undefined
      const hasKind = val.kind !== undefined
      if (!hasSchema && !hasKind) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['schema'],
          message: 'data collection requires a schema (or a `kind` that supplies one)',
        })
      } else if (hasSchema && hasKind) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['schema'],
          message: 'data collection has both an inline `schema` and a `kind` — use exactly one',
        })
      }
    }
  })

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

/** Author-facing helper: declares a Tenant's intent. `content.config.ts` and
 *  `modules/routing.ts` do the rest, expanding it at config-evaluation/build
 *  time (ADR-0013/0014) — there is no separate generator or codegen step. */
export function defineTenant(manifest: TenantManifest): TenantManifest {
  return manifest
}

/** The collection key — also the SQLite table name and the unit of isolation (ADR-0001). */
export function collectionKey(tenant: string, space: string, collection: string): string {
  return `${tenant}_${space}_${collection}`
}

/**
 * Structural validation of a Tenant manifest, callable standalone (e.g. from an
 * agent's own pre-flight check) before `content.config.ts`/`modules/routing.ts`
 * ever expand it (ADR-0013/0014) — no separate generator or codegen step exists
 * to "fail fast before". Backed by a zod schema (ADR-0002: "manifests are
 * schema-validated") — the same tool the Platform uses for every Collection
 * schema. Returns one path-qualified message per problem so every issue can be
 * listed at once, rather than fixed one `safeParse` at a time.
 */
export function validateManifest(m: TenantManifest): string[] {
  const res = tenantManifestSchema.safeParse(m)
  if (res.success) return []
  return res.error.issues.map((i) => {
    const where = i.path.join('.')
    return where ? `${where}: ${i.message}` : i.message
  })
}
