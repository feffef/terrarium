// Shared data-load prologue for the Midden layer's trench-scoped pages — the
// trench index (`[space]/index.vue`) and the site (dig-report) entry
// (`[space]/[...slug].vue`). Both need the SAME two keyed reads (this Space's
// `pages` sites and `artifacts`) and the same site → artifacts grouping: the
// trench index derives each site's touched strata from it, a site page
// derives its own stratigraphy-sidebar list from it. Single-homed here,
// mirroring layers/atlas/app/composables/useAtlasWingData.ts's reasoning for
// why its wing landing and specimen entry share one load.
//
// Named with Midden vocabulary ("trench" = the v1 Space), not a generic name —
// the auto-import namespace is global across every layer (tenant-layers.md
// §1); `strata.ts`'s `digSeasonOf` rename (after it silently collided with the
// Atlas's `seasonOf`) is the standing lesson here.
//
// Isolation-respecting (ADR-0004): this takes the ALREADY-resolved
// `useSpace('midden')` context as input rather than re-resolving the route
// itself — the isolation-critical resolution step stays exactly where it was
// (`useSpace` → `resolveSpaceRoute`); this composable only shapes the
// same-Space data those keys already scope. The caller passes its own
// `useAsyncData` key, kept per-route, so payload/dedup gives one cache entry
// per route, not a merged one.
import type { SpaceContext } from '~/composables/space'
import type { Grade } from '../utils/condition'

/** An Artifact's own words, quoted verbatim (tenant.config.ts's `inscription`). */
export interface MiddenInscription {
  text: string
  source: string
}

/** The discriminated provenance union (tenant.config.ts's `provenance`),
 *  mirrored as a plain TS type — the manifest only exports the zod schema
 *  itself, not its inferred type, so callers that need the shape (this
 *  composable, ArtifactCard, the MDC embed) share this one declaration
 *  instead of re-deriving it per call site. */
export type MiddenProvenance =
  | { kind: 'pr'; number: number; merged: boolean; url?: string; continuityCheck?: string }
  | { kind: 'branch'; name: string; url?: string; continuityCheck?: string }
  | { kind: 'commit'; hash: string; path?: string; url?: string; continuityCheck?: string }
  | { kind: 'file'; path: string; url?: string; continuityCheck?: string }
  | { kind: 'dependency'; name: string; url?: string; continuityCheck?: string }
  | { kind: 'skill'; name: string; url?: string; continuityCheck?: string }

/** One catalogued Artifact, with the content-collection `stem` surfaced as
 *  `slug` — tenant.config.ts's `artifacts` schema carries no `slug` field of
 *  its own; the filename (Nuxt Content's `stem` base field) IS the slug every
 *  `::midden-artifact{slug="..."}` embed and the `site` back-reference
 *  resolve against (mirrors how `scripts/validate-content-refs.ts` derives a
 *  Site's own slug from its page filename). */
export interface MiddenArtifactView {
  slug: string
  title: string
  stratum: string
  condition: Grade
  provenance: MiddenProvenance
  site: string
  catalogNote: string
  assessedAt: string
  inscription?: MiddenInscription
}

/** A raw `artifacts` collection Document, as returned by `queryCollection` —
 *  narrowed to the fields `toMiddenArtifactView` reads. */
interface MiddenArtifactDoc {
  stem: string
  title: string
  stratum: string
  condition: Grade
  provenance: MiddenProvenance
  site: string
  catalogNote: string
  assessedAt: string
  inscription?: MiddenInscription
}

/** Map one raw `artifacts` Document onto its `MiddenArtifactView` — the single
 *  home for this Document→view shape, shared by this composable's own
 *  `artifacts` list and the `::midden-artifact{slug="..."}` embed
 *  (`MiddenArtifact.vue`), which loads a single Document by slug rather than
 *  the whole collection. */
export function toMiddenArtifactView(doc: MiddenArtifactDoc): MiddenArtifactView {
  return {
    slug: doc.stem,
    title: doc.title,
    stratum: doc.stratum,
    condition: doc.condition,
    provenance: doc.provenance,
    site: doc.site,
    catalogNote: doc.catalogNote,
    assessedAt: doc.assessedAt,
    inscription: doc.inscription,
  }
}

/** Load one trench Space's `pages` (sites) and `artifacts`, and derive the
 *  `artifactsBySite` grouping both the trench index (per-site touched-strata
 *  ticks) and a site page (its own stratigraphy sidebar) need. `key` is the
 *  caller's own `useAsyncData` key, kept per-route so payload/dedup stays
 *  scoped to one cache entry per route. */
export async function useMiddenTrenchData(
  key: string,
  ctx: Pick<SpaceContext<'midden'>, 'pagesKey' | 'collections'>,
) {
  const { data } = await useAsyncData(key, async () => {
    const sites = await queryCollection(ctx.pagesKey).all()
    const artifactDocs = await queryCollection(ctx.collections.artifacts).all()
    return { sites, artifactDocs }
  })

  const sites = computed(() => data.value?.sites ?? [])

  const artifacts = computed<MiddenArtifactView[]>(() => (data.value?.artifactDocs ?? []).map(toMiddenArtifactView))

  // Every Artifact keyed by the `site` slug it's narrated from — content-
  // identical regardless of source ordering, so the trench index's per-site
  // ticks and a site page's own sidebar list both derive from one construction.
  const artifactsBySite = computed<Map<string, MiddenArtifactView[]>>(() => {
    const map = new Map<string, MiddenArtifactView[]>()
    for (const artifact of artifacts.value) {
      const existing = map.get(artifact.site)
      if (existing) existing.push(artifact)
      else map.set(artifact.site, [artifact])
    }
    return map
  })

  return { data, sites, artifacts, artifactsBySite }
}
