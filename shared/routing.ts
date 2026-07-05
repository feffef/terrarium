// Pure runtime-routing resolution (ADR-0006), split out of the routing page so the
// isolation-critical mapping — request → keyed collections, unknown → 404 — is unit
// testable without Nuxt (ADR-0004 L3, at resolution time rather than only at
// generation time). This is human-only surface: a bug here could cross-wire Spaces.
// The `[...slug].vue` page keeps only the Nuxt concerns (useRoute, createError, and
// the `keyof Collections` casts).
import { routingMap } from '#routing'

/** Tenant → Space → Collection → generated collection key. */
export type RoutingMap = Record<string, Record<string, Record<string, string>>>

export interface ResolvedRoute {
  /** Space-relative document path: leading '/', no trailing '/'. '/' at the Space root. */
  path: string
  /** The routed `pages` collection key for this (Tenant, Space). */
  pagesKey: string
  /** Every non-`pages` collection in the Space — surfaced as the landing-page catalog. */
  dataCollections: { name: string; key: string }[]
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
export function resolveSpaceRoute(
  tenant: string,
  space: string,
  slugParam: string | string[] | undefined,
  map: RoutingMap = routingMap as RoutingMap,
): ResolvedRoute | null {
  const path = slugToPath(slugParam)
  const spaceCollections = map[tenant]?.[space]
  if (!spaceCollections?.pages) return null

  // Convention: `pages` is the routed collection; every other collection in the Space
  // is queryable `data`, surfaced as a catalog on the Space landing. Each stays keyed
  // per (Tenant, Space), so the catalog is fully isolated too.
  const dataCollections = Object.entries(spaceCollections)
    .filter(([name]) => name !== 'pages')
    .map(([name, key]) => ({ name, key }))

  return { path, pagesKey: spaceCollections.pages, dataCollections, atRoot: path === '/' }
}
