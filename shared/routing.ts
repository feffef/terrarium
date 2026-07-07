// Pure runtime-routing resolution (ADR-0006), split out of the routing page so the
// isolation-critical mapping — request → keyed collections, unknown → 404 — is unit
// testable without Nuxt (ADR-0004 L3, at resolution time rather than only at
// generation time). This is human-only surface: a bug here could cross-wire Spaces.
// The `[...slug].vue` pages keep only the Nuxt concerns (useRoute, createError,
// queryCollection) — the resolved route already carries precisely-typed collection
// keys (see below), so no page casts them.
import { routingMap } from '#routing'

/** Tenant → Space → Collection → generated collection key — the *wide* shape of any
 *  routing map. The injectable `map` parameter (and the L3 test fixtures) use this;
 *  the generated `routingMap` itself is declared with its precise literal type. */
export type RoutingMap = Record<string, Record<string, Record<string, string>>>

// ── Precise key types, derived from the generated routing map (#96) ──────────────
// `#routing` declares `routingMap` with the literal type of the same JSON its
// runtime data is written from (modules/routing.ts), so the key scheme stays
// single-homed in `collectionKey()` (shared/manifest.ts) and type and data cannot
// diverge. The projections below turn that literal into the per-Tenant key unions
// the pages need: `queryCollection(key)` is generic in the key, so a wide `string`
// key would widen its result to every collection's item type and lose the fields
// the UIs read (#55). Because the resolver's RETURN type carries these unions, no
// call site needs an `Extract<keyof Collections, …>` or `as keyof Collections`
// cast — this comment is the one home for that rationale.

type Values<T> = T[keyof T]
type GeneratedMap = typeof routingMap

/** The Space records (collection name → generated key) of Tenant `T` — or of *all*
 *  Tenants when `T` is not a known Tenant literal (e.g. the Platform catch-all
 *  passes a plain `string`; an unknown Tenant resolves to `null` anyway). */
type SpaceRecordsOf<T extends string> = T extends keyof GeneratedMap
  ? Values<GeneratedMap[T]>
  : Values<{ [K in keyof GeneratedMap]: Values<GeneratedMap[K]> }>

type PagesKeyIn<R> = R extends { pages: infer P extends string } ? P : never
/** Union of `pages` collection keys reachable by Tenant `T`. */
export type PagesKeyOf<T extends string> = PagesKeyIn<SpaceRecordsOf<T>>

// Distributes over the union of Space records so each member drops its own
// `pages`, keeping the per-Tenant record shapes distinct.
type CollectionsIn<R> = R extends Record<string, string>
  ? { [C in Exclude<keyof R, 'pages'> & string]: R[C] }
  : never
/** Every non-`pages` Collection reachable by Tenant `T`, as a record keyed by
 *  Collection name → generated key — so a page reads `collections.skills`
 *  directly, precisely typed per Tenant, with no find-by-name and no cast. */
export type CollectionsOf<T extends string> = CollectionsIn<SpaceRecordsOf<T>>

export interface ResolvedRoute<T extends string = string> {
  /** Space-relative document path: leading '/', no trailing '/'. '/' at the Space root. */
  path: string
  /** The routed `pages` collection key for this (Tenant, Space). */
  pagesKey: PagesKeyOf<T>
  /** Every non-`pages` collection in the Space, keyed by Collection name → generated
   *  key — the Space-landing collection index reads `Object.entries(collections)`. */
  collections: CollectionsOf<T>
  /** True when the request targets the Space root ('/'). */
  atRoot: boolean
}

/** Normalise a Nuxt catch-all slug param to a Space-relative document path. */
export function slugToPath(slugParam: string | string[] | undefined): string {
  const joined = Array.isArray(slugParam) ? slugParam.join('/') : (slugParam ?? '')
  return joined ? `/${joined}`.replace(/\/$/, '') : '/'
}

/** Resolve a request to the keyed collections of exactly one (Tenant, Space), or `null`
 *  when that Space has no routable `pages` collection (the page turns this into a 404).
 *
 *  It reads ONLY `map[tenant][space]`, so a resolved route can never name another
 *  Tenant's or Space's collections — the isolation guarantee, enforced at resolution.
 *  `map` is injectable for tests; production passes the generated routing map. */
export function resolveSpaceRoute<T extends string>(
  tenant: T,
  space: string,
  slugParam: string | string[] | undefined,
  map: RoutingMap = routingMap,
): ResolvedRoute<T> | null {
  const path = slugToPath(slugParam)
  const spaceCollections = map[tenant]?.[space]
  if (!spaceCollections?.pages) return null

  // Convention: `pages` is the routed collection; every other collection in the Space
  // is queryable `data`, surfaced as a collection index on the Space landing. Each stays keyed
  // per (Tenant, Space), so the index is fully isolated too.
  const collections = Object.fromEntries(
    Object.entries(spaceCollections).filter(([name]) => name !== 'pages'),
  )

  // The cast narrows the wide `map` lookups (`string`) to the generated literal
  // unions above — a deliberate, single-homed assertion that the injectable map
  // matches the generated one in production (#96). Tests inject crafted maps and
  // only ever compare the strings, so the assertion is confined to this line.
  return { path, pagesKey: spaceCollections.pages, collections, atRoot: path === '/' } as ResolvedRoute<T>
}
