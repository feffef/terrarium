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
// Two Spaces. `trench` is the excavation on display; `stores` holds finds kept
// off display — fully catalogued, graded and dated, just not narrated by a dig
// report (layers/midden/CONTEXT.md, "The Stores"). `gallery` remains out of
// scope (#522 — deferred until `trench` has accumulated enough graded artifacts
// to curate real exhibits from); trench → gallery → stores is the whole life of
// a real institution's material: excavation, exhibition, storage.
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
//   - a `path` (on `file` or `commit`) ending in `/` declares a DIRECTORY, and
//     scripts/midden-survey.ts screens every candidate beneath it; without the
//     slash it screens that one file only (#752).
//   - a `commit` path means "the path this commit touched", not "this path is
//     retired" — so it screens only the deletion its own `hash` performed, and a
//     later deletion of a path this commit merely edited stays a candidate (#761).
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

// One curator-curated link to the artifact's preserved original state — a
// revision pinned to a FULL 40-char commit SHA (a branch-named link would
// mutate under the reader; the regex is the immutability bar, enforced at
// validate:content time). Curated means a few meaningful, labelled links per
// artifact, never a mechanical dump of every path it touched. Like the
// per-variant `url`, resolution is garnish: the artifact's meaning never
// depends on the link staying reachable.
const remainEntry = z
  .object({
    label: z.string().min(1), // curator's-voice caption, e.g. "the component, as last alive"
    url: z
      .string()
      .regex(
        /^https:\/\/github\.com\/[^/]+\/[^/]+\/(blob|tree|raw)\/[0-9a-f]{40}\/\S+$/,
        'remains.url must be a GitHub revision link pinned to a full 40-char commit SHA',
      ),
  })
  .strict()

export default defineTenant({
  name: 'midden',
  spaces: ['trench', 'stores'],
  collections: {
    // The routed dig report (#516). `title` (from the `page` type) is the
    // site's name; the body is the curator's dig-report prose, embedding
    // `::midden-artifact{slug="..."}` for each catalogued find (#521). No
    // custom frontmatter fields are decided for v1 — every structured fact
    // about a find lives on the `artifacts` Document it embeds, never here.
    pages: {
      type: 'page',
      kind: 'page', // opt into the cross-Tenant #catalog (ADR-0025)
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
          // Back-reference to the `pages` (site) Document slug that narrates it.
          // Optional at the SCHEMA level because the policy is per-Space and a
          // schema is declared Tenant-wide: required-and-resolving in a Space
          // that has dig reports, forbidden in one that has none (the stores).
          // `scripts/validate-content-refs.ts` enforces the real rule.
          site: z.string().optional(),
          // Curator's voice — small-caps register (theme.css). Terse; contrast
          // the more generous latitude the `lost` gravestone epitaph gets, which
          // still uses this same field (there's no separate epitaph field).
          catalogNote: z.string(),
          // REQUIRED (#526): condition is never re-derived from this — it's
          // rendered directly beside the grade+glyph, "fresh — as of 2026-05-01".
          assessedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'assessedAt must be YYYY-MM-DD'),
          // The terminal event: the commit that actually removed the thing —
          // distinct from the per-variant provenance `url` (a link to the
          // referent itself). Bare hash, not a URL: every artifact is about
          // this repo, so the renderer derives the commit link. Optional
          // because not every terminal event is a commit (a closed-unmerged
          // PR dies by closing). `validate-content-refs.ts` corroborates its
          // commit date against the artifact's `stratum` where history allows.
          removedIn: z.string().regex(/^[0-9a-f]{7,40}$/, 'removedIn must be a lowercase git commit hash').optional(),
          // The preserved original state, viewable in situ — see `remainEntry`
          // above. Like `inscription`, expected structurally ABSENT on a
          // `lost` artifact (nothing survives to view) — the same authoring
          // convention, renderer-suppressed, not schema-enforced.
          remains: z.array(remainEntry).nonempty().optional(),
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
