// The one presentation-side entry point to runtime routing: resolve the current
// route's (Tenant, Space) to its keyed collections, or 404. This single-homes
// the prologue every Space-scoped page needs (the Platform catch-all and each
// Tenant layer's overrides): useRoute → resolveSpaceRoute → createError → read
// keys off the resolved route.
//
// Isolation-respecting (ADR-0004): this is a read-only wrapper around the SAME
// shared, unit-tested `resolveSpaceRoute` — no isolation logic is duplicated or
// changed, and the resolved keys stay precisely typed per Tenant.
import { resolveSpaceRoute, type ResolvedRoute } from '#shared/routing'

export interface SpaceContext<T extends string> extends ResolvedRoute<T> {
  /** The Space slug from the route (second path segment). */
  space: string
}

/** Resolve the current route to one (Tenant, Space)'s keyed collections, or
 *  throw a 404. Pass the Tenant as a literal (`useSpace('journal')`) to get its
 *  precise collection-key types; the Platform catch-all passes a plain string.
 *  Read a non-`pages` Collection's key straight off `collections` by name
 *  (e.g. `collections.skills`) — precisely typed per Tenant, no cast. */
export function useSpace<T extends string>(tenant: T): SpaceContext<T> {
  const route = useRoute()
  const space = String(route.params.space)
  const resolved = resolveSpaceRoute(tenant, space, route.params.slug)
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: `Unknown Tenant/Space: ${tenant}/${space}` })
  }
  return { ...resolved, space }
}
