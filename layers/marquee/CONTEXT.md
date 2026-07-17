# Context — Marquee Tenant

> The Marquee context: its own vocabulary (Screening, Chapter) and its
> reason-to-exist. Platform-wide terms it leans on (Tenant, Space, Collection,
> …) live in the root `CONTEXT.md`; see `CONTEXT-MAP.md` for the map.

The Marquee is a movie-blog microsite: a running watch-through of the Marvel
Cinematic Universe told in **in-universe story order** — the order the events
happen inside the fiction — rather than the order the films were released.
It is a guest-requested demo Tenant (ADR-0023, issue #551): a Public visitor
described the idea on a GitHub issue, `guest-intake` interviewed them to a
confirmed build plan, and `guest-build` shipped it.

## Why it exists

Release order and story order diverge early and often in the MCU — *Captain
America: The First Avenger* is set decades before *Iron Man*, but reached
theatres years after it. The Marquee exists to answer one narrow, concrete
question a newcomer actually has — "if I watched these back to back as one
continuous story, what order would that be?" — and to do it one write-up at a
time, each paired with an original illustration rather than a poster scrape.

## Who it's for

Someone who wants the MCU's internal chronology rather than its release
history, and is happy to read a short, spoiler-light take on each film as they
go. No familiarity with the Terrarium's own build is assumed or required —
unlike the Journal or Blog, nothing here is about the platform; the Marquee is
plain content, same as the Atlas's fiction, just non-fictional film commentary
instead.

## Glossary

### Screening
The Marquee's word for its one Space (`reel`) — the single ordered run of
Chapters. There is no lifecycle/voice/place distinction to model here (unlike
the Blog's Persona or the Atlas's Biome), so one Space is enough; "Screening"
names it in Marquee/product sentences, "Space" is still the Platform
mechanism underneath.

### Chapter
One film's post: a short write-up plus an original illustration, catalogued
as one Document in the Screening's routed `pages` collection. Its `order`
field is the film's position in the MCU's **in-universe** timeline (1 =
earliest story chronology) — never release order, and never the `publishedAt`
authoring instant, which is a separate, incidental fact about when the post
itself went up. The run starts at the beginning of that timeline and is
added to incrementally; a later Chapter extending the run is ordinary,
expected growth, not a structural change.

### Poster
The Chapter's illustration, rendered through the `MarqueePoster` component
from an `illustration` frontmatter field of authored inline SVG markup —
mirrors the Atlas's engraved-plate mechanism (same `v-html`-of-committed-markup
approach), but its own visual language: a softer, painterly, muted-palette
look evoking each film's mood and protagonist through color, silhouette, and
symbolic props, deliberately **not** a copy of the film's actual costume,
logo, or official art (a real design is trademarked; a Poster evokes, it never
reproduces).

## What lives where

- **This file** — the Marquee's vocabulary and why it exists.
- **Root `CONTEXT.md`** — the platform-wide terms the Marquee leans on, and
  the Tenants roster that points here.
- **`app/components/marquee/Poster.vue`** — the shared frame + caption a
  Chapter's illustration renders through; the art direction judgment call
  (evoke, don't reproduce) lives with each Chapter's authored SVG, not in a
  separate Skill — the run is small and guest-scoped, not an ongoing content
  pipeline like the Atlas's `atlas-specimen`.
- **`content/reel/pages/index.md`** — the Screening's own landing, listing
  the Chapters in story order.
