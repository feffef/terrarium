# Context — Midden Tenant

> The Midden context: its own vocabulary (Site, Dig season, Artifact, Condition,
> the inclusion test) and its reason-to-exist. Platform-wide terms it leans on
> (Tenant, Space, Collection, …) live in the root `CONTEXT.md`; see
> `CONTEXT-MAP.md`.

The Midden is an archaeology-themed re-presentation of the Platform's own
discarded work — dead branches, closed-unmerged pull requests, deprecated
Skills, removed files and dependencies, and proposals that never landed. It is
one of several Tenants themed around the Platform's **Observability** invariant
(root `CONTEXT.md`): where the Journal narrates current activity and the Blog
comments on it, the Midden catalogues what the Platform stopped doing, once it
is truly finished stopping.

Full MVP spec, decision history, and the resolution of every sub-decision below:
[issue #515](https://github.com/feffef/terrarium/issues/515) (a Wayfinder map;
its 12 sub-issues #516–#528 carry the individual resolutions cited by number
throughout this file).

## Why it exists

Every other Tenant shows the Platform *building*. The Midden shows it
*discarding* — deliberately, not as an embarrassment. A thing earns a place
here only once it is unambiguously over: not paused, not renamed, not merged
elsewhere under a new name. The Midden's curatorial voice treats a dead branch
or a superseded dependency with the same seriousness a real dig treats a
broken pot: worth dating, grading, and quoting, not erasing.

## Who it's for

Someone curious what a long-running, agent-built platform has actually thrown
away, and how much of it — read as evidence of iteration, not failure. It
rewards a reader who wants texture on the Platform's history that the Journal's
forward-looking narration doesn't carry.

## Glossary

### Site
A Space `pages` Document in `trench` — the Midden's word for what the Platform
generically calls a page in this Space (root `CONTEXT.md`'s Collection term).
One dig report: curator's-voice prose narrating a **cluster** of related
Artifacts, embedding each inline via `::midden-artifact{slug="..."}` (#521 —
see Artifact below: never independently routed). Reused-per-Space collection
naming (#516) — `gallery` (out of scope for v1, #522) would give the same
collection an "exhibit" meaning instead.

### Dig season (Stratum)
A curator-declared date range, named for what the Platform was mostly doing or
discarding during it (e.g. "the Routing Excavation" — never a bare "Q1 2026";
#519). The canonical, ordered list is single-homed in
`layers/midden/app/utils/strata.ts`, mirroring the Atlas's `almanac.ts`
seasons pattern. One season stays open-ended — "the Current Midden" — for
freshly-discarded, not-yet-seasoned finds. An Artifact's `stratum` field
references a season by slug; `scripts/validate-content-refs.ts` checks that
reference resolves. **Post-MVP simplification (owner-directed):** the
scroll-synced stratigraphy sidebar that used to track this axis down the
margin of a Site page (#524) was removed when the visitor experience was
flattened to land → read; a find now names its own dig season as a plain text
label beside its condition, with nothing to scroll-sync against.

### Artifact
The Midden's atomic unit of contribution: one catalogued discarded thing, a
Document in `trench`'s `artifacts` data collection (#518). Carries a `title`,
its dig-season `stratum`, a curator-graded `condition`, a discriminated-union
`provenance` (which kind of thing it was — a PR, a branch, a commit, a file, a
dependency, or a Skill — plus an optional live `url` and a `continuityCheck`
note), a back-reference to the `site` that narrates it, a curator's-voice
`catalogNote`, a required `assessedAt` date (#526 — never re-derived), and an
optional verbatim `inscription` ({text, source}). Rendered only inline inside
a Site's body (#521), never at its own route (ADR-0006 keeps only `pages`
route-addressable).

### Condition
The curator-graded preservation state of an Artifact, one of six grades in
decay-then-orthogonal order: `fresh → intact → fragmentary → dissolved` (the
erosion axis) then `never-activated` (complete but never fired — a distinct
axis, not a further decay step) and `lost` (its own gravestone template
entirely; #523). **100% curator-authored, never mechanically re-derived** —
not from `assessedAt`, not from any future continuity check (#526 closes this
question explicitly). Rendered as its plain-text label directly on the find —
never a glyph to hover or decode. The six grades and their fixed one-line
definitions are single-homed in `layers/midden/app/utils/condition.ts`, shared
by the `GradeLegend` component (#527) so the definition text is never authored
twice. **Post-MVP simplification (owner-directed):** the per-grade SVG glyph
and its hover/keyboard-focus tooltip (#523's original two-tier interaction)
were removed when the visitor experience was flattened to land → read; the
definition table now surfaces exactly once, quietly, on the landing's
condition legend — a find itself carries only the word.

### The inclusion bar (two-gate test)
The classifier deciding what may become an Artifact (#525): **Gate A**
(terminal disposition — the candidate's net-final state, never a transient
one, is removal/closure/non-landing; a branch additionally needs a 30-day
dormancy floor) **and Gate B** (no living successor carries the candidate's
identity or purpose forward in current `origin/main`, checked mechanically
where possible and by curator judgment otherwise). Both gates must hold. One
line: "you catalog a corpse only where nothing living grew back." A candidate
that fails Gate B — something moved, was renamed, or was superseded in place —
belongs to the separately-proposed, not-yet-chartered **Palimpsest** Tenant,
not the Midden (not yet cross-referenced; revisit once Palimpsest exists).

## What lives where

- **This file** — the Midden's vocabulary and why it exists.
- **Root `CONTEXT.md`** — the platform-wide terms the Midden leans on, and the
  Tenants roster that points here.
- **[issue #515](https://github.com/feffef/terrarium/issues/515)** — the full
  MVP spec and every locked decision, with its sub-issues as the historical
  record of how each was resolved (a content/design Tenant's decisions are
  recorded there and in this file, not as ADRs — ADR-0021).
- **`layers/midden/app/utils/strata.ts`** — the canonical dig-season list.
- **`layers/midden/app/utils/condition.ts`** — the single-homed
  {grade, label, definition} table the find and legend components read from.
- **`app/components/midden/TrenchLanding.vue`** — the ONE landing, rendered
  identically (mirror, not redirect) from both `app/pages/t/midden/index.vue`
  and `app/pages/t/midden/[space]/index.vue` (post-MVP simplification: the
  Tenant-root front door and the `trench` Space entry used to be two
  near-duplicate pages). Carries the in-fiction-free, in-voice curatorial
  foreword an actual visitor reads first, written in the curator's small-caps
  register, not this file's.
