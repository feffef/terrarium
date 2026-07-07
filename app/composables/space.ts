// The one presentation-side entry point to runtime routing: resolve the current
// route's (Tenant, Space) to its keyed collections, or 404. Every Space-scoped
// page — the Platform catch-all and each Tenant layer's overrides — used to
// repeat this prologue (useRoute → resolveSpaceRoute → createError → fish keys
// out of `dataCollections`); it is single-homed here as an auto-imported
// composable instead.
//
// Isolation-respecting (ADR-0004): this is a read-only wrapper around the SAME
// shared, unit-tested `resolveSpaceRoute` — no isolation logic is duplicated or
// changed, and the resolved keys stay precisely typed per Tenant (#96/#55).
import {
  resolveSpaceRoute,
  type DataCollectionOf,
  type ResolvedRoute,
} from '#shared/routing'

export interface SpaceContext<T extends string> extends ResolvedRoute<T> {
  /** The Space slug from the route (second path segment). */
  space: string
  /** The keyed collection for a non-`pages` Collection of this Space, by name —
   *  `undefined` when the Space has no such Collection. Typed against the
   *  Tenant's own manifest-derived names, so a typo'd name fails typecheck. */
  dataKey<N extends DataCollectionOf<T>['name']>(
    name: N,
  ): Extract<DataCollectionOf<T>, { name: N }>['key'] | undefined
}

/** Resolve the current route to one (Tenant, Space)'s keyed collections, or
 *  throw a 404. Pass the Tenant as a literal (`useSpace('journal')`) to get its
 *  precise collection-key types; the Platform catch-all passes a plain string. */
export function useSpace<T extends string>(tenant: T): SpaceContext<T> {
  const route = useRoute()
  const space = String(route.params.space)
  const resolved = resolveSpaceRoute(tenant, space, route.params.slug)
  if (!resolved) {
    throw createError({ statusCode: 404, statusMessage: `Unknown Tenant/Space: ${tenant}/${space}` })
  }
  // The cast narrows the found entry's `key` to the requested Collection's key
  // union. TS cannot verify it itself: `DataCollectionOf<T>` stays a deferred
  // conditional while `T` is generic, so `Extract<…>['key']` won't reduce. Same
  // deliberate, single-homed pattern as the resolver's own return cast
  // (shared/routing.ts, #96) — confined to this line.
  const dataKey = <N extends DataCollectionOf<T>['name']>(name: N) =>
    resolved.dataCollections.find((d) => d.name === name)?.key as
      | Extract<DataCollectionOf<T>, { name: N }>['key']
      | undefined
  return { ...resolved, space, dataKey }
}
