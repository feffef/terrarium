// The canonical, ordered dig-season list (layers/midden/CONTEXT.md: "Dig season
// (Stratum)", #519) — the Midden's structural analog to the Atlas's
// `GLASS_SEASONS` (layers/atlas/app/utils/almanac.ts): an array-plus-lookup
// shape, single-homed here so the stratigraphy sidebar (#524), the trench-index
// legend (#528), and `scripts/validate-content-refs.ts`'s `stratum` reference
// check all read the same list.
//
// The seasons below are the REAL dig seasons, named for what the Platform was
// mostly discarding in each window and dated from the actual termination dates
// of the artifacts catalogued in `content/trench/` (#519). The Platform's own
// history is still shallow at this first cut (first commit 2026-07-04), so these
// strata are correspondingly thin — an honest young midden, not a deep one.
export interface DigSeason {
  /** URL-safe identifier — the value an `artifacts` Document's `stratum` field references. */
  slug: string
  /** Curator's-voice display name, e.g. "the Routing Excavation" — never a bare quarter/date label. */
  label: string
  /** YYYY-MM-DD, inclusive. */
  start: string
  /** YYYY-MM-DD, inclusive, or `null` for the open-ended "Current Midden" season (always the last entry). */
  end: string | null
}

/** Every dig season, oldest-first. Exactly one entry has `end: null` (the
 * open-ended "Current Midden" for freshly-discarded, not-yet-seasoned finds),
 * and it is always the last entry (pinned by strata.spec.ts).
 *
 * `current-midden` is a ROLE slug, not a fixed period: it always names whichever
 * cut is still open. Closing the open season therefore renames it to what it
 * turned out to be (2026-08-25: `current-midden` → `plainer-cut`) and re-opens
 * `current-midden` on the next one, repointing the closed season's artifacts.
 * A diff that moves the slug is that handover, not history being edited. */
export const DIG_SEASONS: DigSeason[] = [
  {
    // The trench floor: the generated-config-and-drift machinery (ADR-0007) dug
    // out when the routing map went build-time-virtual (ADR-0013/0014), plus the
    // earliest scaffolding — a bespoke app.vue, the squashed first milestone, the
    // discarded status-dashboard design.
    slug: 'routing-excavation',
    label: 'the Routing Excavation',
    start: '2026-07-04',
    end: '2026-07-09',
  },
  {
    // A thin ash layer of deliberate throwaways: do-not-merge spikes, closed
    // exploratory pull requests, and the speculative job-taxonomy that was named
    // before any of the work grew into it.
    slug: 'spike-ashfall',
    label: 'the Spike Ashfall',
    start: '2026-07-10',
    end: '2026-07-11',
  },
  {
    // The Atlas's phenology content-model recut for the second time — the
    // ::phase and season-note components retired for phase-notes — alongside a
    // sweep of unused dependencies, a dropped diagram, and a dropped animation.
    slug: 'almanac-recut',
    label: 'the Almanac Recut',
    start: '2026-07-12',
    end: '2026-07-13',
  },
  {
    // Named and closed by the second survey (issue #1043). This is the season
    // the Platform spent trusting its plainer instincts: the Midden's own
    // reading instruments dug back out when a simpler presentation won, a
    // retired root-index listing, a copy-link affordance, and the
    // @nuxt/content client-DB patch dropped once upstream no longer needed it
    // (ADR-0019). It held the open-ended "Current Midden" name for 43 days
    // before there was enough in it to say what it was.
    slug: 'plainer-cut',
    label: 'the Plainer Cut',
    start: '2026-07-14',
    end: '2026-07-24',
  },
  {
    // A trial pit is dug to find out whether a site is worth excavating, and
    // backfilled either way — which is this season's whole character. Work
    // built to be compared and thrown away (three rival root-index designs,
    // two of them destroyed on the hour), a recommendation delivered in full
    // and abandoned in one word, and an Inventory entry that turned out to
    // have had no referent for its entire 32-day life.
    slug: 'trial-pits',
    label: 'the Trial Pits',
    start: '2026-07-25',
    end: '2026-08-12',
  },
  {
    // The open cut. A whole Tenant lifted out on the day it turned thirty, and
    // the rehearsal prunes closed green and unmerged by charter.
    slug: 'current-midden',
    label: 'the Current Midden',
    start: '2026-08-13',
    end: null,
  },
]

/** Dig-season slugs in the same oldest-first order as `DIG_SEASONS` — the
 * canonical membership set `scripts/validate-content-refs.ts`'s `stratum`
 * reference check validates each Artifact's `stratum` value against. */
export const DIG_SEASON_SLUGS: string[] = DIG_SEASONS.map((s) => s.slug)

const BY_SLUG: Record<string, DigSeason> = Object.fromEntries(DIG_SEASONS.map((s) => [s.slug, s]))

/** The dig season for a given slug, or `undefined` if the slug is unknown —
 * the same lookup shape as the Atlas's `biomeMeta`/`seasonOf`. Named
 * `digSeasonOf`, not `seasonOf`: Nuxt auto-imports every `app/utils` export
 * globally across ALL layers (unimport), and the Atlas's own
 * `almanac.ts` already owns the global `seasonOf` name — reusing it would
 * silently overwrite the Atlas's generated type declaration and break its
 * typecheck (observed: `.nuxt/types/imports.d.ts` keeps only one
 * declaration per name). */
export function digSeasonOf(slug: string): DigSeason | undefined {
  return BY_SLUG[slug]
}
