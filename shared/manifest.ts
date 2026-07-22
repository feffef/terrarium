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
// shared *minimum contract* (ADR-0025). It is orthogonal to `type`: `type` is
// the local build/route mechanism (page vs data), `kind` is the cross-Tenant
// read contract and the catalog opt-in. A collection with no `kind` stays
// invisible to any aggregator — isolation is the default. A collection may carry
// BOTH a `kind` and its own local `schema`: the effective schema is the kind's
// contract merged with the local fields (shared/expand.ts), so opting in never
// costs a Tenant its private fields. The `data` variant keeps the "a data
// collection needs at least one schema source (`schema`, `kind`, or both)"
// invariant checkable at the authoring surface (ADR-0002) via the nested union.
export type CollectionDef =
  | {
      /** 1:1 file→route content, rendered by the generic catch-all or a Tenant layer. */
      type: 'page'
      /** Glob relative to the Space's collection dir. Defaults to '**'. */
      source?: string
      /** Zod schema validating each Document. Strict schemas give free L1 validation (ADR-0004). */
      schema?: ZodObject<ZodRawShape>
      /** Opt this routed collection into `#catalog` under a page kind's contract (ADR-0025). */
      kind?: KindName
    }
  | ({
      /** Structured, non-routed content (e.g. Skills, session logs, Pingbacks). */
      type: 'data'
      /** Glob relative to the Space's collection dir. Defaults to '**'. */
      source?: string
    } & (
      | {
          /** Bespoke, Tenant-private shape — @nuxt/content's `DataCollection` has no untyped-blob mode. */
          schema: ZodObject<ZodRawShape>
          kind?: KindName
        }
      | {
          /** The shared contract this collection conforms to (shared/kinds.ts); local `schema` optional on top. */
          kind: KindName
          schema?: ZodObject<ZodRawShape>
        }
    ))

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
// `.superRefine` enforces the `type === 'data' ⇒ some schema source present`
// half — mirroring the `CollectionDef` TS union above, where only the `data`
// branch requires `schema` or `kind`. A plain optional `schema` with no
// refinement would let a source-less `data` collection pass runtime validation
// even though the TS type forbids it at compile time — it would fail only later,
// inside `content.config.ts`, instead of at this manifest-authoring surface
// (ADR-0002's "an agent's output can be checked before build" promise). (A `z.discriminatedUnion`
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
    // A `data` collection needs at least one schema source — an inline `schema`,
    // a `kind` whose contract supplies one, or both (the effective schema is the
    // merge — shared/expand.ts, ADR-0025).
    if (val.type === 'data' && val.schema === undefined && val.kind === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['schema'],
        message: 'data collection requires a schema (or a `kind` whose contract supplies one)',
      })
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
