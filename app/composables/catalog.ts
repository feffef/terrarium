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
import type { Collections, PageCollections } from '@nuxt/content'
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
  /** A conventional one-line day/post headline (`summary`), when the page carries
   *  one — the Timeline prefers it over the title (e.g. a Journal digest's
   *  headline). Absent on ordinary pages. */
  summary?: string
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
        // `publishedAt`/`summary` are per-collection schema fields (not on every
        // page item's base type) — read them as conventional optionals. The
        // catalog stays the single home for cross-Tenant reads.
        publishedAt: (item as { publishedAt?: string }).publishedAt,
        summary: (item as { summary?: string }).summary,
      }))
    }),
  )
  return perCollection.flat()
}

/** The timeline "genre" of an entry — post (a dated page), digest (a daily
 *  Journal summary), or session (a session log). Drives a small label in the UI. */
export type TimelineGenre = 'post' | 'digest' | 'session'

/** One entry in the cross-Tenant **Timeline**: a timestamped piece of content,
 *  reduced to a one-line summary and a link to its real public route (ADR-0025). */
export interface TimelineEntry {
  /** The instant this entry is placed at — UTC ISO-8601, so it sorts lexically. */
  when: string
  /** The one-line summary shown in the feed. */
  summary: string
  /** Canonical ADR-0006 route (with a Journal deep-link fragment for sessions/digests). */
  url: string
  tenant: string
  space: string
  genre: TimelineGenre
}

// Journal deep-link fragment format, owned by layers/journal/app/utils/dashboard.ts
// (sessionAnchor/digestAnchor). A session log and a daily digest have no standalone
// page route — they render on the Journal dashboard, opened by this fragment — so
// the Timeline links to `<space-landing>#<anchor>`. Cited, not re-reasoned, per the
// single-home rule (CLAUDE.md).
const sessionAnchor = (id: string) => `session-${id}`
const digestAnchor = (date: string) => `digest-${date}`

// A daily digest is a Journal page under `/digests/<YYYY-MM-DD>` (ADR-0010); the
// date lives in the path, matching how the dashboard's `digestList` derives it.
const DIGEST_PATH = /^\/digests\/(\d{4}-\d{2}-\d{2})$/

/**
 * The cross-Tenant Timeline: every timestamped piece of content, newest first.
 *
 * Each source normalizes to `{ when, summary, url }` in a per-source adapter
 * *here* — the aggregator understands the kinds it consumes, so this is the seam,
 * never a per-Tenant one. Three sources today:
 *  - **posts** — `page`-kind rows carrying a `publishedAt` (blog, marquee);
 *  - **digests** — `page`-kind rows under `/digests/<date>` (the Journal's daily
 *    summaries), dated from the path, headlined by their `summary`;
 *  - **sessions** — `session`-kind rows (session logs), dated by `endedAt`.
 * Reads are build-time/committed only (ADR-0001).
 */
export async function queryTimeline(): Promise<TimelineEntry[]> {
  const [pages, sessions] = await Promise.all([queryAcrossTenants('page'), querySessions()])

  const entries: TimelineEntry[] = []

  for (const p of pages) {
    const digest = DIGEST_PATH.exec(p.path)
    if (digest) {
      entries.push({
        when: `${digest[1]}T00:00:00Z`,
        summary: p.summary ?? p.description ?? p.title ?? p.url,
        url: `${documentUrl(p.tenant, p.space, '/')}#${digestAnchor(digest[1]!)}`,
        tenant: p.tenant,
        space: p.space,
        genre: 'digest',
      })
    } else if (p.publishedAt) {
      entries.push({
        when: p.publishedAt,
        summary: p.title ?? p.url,
        url: p.url,
        tenant: p.tenant,
        space: p.space,
        genre: 'post',
      })
    }
  }

  for (const s of sessions) {
    entries.push({
      when: s.endedAt,
      summary: s.goal,
      url: `${documentUrl(s.tenant, s.space, '/')}#${sessionAnchor(s.session)}`,
      tenant: s.tenant,
      space: s.space,
      genre: 'session',
    })
  }

  // Reverse-chronological; UTC ISO-8601 sorts lexically, so string compare is
  // correct and needs no Date parsing.
  return entries.sort((a, b) => b.when.localeCompare(a.when))
}

/** Fan out over every `session`-kind collection, projecting the fields the Timeline
 *  needs. The `session` kind guarantees this shape, asserted at the same single
 *  cross-collection cast boundary `queryAcrossTenants` uses. */
async function querySessions(): Promise<
  Array<{ tenant: string; space: string; session: string; endedAt: string; goal: string }>
> {
  const perCollection = await Promise.all(
    catalogByKind('session').map(async (entry) => {
      const items = (await queryCollection(entry.key as keyof Collections).all()) as unknown as Array<{
        session: string
        endedAt: string
        goal: string
      }>
      return items.map((item) => ({
        tenant: entry.tenant,
        space: entry.space,
        session: item.session,
        endedAt: item.endedAt,
        goal: item.goal,
      }))
    }),
  )
  return perCollection.flat()
}
