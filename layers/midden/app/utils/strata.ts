// The canonical, ordered dig-season list (layers/midden/CONTEXT.md: "Dig season
// (Stratum)", #519) — the Midden's structural analog to the Atlas's
// `GLASS_SEASONS` (layers/atlas/app/utils/almanac.ts): an array-plus-lookup
// shape, single-homed here so the stratigraphy sidebar (#524), the trench-index
// legend (#528), and `scripts/validate-content-refs.ts`'s `stratum` reference
// check all read the same list.
//
// PLACEHOLDER CONTENT: the four seasons below are fictional stand-ins for a
// later content-authoring pass that will research real dig seasons from repo
// history (#519). Only the exported shape (`DigSeason`, `DIG_SEASONS`,
// `seasonOf`, `DIG_SEASON_SLUGS`) is the actual contract — that pass will
// replace this array's contents in place, preserving the shape exactly.
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
    slug: 'placeholder-season-one',
    label: 'the Routing Excavation',
    start: '2026-01-01',
    end: '2026-02-14',
  },
  {
    slug: 'placeholder-season-two',
    label: 'the Great Dependency Purge',
    start: '2026-02-15',
    end: '2026-03-31',
  },
  {
    slug: 'placeholder-season-three',
    label: 'the Skill Attrition',
    start: '2026-04-01',
    end: '2026-05-15',
  },
  {
    slug: 'placeholder-season-current',
    label: 'the Current Midden',
    start: '2026-05-16',
    end: null,
  },
]

/** Dig-season slugs in the same oldest-first order as `DIG_SEASONS` — the
 * ordering helper the sidebar (bottom-to-top render) and the legend
 * (top-to-bottom render) both derive their own direction from. */
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
