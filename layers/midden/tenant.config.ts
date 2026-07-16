// Manifest for the Midden Tenant — an archaeology-themed re-presentation of the
// Platform's own discarded work (dead branches, closed-unmerged PRs, deprecated
// Skills, removed files/dependencies, unapplied proposals). CONTEXT-MAP.md /
// CONTEXT.md Tenants roster: Midden; layers/midden/CONTEXT.md: Site / Artifact /
// Dig season / Condition / the two-gate inclusion test; issue #515 (the Wayfinder
// map that locked every decision below, via its 12 resolved sub-issues #516-528).
// Declarative intent only: `content.config.ts` builds the keyed collections from
// this manifest at config-evaluation time, and the routing map is derived from
// it at build time (ADR-0002/0013/0014) — no generated file involved.
//
// v1 scope is the `trench` Space only (#522 ruled `gallery` out of scope for
// this MVP — deferred until `trench` has accumulated enough graded artifacts to
// curate real exhibits from).
//
// Three collections, all declared tenant-wide per `shared/manifest.ts`'s shape,
// though `labels` is deliberately EMPTY in `trench` for v1 (it is a `gallery`
// concept — kept declared, per #516's resolution, rather than omitted):
//  - `pages`     the routed dig report: each `site` is one page (#516 — the
//                collection MUST be named `pages` for ADR-0006 routing; its
//                meaning is "site/dig report" in `trench`, "exhibit" in the
//                out-of-scope `gallery`).
//  - `artifacts` one catalogued discarded thing per file (#518, plus the #525
//                `continuityCheck` and #526 `assessedAt` addenda). Referenced
//                inline from a site's body via `::midden-artifact{slug="..."}`
//                (#521) — never routed on its own (ADR-0006: only `pages` is
//                route-addressable).
//  - `labels`    declared tenant-wide but empty in `trench` for v1 — its real
//                shape is `gallery`'s to decide once that Space is chartered.
import { z } from 'zod'
import { defineTenant } from '../../shared/manifest'

// The condition-grade ladder (#523/#526): curator-authored, never re-derived.
// Decay-then-orthogonal order: fresh → intact → fragmentary → dissolved sit on
// the erosion axis; never-activated and lost each break onto their own axis
// (see layers/midden/app/utils/condition.ts for the glyph/label/definition
// table this enum backs).
const condition = z.enum(['fresh', 'intact', 'fragmentary', 'dissolved', 'never-activated', 'lost'])

// Provenance (#518): a discriminated union on `kind`, one variant per kind of
// discarded thing this Tenant catalogues. `url` and `continuityCheck` are
// repeated per-variant (rather than expressed as a `.and()` intersection) so
// each variant schema stays a single flat `.strict()` object — the repo's
// existing convention for data-collection field schemas (see
// layers/atlas/tenant.config.ts's `interactions`/`observations`).
//   - `url` is optional garnish: a `dissolved`/`lost` artifact may have nothing
//     live to link to; the artifact's meaning never depends on the link resolving.
//   - `continuityCheck` is a short record of which Gate-B check ran and what it
//     found, e.g. "git log --follow: no live successor" (the #525 two-gate test).
const provenance = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('pr'), number: z.number().int().positive(), merged: z.boolean(), url: z.string().url().optional(), continuityCheck: z.string().optional() }).strict(),
  z.object({ kind: z.literal('branch'), name: z.string(), url: z.string().url().optional(), continuityCheck: z.string().optional() }).strict(),
  z.object({ kind: z.literal('commit'), hash: z.string(), path: z.string().optional(), url: z.string().url().optional(), continuityCheck: z.string().optional() }).strict(),
  z.object({ kind: z.literal('file'), path: z.string(), url: z.string().url().optional(), continuityCheck: z.string().optional() }).strict(),
  z.object({ kind: z.literal('dependency'), name: z.string(), url: z.string().url().optional(), continuityCheck: z.string().optional() }).strict(),
  z.object({ kind: z.literal('skill'), name: z.string(), url: z.string().url().optional(), continuityCheck: z.string().optional() }).strict(),
])

// The artifact's own words, quoted verbatim (#523's gravestone template expects
// this slot to be structurally ABSENT on a `lost` artifact, not rendered-empty —
// an authoring convention, not a schema-level conditional).
const inscription = z.object({ text: z.string(), source: z.string() }).strict()

export default defineTenant({
  name: 'midden',
  spaces: ['trench'],
  collections: {
    // The routed dig report (#516). `title` (from the `page` type) is the
    // site's name; the body is the curator's dig-report prose, embedding
    // `::midden-artifact{slug="..."}` for each catalogued find (#521). No
    // custom frontmatter fields are decided for v1 — every structured fact
    // about a find lives on the `artifacts` Document it embeds, never here.
    pages: {
      type: 'page',
      source: '**/*.md',
      // No `.strict()`: a page schema's fields are always optional additions on
      // top of `@nuxt/content`'s own built-ins (title/description/body/seo/…),
      // which this empty object must NOT reject (mirrors
      // layers/atlas/tenant.config.ts's pages schema, also non-strict).
      schema: z.object({}),
    },
    // One catalogued discarded thing per file (#518/#525/#526).
    artifacts: {
      type: 'data',
      source: '**/*.yml',
      schema: z
        .object({
          title: z.string(), // the artifact's own name
          stratum: z.string(), // dig-season slug — validated against utils/strata.ts by scripts/validate-content-refs.ts
          condition,
          provenance,
          site: z.string(), // back-reference to the `pages` (site) Document slug that narrates it
          // Curator's voice — small-caps register (theme.css). Terse; contrast
          // the more generous latitude the `lost` gravestone epitaph gets, which
          // still uses this same field (there's no separate epitaph field).
          catalogNote: z.string(),
          // REQUIRED (#526): condition is never re-derived from this — it's
          // rendered directly beside the grade+glyph, "fresh — as of 2026-05-01".
          assessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'assessedAt must be YYYY-MM-DD'),
          // The artifact's own words, quoted verbatim. Expected omitted on a
          // `lost` artifact (nothing survives to quote) — see the field's own
          // comment above.
          inscription: inscription.optional(),
        })
        .strict(),
    },
    // Declared tenant-wide (#516) but left EMPTY in `trench` for v1 — `labels`
    // is a `gallery` concept (#522: gallery out of scope for this MVP) and its
    // real shape is undecided. This placeholder schema exists only so the
    // collection is structurally valid; it carries no seed content.
    labels: {
      type: 'data',
      source: '**/*.yml',
      schema: z.object({ name: z.string(), description: z.string().optional() }).strict(),
    },
  },
})
