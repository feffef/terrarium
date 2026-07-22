// The one sanctioned cross-Tenant read primitive (ADR-0025, issue #642).
// `queryAcrossTenants` is to `#catalog` what `useSpace` is to `#routing`: a thin,
// read-only wrapper an aggregator (a platform view like the Commons Tenant) uses
// instead of importing another Tenant's manifest or hardcoding a Tenant roster.
// The *normalization policy* built on top of it (what counts as a Timeline post,
// how a digest is dated) belongs to the aggregator's own layer
// (layers/commons/app/composables/timeline.ts) — this file stays the generic,
// isolation-critical floor.
//
// It fans out over the build-time catalog — never a manifest import — queries each
// contributing collection, and tags every row with its provenance and canonical
// route. Read-only by construction: write isolation (ADR-0020) is untouched. And
// build-time + committed data only (ADR-0001): the corpus is whatever content was
// baked, never a runtime/external fetch — which is exactly where the dollhouse
// went wrong.
import type { PageCollections } from '@nuxt/content'
import { catalogByKind } from '#catalog'
import { documentUrl } from '#shared/routing'

/** A projected row from the `page` kind — the cross-Tenant read model an
 *  aggregator depends on: the built-in page fields (title/description/path),
 *  the `page` kind's contract fields (shared/kinds.ts), and provenance plus a
 *  ready-to-link canonical route — never a Tenant's private fields. */
export interface CatalogPageRow {
  tenant: string
  space: string
  collection: string
  /** Space-relative document path ('/' at the Space root). */
  path: string
  /** Canonical ADR-0006 route, ready for a `<NuxtLink :to>`. */
  url: string
  title?: string
  description?: string
  /** Publish instant, from the `page` kind's contract — absent on undated pages
   *  (index landings, docs). */
  publishedAt?: string
  /** One-line headline, from the `page` kind's contract — absent on ordinary pages. */
  summary?: string
}

/**
 * Read one collection kind across every Tenant that opts into it. Today the only
 * page kind is `page`; the return is the routed-page projection above. Because
 * every contributing table carries the same merged `page` contract
 * (shared/expand.ts), the union is uniformly typed — that is the "without
 * repeating the schemas" answer issue #642 asks for.
 */
export async function queryAcrossTenants(kind: 'page'): Promise<CatalogPageRow[]> {
  const entries = catalogByKind(kind)
  const perCollection = await Promise.all(
    entries.map(async (entry) => {
      // The single cross-collection typing boundary (issue #642's open question):
      // a runtime key can't narrow `queryCollection`'s generic, so the key is cast
      // to the union of *page* collection keys (`keyof PageCollections`), which
      // the `page` kind guarantees. Every item then extends
      // `PageCollectionItemBase`, so the built-in page fields (path/title/
      // description) are present with no per-field cast.
      const items = await queryCollection(entry.key as keyof PageCollections).all()
      return items.map((item) => ({
        tenant: entry.tenant,
        space: entry.space,
        collection: entry.collection,
        path: item.path,
        url: documentUrl(entry.tenant, entry.space, item.path),
        title: item.title,
        description: item.description,
        // Guaranteed (as optionals) by the `page` kind's contract on every
        // opted-in collection — but `keyof PageCollections` spans UN-kinded page
        // collections too, so the union type lacks them; asserted here at the
        // same single boundary. A type-level kind→item-type linkage that removes
        // these casts is a recorded follow-up (ADR-0025 Consequences).
        publishedAt: (item as { publishedAt?: string }).publishedAt,
        summary: (item as { summary?: string }).summary,
      }))
    }),
  )
  return perCollection.flat()
}
