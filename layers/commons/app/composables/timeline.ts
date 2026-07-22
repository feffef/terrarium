// The Commons Timeline's normalization policy (ADR-0025): every timestamped
// piece of content across the Platform, each source reduced to
// `{ when, summary, url }` by a per-source adapter HERE — the aggregator owns
// the policy for the kinds it consumes (what counts as a post, how a digest is
// dated, which fragment a deep-link uses), so adding or changing a source is an
// ordinary layer edit. The generic primitive it builds on
// (`queryAcrossTenants`, app/composables/catalog.ts) stays platform-side and
// human-only; reads are build-time/committed only (ADR-0001), read-only by
// construction (ADR-0020).
import { documentUrl } from '#shared/routing'

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
// the Timeline links to `<space-landing>#<anchor>`. The coupling to the Journal's
// scheme is this aggregator's own, deliberate choice, owned here in its layer.
const sessionAnchor = (id: string) => `session-${id}`
const digestAnchor = (date: string) => `digest-${date}`

// A daily digest is a *Journal* page under `/digests/<YYYY-MM-DD>` (ADR-0010, a
// Journal-scoped path convention) — the tenant guard below keeps it that way, so
// another Tenant publishing a page at `/digests/<date>` is treated as an ordinary
// page, never misclassified and deep-linked to a fragment that doesn't exist.
const DIGEST_PATH = /^\/digests\/(\d{4}-\d{2}-\d{2})$/

/**
 * The cross-Tenant Timeline: every timestamped piece of content, newest first.
 * Three sources today:
 *  - **posts** — `page`-kind rows carrying a `publishedAt` (the page contract's
 *    dated-page field — blog, marquee);
 *  - **digests** — Journal `page`-kind rows under `/digests/<date>`, dated from
 *    the path, headlined by their contract `summary`;
 *  - **sessions** — `session`-kind rows (session logs), dated by `endedAt`.
 */
export async function queryTimeline(): Promise<TimelineEntry[]> {
  // The generic primitive for both sources: `queryPages()` for the page kind
  // (posts + digests), and `queryAcrossTenants('session', …)` for the session
  // kind — the projector is this aggregator's assertion of the session contract,
  // replacing what used to be a duplicated private fan-out here.
  const [pages, sessions] = await Promise.all([
    queryPages(),
    queryAcrossTenants('session', (item) => ({
      session: item.session as string,
      endedAt: item.endedAt as string,
      goal: item.goal as string,
    })),
  ])

  const entries: TimelineEntry[] = []

  for (const p of pages) {
    const digest = p.tenant === 'journal' ? DIGEST_PATH.exec(p.path) : null
    if (digest) {
      entries.push({
        // End-of-day, so the day's digest sorts above the sessions and posts it
        // summarizes in the newest-first feed.
        when: `${digest[1]}T23:59:59Z`,
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
