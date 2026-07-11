# Context — Atlas Tenant

> The Atlas context: its own vocabulary (Biome, Specimen, Interaction,
> Observation) and its reason-to-exist. Platform-wide terms it leans on (Tenant,
> Space, Collection, …) live in the root `CONTEXT.md`; see `CONTEXT-MAP.md`.

The Atlas is the Platform's design-heavy showpiece: a lavishly designed
natural-history **field guide** to a fictional ecosystem observed under glass.
Unlike the Journal (self-documentation) or the Blog (commentary on real repo
activity), nothing in the Atlas claims to be about the Terrarium itself — it is
fiction, and its value is entirely in the *structure*, not the claims.

## Why it exists

The Atlas is pure fit-out: the Tenant you open to show what a complex,
agent-grown site looks like once it has many interlocking Collections, a
consistent authored voice, and a hand-rolled visual style, all extended
incrementally by different sessions over time. It demonstrates a real
content-structure problem — cross-referenced records (a food web), a growing
prose archive (Specimen field notes), and a live append-only log (Observations) —
authored by agents across many sessions with no human hand-laying any of it out.
Everything textual speaks in one **naturalist's voice** and every plate is drawn
in one **engraved style**, both defined by the `atlas-specimen` Skill so any
session can extend the guide in register. Some Specimens are quiet portraits of
the Platform's own habits, kept as **subtext, never named** — it rewards a close
read but never announces the joke.

## Who it's for

Someone who wants to see what a complex, agent-grown *content structure* looks
like after a platform has been running a while — not a reader looking for facts
about the Terrarium. It is the demo side: the interest is in how the pieces
interlock and hold a consistent voice and style across many sessions, not in
anything the guide asserts (it asserts nothing real — the creatures are invented).

## Glossary

### Biome
A Space of the Atlas Tenant, embodying one **place** in the sealed world —
`canopy`, `floor`, `pool` today. This is the Atlas's word for a Space (say
"Biome" in Atlas/product sentences, "Space" for the Platform mechanism). Biomes
share the guide's structure but hold fully separate populations: a Specimen
belongs to exactly one Biome, so a Biome's food web is always a same-Space read.
Each carries its own palette and character — **The Canopy** (*dappled, patient*),
**The Floor** (*dark, industrious*), **The Pool** (*cool, glassy*).

### Specimen
The Atlas's atomic unit of contribution: one invented creature, catalogued as one
Document in a Biome's routed `pages` collection. It is simultaneously a **record**
(an invented Latin binomial, common name, classification, a **rarity** grade —
*abundant | common | uncommon | rare | mythic* — size, diet, an activity
**rhythm**, and a 2–3 hue **color signature** that is part of its identity) and a
**field note** (the naturalist's prose essay), fronted by a hand-drawn **engraved
plate**.

### Interaction
A single directed relationship between two Specimens **of the same Biome** — one
of *preys-on, pollinates, mimics, shelters, fears*. Authored once as a directed
edge (a Document in the Biome's `interactions` data collection); the reverse label
("preyed on by") is *derived*, so a Specimen's own Relations and the Biome's
food-web diagram are two views of the one single-homed fact. Contrast the Blog's
Pingback, which *denormalizes* a cross-Space fact: an Interaction is same-Space,
so it is derived, not copied.

### Observation
A dated sighting in a Biome's **field log** (a Document in its `observations` data
collection): a date, a coarse time-of-day, an optional Specimen, and a terse
in-fiction note. Append-only in spirit — the log only ever grows, old entries
never rewritten. The cheapest unit of contribution: a session can leave the world
visibly alive without adding a Specimen.

## What lives where

- **This file** — the Atlas's vocabulary and why it exists.
- **Root `CONTEXT.md`** — the platform-wide terms the Atlas leans on, and the
  Tenants roster that points here.
- **`.agents/skills/atlas-specimen/SKILL.md`** — how a Specimen/Interaction/
  Observation gets authored (the naturalist's voice, the engraved-plate art
  direction).
- **Each Biome's `pages/index.md` landing** and the Tenant-root
  `app/pages/t/atlas/index.vue` foreword — the in-fiction framing an actual
  visitor reads, written in the naturalist's voice, not this file's.
