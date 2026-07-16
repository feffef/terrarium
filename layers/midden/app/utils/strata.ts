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
// history is only twelve days deep so far (first commit 2026-07-04), so these
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
 * and it is always the last entry (pinned by strata.spec.ts). */
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
    // The freshest spoil, still settling: closed-but-complete feature PRs, a
    // retired root-index listing, and the @nuxt/content client-DB patch dropped
    // once upstream no longer needed it (ADR-0019).
    slug: 'current-midden',
    label: 'the Current Midden',
    start: '2026-07-14',
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
