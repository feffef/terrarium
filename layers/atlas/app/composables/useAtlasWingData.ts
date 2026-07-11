// Shared data-load prologue for the Atlas layer's two Space-scoped pages — the
// biome landing (`[space]/index.vue`) and the specimen entry (`[space]/[...slug].vue`,
// #66/#67). Both pages need the SAME three keyed reads (this biome's `pages`,
// `interactions`, `observations`) and the same specimen-by-slug lookup that the
// food web, relations list, and field log all read for counterpart names —
// single-homed here.
// Named with Atlas vocabulary ("wing" = a biome landing's whole data need), not a
// generic name — the auto-import namespace is global across every layer
// (tenant-layers.md §1).
//
// Isolation-respecting (ADR-0004): this takes the ALREADY-resolved
// `useSpace('atlas')` context as input rather than re-resolving the route
// itself — the isolation-critical resolution step stays exactly where it was
// (`useSpace` → `resolveSpaceRoute`); this composable only shapes the
// same-Space data those keys already scope, so no isolation logic moves or
// duplicates. The caller passes its own `useAsyncData` key, kept per-route, so
// payload/dedup gives one cache entry per route, not a merged one.
import type { SpaceContext } from '~/composables/space'
import type { Edge, SpecimenView } from '../utils/atlas'

/** Load one biome's `pages`/`interactions`/`observations` and derive the shared
 *  `specimensBySlug` lookup. `key` is the caller's own `useAsyncData` key, kept
 *  per-route so payload/dedup stays scoped to one cache entry per route. */
export async function useAtlasWingData(
  key: string,
  ctx: Pick<SpaceContext<'atlas'>, 'pagesKey' | 'collections'>,
) {
  const { data } = await useAsyncData(key, async () => {
    const pages = await queryCollection(ctx.pagesKey).all()
    const interactions = await queryCollection(ctx.collections.interactions).all()
    const observations = await queryCollection(ctx.collections.observations).all()
    return { pages, interactions, observations }
  })

  const pages = computed(() => data.value?.pages ?? [])
  // The generated interactions item type (DataCollectionItemBase + from/to/kind/
  // note) is a structural superset of `Edge` with the same `kind` literal union,
  // so it assigns without a cast — an `as Edge[]` would erase the schema-drift
  // check the plain assignment gets for free.
  const edges = computed<Edge[]>(() => data.value?.interactions ?? [])
  const observations = computed(() => data.value?.observations ?? [])
  // Every Specimen — the biome landing intro (`path === '/'`) excluded — keyed by
  // slug. Content-identical regardless of source ordering, so the landing page's
  // sorted `specimens` and the entry page's unsorted pages both produce the same
  // map; one construction now serves both.
  const specimensBySlug = computed<Record<string, SpecimenView>>(() =>
    Object.fromEntries(
      pages.value
        .filter((p) => p.path !== '/')
        .map(toSpecimenView)
        .map((s) => [s.slug, s]),
    ),
  )

  return { data, pages, edges, observations, specimensBySlug }
}
