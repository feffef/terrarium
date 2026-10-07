# Context — Marquee Tenant

> The Marquee context: its own vocabulary (Screening, Chapter, Poster) and its
> reason-to-exist. Platform-wide terms it leans on (Tenant, Space, Collection,
> …) live in the root `CONTEXT.md`; see `CONTEXT-MAP.md` for the map.

The Marquee is a movie-blog microsite: a running watch-through of the Marvel
Cinematic Universe told in **in-universe story order** — the order the events
happen inside the fiction — rather than the order the films were released.
It is a guest-requested demo Tenant (ADR-0023, issue #551): a Public visitor's GitHub issue, interviewed to a build plan by `guest-intake` and shipped by `guest-build`.

## Why it exists

Release order and story order diverge early and often in the MCU — *Captain
America: The First Avenger* is set decades before *Iron Man*, but reached
theatres years after it. The Marquee exists to answer one narrow, concrete
question a newcomer actually has — "if I watched these back to back as one
continuous story, what order would that be?" — and to do it one write-up at a
time, each paired with an original illustration rather than a poster scrape.

## Who it's for

Someone who wants the MCU's internal chronology rather than its release history, and is happy to read a short, spoiler-light take on each film as they go. No familiarity with the Terrarium's build is assumed — unlike the Journal or Blog, nothing here is about the platform; the Marquee is plain content, like the Atlas's fiction but non-fictional film commentary.

## Glossary

### Screening
The Marquee's word for its one Space (`reel`) — the single ordered run of Chapters. One Space suffices: there is no lifecycle/voice/place distinction to model (unlike the Blog's Persona or the Atlas's Biome). Say "Screening" in Marquee/product sentences, "Space" for the Platform mechanism.

### Chapter
One film's post: a short write-up plus an original illustration, one Document in the Screening's routed `pages` collection. Its `order` field is the film's position in the MCU's **in-universe** timeline (1 = earliest) — never release order, and never `publishedAt`, which is only when the post went up. The run starts at the beginning of that timeline and grows incrementally; a later Chapter extending it is ordinary growth, not a structural change.

### Poster
The Chapter's illustration: authored inline SVG art in its own softer, painterly, muted-palette language, evoking each film's mood and protagonist through color, silhouette, and symbolic props — deliberately **not** a copy of the film's costume, logo, or official art (a real design is trademarked; a Poster evokes, it never reproduces). Mechanics: see "What lives where" below.

## What lives where

- **This file** — the Marquee's vocabulary and why it exists.
- **Root `CONTEXT.md`** — the platform-wide terms the Marquee leans on, and
  the Tenants roster that points here.
- **`layers/marquee/app/components/marquee/Poster.vue`** — the shared frame + caption a Chapter's `illustration` frontmatter field (authored inline SVG markup) renders through, via the same `v-html`-of-committed-markup approach as the Atlas's engraved plates. The evoke-don't-reproduce judgment lives with each Chapter's SVG, not in a Skill: the run is small and guest-scoped, unlike the Atlas's ongoing `atlas-specimen` pipeline.
- **`layers/marquee/content/reel/pages/index.md`** — the Screening's own
  landing, listing the Chapters in story order.
