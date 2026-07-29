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
The `stores` Space has no Sites (see The Stores below).
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
reference resolves. A season also labels each inline find on a Site page (the
condition word carries its dig-season label). The former scroll-synced
**stratigraphy sidebar** (#524) was removed in the post-MVP simplification (see
the note at the foot of this file).

### Artifact
The Midden's atomic unit of contribution: one catalogued discarded thing, a
Document in `trench`'s `artifacts` data collection (#518). Carries a `title`,
its dig-season `stratum`, a curator-graded `condition`, a discriminated-union
`provenance` (which kind of thing it was — a PR, a branch, a commit, a file, a
dependency, or a Skill — plus an optional live `url` and a `continuityCheck`
note), a back-reference to the `site` that narrates it (required in a Space that
has Sites, **absent** in one that has none — the per-Space policy is enforced by
`scripts/validate-content-refs.ts`, since the schema is declared Tenant-wide and
cannot express it), a curator's-voice
`catalogNote`, a required `assessedAt` date (#526 — never re-derived), an
optional verbatim `inscription` ({text, source}), and two optional
preservation fields: `removedIn` — the terminal event, the bare hash of the
commit that removed the thing (rendered as a derived commit link;
`validate-content-refs.ts` corroborates its date against the `stratum` where
history allows — and presumes a `commit`-kind referent hash terminal for the
same check unless a declared `removedIn` overrides it, since a referent can
be a birth record, as with the Spawn term's coining commit), distinct from
`provenance.url` which links the referent itself — and `remains` — curator-curated, labelled links to the artifact's
preserved original state, each pinned to a full commit SHA so the link is
immutable (schema-enforced), a few meaningful views rather than a mechanical
dump of every touched path. Like `inscription`, `remains` is expected
structurally absent on a `lost` artifact — nothing survives to view. Rendered only inline inside
a Site's body (#521), never at its own route (ADR-0006 keeps only `pages`
route-addressable).

### Condition
The curator-graded preservation state of an Artifact, one of six grades in
decay-then-orthogonal order: `fresh → intact → fragmentary → dissolved` (the
erosion axis) then `never-activated` (complete but never fired — a distinct
axis, not a further decay step) and `lost` (its own gravestone template
entirely; #523). **100% curator-authored, never mechanically re-derived** —
not from `assessedAt`, not from any future continuity check (#526 closes this
question explicitly). Rendered as its **word** — a slug-angled corner *stamp* on each find (the label
tilted like a specimen physically stamped with its grade; owner-restored), the
dig-season label beside it — never a glyph to decode. The six grades and their fixed one-line definitions are
single-homed in `layers/midden/app/utils/condition.ts`; the definition text
surfaces in exactly one place — the **condition key**, a slim sticky sidebar on
each dig-report page listing only the grades present in that report's finds
(owner-directed final design; it replaced the landing's condition legend, #527) —
so it is never authored twice. The abstract SVG glyph and its hover-to-decode
tooltip were removed in the post-MVP simplification (see the note at the foot of
this file).

### The Stores
The Midden's second Space (`stores`): catalogued finds held **off display**. An
Artifact here is the same Artifact — same six Conditions, same Dig seasons, the
same record card rendered whole — minus its `site` back-reference, because the
stores have no Sites to narrate them. The organising axis is the Dig season
instead: a single season-grouped register at `/t/midden/stores`, no sub-routes
(ADR-0006 untouched — each find keeps an `#artifact-<slug>` anchor so a dig
report can still point at one).

A find moves here when the curator judges it **sound but not significant**: it
passed the same two-gate inclusion bar as everything in the trench, but carries
no decision, reversal, or transferable fact a dig report can argue from. The
demotion is a file move plus the deleted `site:` line, so the diff is the
demotion record; the reverse move is the same operation. Demotion is explicitly
*not* a quality judgment and never edits a record down — a real museum keeps
most of its collection in the stores and nobody reads that as a verdict.

The name completes an institution the Midden had already half-named: **trench**
(excavation) → **gallery** (exhibition, still out of scope — #522) → **stores**
(storage). A find is on display in the trench, or held in the stores.

Not to be confused with material that fails the inclusion bar outright, which is
never catalogued at all — that is spoil, and spoil is by definition unrecorded.

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
  {grade, label, definition} table the dig-report page's condition key and each
  inline find read from.
- **`app/components/midden/TrenchLanding.vue`** — the single landing mirrored at
  both `/t/midden` and `/t/midden/trench`, carrying the curatorial foreword an
  actual visitor reads (verbatim in-voice copy, not this file's register), the
  pull-quote, and the dig-report list. (`trench/pages/index.md` remains
  valid content but is no longer the rendered landing intro.)
- **`app/components/midden/ConditionKey.vue`** — the condition key: the sticky
  sidebar defining the grades present in the finds beside it (see Condition
  above). Shared by the dig-report page and the stores register.
- **`app/components/midden/StoresLanding.vue`** — the stores register: every
  find held off display, grouped by Dig season. Deliberately not the trench's
  specimen slip — same fields, quieter presentation (see The Stores above).
- **`app/utils/find.ts`** — the Artifact document shape and the two record-fact
  formatters, shared by both renderers so they cannot drift.
- **`.agents/skills/midden-survey/`** — the survey Skill that mechanizes
  candidate *discovery* (deleted files / dropped dependencies via
  `scripts/midden-survey.ts`; PRs / branches via the GitHub tools) and files a
  survey-report issue. The inclusion bar above is the judgment it applies;
  everything curatorial stays curator-authored.

## A note on the post-MVP simplification

The visitor experience was simplified after the MVP: the two landings merged into
one; each find now renders **open and flat** — condition as a word, the note and
inscription visible on load, no accordion; and the Site page's scroll-synced
stratigraphy gauge, the hover-to-decode SVG glyph, and the grade tooltip are all
gone, replaced by the corner stamp and the condition key (see Condition above).
The underlying model (Site, Artifact, Dig season, the six Conditions, the
inclusion bar) is unchanged; only its presentation is simpler. Full decision
history — including which #515 sub-issue decisions this superseded (#523, #524,
#527, #528) and why — is at issue #515.
