// The one sanctioned cross-Tenant read (ADR-0025, issue #642). `queryAcrossTenants`
// is to `#catalog` what `useSpace` is to `#routing`: a thin, read-only wrapper an
// aggregator (a platform view like the Commons Tenant) uses instead of importing
// another Tenant's manifest or hardcoding a Tenant roster.
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

/** A projected row from the `page` kind — the narrow cross-Tenant read model an
 *  aggregator depends on (title/description/path), never a Tenant's private
 *  fields, plus provenance and a ready-to-link canonical route. */
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
  /** A conventional publish instant (`publishedAt`), when the page carries one —
   *  the timestamp the Timeline orders by. Absent on undated pages (index
   *  landings, docs). */
  publishedAt?: string
}

/**
 * Read one collection kind across every Tenant that opts into it. Today the only
 * kind is `page`; the return is the routed-page projection above. Because every
 * contributing table references the same `page` contract, the union is uniformly
 * typed — that is the "without repeating the schemas" answer issue #642 asks for.
 */
export async function queryAcrossTenants(kind: 'page'): Promise<CatalogPageRow[]> {
  const entries = catalogByKind(kind)
  const perCollection = await Promise.all(
    entries.map(async (entry) => {
      // The single cross-collection typing boundary (issue #642's open question):
      // a runtime key can't narrow `queryCollection`'s generic, so the `page`
      // kind's contract is asserted here, once — the key is cast to the union of
      // *page* collection keys (`keyof PageCollections`), which the `page` kind
      // guarantees. Every item then extends `PageCollectionItemBase`, so the
      // built-in page fields the projection reads (path/title/description) are
      // present with no per-field cast.
      const items = await queryCollection(entry.key as keyof PageCollections).all()
      return items.map((item) => ({
        tenant: entry.tenant,
        space: entry.space,
        collection: entry.collection,
        path: item.path,
        url: documentUrl(entry.tenant, entry.space, item.path),
        title: item.title,
        description: item.description,
        // `publishedAt` is a per-collection schema field (blog/marquee posts), not
        // on every page item's base type — read it as a conventional optional
        // timestamp. The catalog stays the single home for cross-Tenant reads.
        publishedAt: (item as { publishedAt?: string }).publishedAt,
      }))
    }),
  )
  return perCollection.flat()
}

/** One entry in the cross-Tenant **Timeline**: a timestamped piece of content,
 *  reduced to a one-line summary and a link to its real public route (ADR-0025). */
export interface TimelineEntry {
  /** The instant this entry is placed at — UTC ISO-8601, so it sorts lexically. */
  when: string
  /** The one-line summary shown in the feed. */
  summary: string
  /** Canonical ADR-0006 route the entry links to. */
  url: string
  tenant: string
  space: string
  /** The kind this entry was normalized from (for provenance / future grouping). */
  kind: string
}

/**
 * The cross-Tenant Timeline: every timestamped piece of content, newest first.
 *
 * Each timeline-eligible **kind** normalizes to `{ when, summary, url }` *here* —
 * the aggregator understands the kinds it consumes, so this per-kind adapter is
 * the seam, not a per-Tenant one. Today it draws from the `page` kind (posts that
 * carry a `publishedAt`); a future kind (e.g. session logs) slots in as one more
 * branch, with no change to any Tenant. Reads are build-time/committed only
 * (ADR-0001).
 */
export async function queryTimeline(): Promise<TimelineEntry[]> {
  const pages = await queryAcrossTenants('page')
  const entries: TimelineEntry[] = pages
    .filter((r): r is CatalogPageRow & { publishedAt: string } => Boolean(r.publishedAt))
    .map((r) => ({
      when: r.publishedAt,
      summary: r.title ?? r.url,
      url: r.url,
      tenant: r.tenant,
      space: r.space,
      kind: 'page',
    }))
  // Reverse-chronological; UTC ISO-8601 sorts lexically, so string compare is
  // correct and needs no Date parsing.
  return entries.sort((a, b) => b.when.localeCompare(a.when))
}
