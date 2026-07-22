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
// contributing collection, projects, and tags every row with its provenance.
// Read-only by construction: write isolation (ADR-0020) is untouched. And
// build-time + committed data only (ADR-0001): the corpus is whatever content was
// baked, never a runtime/external fetch — which is exactly where the dollhouse
// went wrong.
import type { Collections } from '@nuxt/content'
import type { KindName } from '#shared/kinds'
import { catalogByKind } from '#catalog'
import { documentUrl } from '#shared/routing'

/** Provenance stamped onto every catalog row — which (Tenant, Space, Collection)
 *  a document came from. */
export interface CatalogProvenance {
  tenant: string
  space: string
  collection: string
}

/** A catalog document as read from its collection — a permissive view a projector
 *  picks fields from. The KIND's contract (shared/kinds.ts) is what guarantees
 *  which fields are present; the projector is the single per-consumer assertion. */
export type CatalogItem = Record<string, unknown>

/**
 * Read one collection KIND across every Tenant that opts into it — generic over
 * the kind (any `KindName`, not just `page`) and over the projection `T` the
 * caller wants. `project` picks the fields the kind's contract guarantees, and the
 * fan-out stamps each row with provenance.
 *
 * Projecting *inside* the fan-out (rather than returning raw items) keeps large
 * fields — a page `body` AST — out of the aggregated corpus. Deriving `T` from the
 * kind name at the type level (a real `KindItem<K>`) is a deliberate non-goal: it
 * fights Nuxt Content's per-collection generics for little gain, so the projector's
 * one cast is the sanctioned boundary instead (ADR-0025 Consequences).
 */
export async function queryAcrossTenants<T>(
  kind: KindName,
  project: (item: CatalogItem) => T,
): Promise<Array<T & CatalogProvenance>> {
  const perCollection = await Promise.all(
    catalogByKind(kind).map(async (entry) => {
      // The single cross-collection cast boundary: a runtime key can't narrow
      // `queryCollection`'s generic, so the item is read as a permissive record and
      // the projector asserts the kind's contract shape.
      const items = await queryCollection(entry.key as keyof Collections).all()
      return items.map((item) => ({
        ...project(item as unknown as CatalogItem),
        tenant: entry.tenant,
        space: entry.space,
        collection: entry.collection,
      }))
    }),
  )
  return perCollection.flat()
}

/** The `page` kind's cross-Tenant projection: the built-in page fields
 *  (title/description/path) plus the page contract's dated fields (publishedAt/
 *  summary — shared/kinds.ts) and a ready-to-link canonical route. Never a
 *  Tenant's private fields. */
export interface CatalogPageRow extends CatalogProvenance {
  /** Space-relative document path ('/' at the Space root). */
  path: string
  /** Canonical ADR-0006 route, ready for a `<NuxtLink :to>`. */
  url: string
  title?: string
  description?: string
  /** Publish instant, from the `page` kind's contract — absent on undated pages. */
  publishedAt?: string
  /** One-line headline, from the `page` kind's contract — absent on ordinary pages. */
  summary?: string
}

/** Read every opted-in `page` collection across Tenants, projected to the page row
 *  above with its canonical route resolved — the page-kind convenience over
 *  `queryAcrossTenants`, shared by Search and the Timeline so the projection and
 *  URL derivation live in one place. */
export async function queryPages(): Promise<CatalogPageRow[]> {
  const rows = await queryAcrossTenants('page', (item) => ({
    path: item.path as string,
    title: item.title as string | undefined,
    description: item.description as string | undefined,
    publishedAt: item.publishedAt as string | undefined,
    summary: item.summary as string | undefined,
  }))
  return rows.map((row) => ({ ...row, url: documentUrl(row.tenant, row.space, row.path) }))
}
