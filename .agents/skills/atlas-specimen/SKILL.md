---
name: atlas-specimen
description: Author one Atlas specimen — a fictional creature of the Terrarium's field guide — in the naturalist's voice and the engraved-plate art style, plus its food-web interactions and field-log observations. Use when adding to or extending the Atlas Tenant (biomes canopy/floor/pool).
disable-model-invocation: true
---

# atlas-specimen

Add **one specimen** (or an interaction, or an observation) to the **Atlas of the
Terrarium** — the design-heavy field-guide Tenant (PRD #64; layers/atlas/CONTEXT.md:
Biome, Specimen, Interaction, Observation). A specimen is the Atlas's atomic unit
of contribution: one Markdown file carrying the museum-label record in its
frontmatter, the field-note essay in its body, and the engraved plate as an inline
SVG. This Skill is the **single home** for the two things that keep the guide
coherent across the many sessions that will draw it: the **naturalist's voice**
(#75) and the **engraved-plate art direction** (#74).

> **Manually invoked** (`disable-model-invocation: true`). Lands through an
> ordinary gated PR (ADR-0003) on a feature branch — never direct-to-`main`.

Everything textual — field notes, log lines, relation notes, even empty states —
speaks in the one naturalist's voice. Everything drawn obeys the one plate style.
Get those right and a stranger cannot tell which session authored which entry.

---

## 1. The naturalist's voice (#75)

One narrator writes the entire Atlas: a patient, faintly Victorian field
naturalist, precise and affectionate toward the creatures, dryly funny, and
**never breaking fiction** — the naturalist has never heard of a repository, a
commit, or an agent. Wonder is expressed through *observation*, not exclamation.

**Diction & cadence**
- Measured, first-person-plural ("we recorded eleven sightings"). The naturalists
  are a small, unnamed company of observers.
- Latin binomials always *italic*, always. Common names lower-case ("the lantern
  moth"). The creature is a *specimen*, an *inhabitant*, never a "character".
- Understatement over hyperbole. The remarkable is stated plainly and allowed to
  be remarkable on its own. No exclamation marks. No "amazing", "incredible".
- Dry wit, gently at the observers' own expense more than the creature's: *"It is
  not shy, exactly. It simply prefers to be elsewhere, and is better at being
  elsewhere than we are at following."*
- Concrete sensory detail: what was seen, where, in what light. Time of day and
  quality of light recur.

**What the voice will and won't do**
- WILL: admit ignorance ("we do not know where it goes"), hedge honestly
  ("we suspect"), record a single vivid anecdote, address the creature's habits
  with affection.
- WON'T: break fiction, use bullet lists in a field note (prose only), moralize,
  over-explain the joke, use modern/technical/marketing register, or gush.

**A specimen of the voice** (this register, exactly):
> It was the light we noticed first, moving against the glass as though the
> evening had come indoors. By the time we thought to count them there was only
> one, and it had the patience to wait until we doubted we had seen it at all.

The voice governs microcopy too. An empty log reads *"No sightings recorded here
yet; the season is young."* A creature with no relations: *"No observed relations;
the naturalists remain suspicious."* A missing plate: *"Plate wanting — the
draughtsman was, we are told, indisposed."*

## 2. The engraved-plate art direction (#74)

Every specimen carries a hand-authored illustration in **one** style, so the Atlas
reads as one illustrated volume. The plate is authored as **inline SVG markup**
stored in the `illustration` frontmatter field (the inner elements only — no
`<svg>` wrapper; the `SpecimenPlate` component supplies the frame, `viewBox`,
caption, and tint).

**The rules of the style**
- **Canvas**: design to `viewBox="0 0 400 300"` (4:3). Compose the creature
  centred, with generous margin — the frame crops close.
- **Line and hatch only.** `fill="none"` on shapes; shade with **hatching**
  (sets of thin parallel `<line>`s or a `<path>` of strokes), never solid fills.
  Stroke the ink with `stroke="currentColor"` (inherits the engraving ink);
  `stroke-width` between `1` and `1.6`; `stroke-linecap="round"`.
- **Restrained tint from the signature.** You may tint **one** feature — the lamp,
  the eye, the shell's sheen — using `stroke="var(--sig-1)"` or a low-opacity
  `fill` (`fill="var(--sig-1)" fill-opacity="0.18"`). The tint warms the line; it
  never floods it. `--sig-1..3` are the specimen's signature colours, set by the
  component.
- **A little imperfection reads as a hand.** Slightly irregular hatching, a
  wandering contour — engravings are drawn, not extruded. Avoid perfect circles
  where an organism wouldn't be perfectly circular.
- **Mythic plates may be conjectural** (set `plate.conjectural: true`): draw the
  creature *incomplete* — a dashed contour (`stroke-dasharray`), a missing wing, a
  faded half — "reconstructed from a partial sighting". The frame adds the caption.
- Keep it to tens of elements, not hundreds. A clear, confident line beats detail.

A minimal, in-style plate (a moth with a tinted lamp):
```xml
<g stroke="currentColor" stroke-width="1.3" stroke-linecap="round" fill="none">
  <!-- body -->
  <path d="M200 120 q6 40 0 78 q-6 -38 0 -78" />
  <!-- wings, hatched -->
  <path d="M200 130 q-70 -34 -104 6 q-16 40 40 54 q40 8 64 -22" />
  <path d="M200 130 q70 -34 104 6 q16 40 -40 54 q-40 8 -64 -22" />
  <g stroke-width="0.7" opacity="0.7">
    <line x1="120" y1="132" x2="150" y2="150" />
    <line x1="128" y1="146" x2="156" y2="162" />
    <line x1="250" y1="150" x2="280" y2="132" />
    <line x1="244" y1="162" x2="272" y2="146" />
  </g>
</g>
<!-- the lamp: the one tinted feature -->
<circle cx="200" cy="120" r="9" fill="var(--sig-1)" fill-opacity="0.22" stroke="var(--sig-1)" stroke-width="1.4" />
```

## 3. Author the specimen file

Write to `layers/atlas/content/<biome>/pages/<slug>.md` where `<biome>` is one of
`canopy | floor | pool` and `<slug>` is a hyphenated latinate id
(`lumina-fabulae`). The `page` type supplies `title`/`description`/`body`; add the
museum-label record. The full schema is authoritative in
`layers/atlas/tenant.config.ts`:

```markdown
---
title: Lumina fabulae            # the Latin binomial — rendered italic everywhere
description: the lantern moth     # short; also the feed/index gloss
commonName: the lantern moth
classification: glimmerwing       # invented "class"
rarity: rare                      # abundant | common | uncommon | rare | mythic
size: 3 cm at rest
diet: starlight, mostly
activity:
  label: a dusk-flier             # short phrase in-voice
  bands: [[18, 23]]               # active hour-ranges on a 0–24 clock; may wrap ([20,4])
signature:
  colors:                         # 2–3 named hues that ARE the creature
    - { name: lantern gold, hex: "#e8b84b" }
    - { name: soot, hex: "#2a2622" }
  gloss: lantern gold on soot     # the label's spoken form
plate:
  number: XIV                     # roman numeral
  # conjectural: true             # mythic only — draw it incomplete
illustration: |
  <g stroke="currentColor" ...>   # inner SVG markup only (see §2)
    ...
  </g>
---

The field-note essay, in the naturalist's voice (§1). Prose, not bullets. How it
was found, its habits, one anecdote. No leading `#` — the binomial comes from the
frontmatter. Three or four short paragraphs is plenty.
```

The biome's own landing intro is `layers/atlas/content/<biome>/pages/index.md` —
a plain page (title + description + body, none of the record fields). Leave it be
unless you're founding a new wing.

If a field note ever composes an MDC block component (`::foo ... ::`), it
needs its closing `::` or it silently degrades to prose with no error — see
`docs/research/mdc-when-to-use.md`.

## 4. Interactions (the food web, #70/#71)

Each relationship is **one authored directed edge**, single-homed — the diagram
and both specimens' Relations sections all derive from it (the reverse label is
computed, so author each fact once). Same-biome only.

Write to `layers/atlas/content/<biome>/interactions/<from>-<kind>-<to>.yml`:
```yaml
from: lumina-fabulae      # actor slug
to: mycora-susurrans      # acted-upon slug
kind: pollinates          # preys-on | pollinates | mimics | shelters | fears
note: tends the whisper mold at dusk, and is the only thing that does.
```
Both slugs must be specimens **in the same biome**. The `note` is one line in the
voice — it reads the same from either side, so write it direction-neutral or from
the actor's side.

## 5. Observations (the field log, #72)

The cheapest contribution: leave a dated sighting even when you add no creature, so
the world stays alive. Append-only in spirit — never rewrite old ones.

Write to `layers/atlas/content/<biome>/observations/<date>-<slug-or-note>.yml`:
```yaml
date: 2026-07-06          # YYYY-MM-DD
time: dusk                # dawn | noon | dusk | night
specimen: lumina-fabulae  # slug observed — omit for an ambient note
note: first sighting this season, near the west glass.
```

## 6. Hidden portraits (#76) — subtext, never reporting

Some specimens are quiet portraits of the Terrarium's own inhabitants and habits
(a scavenger that feeds on drift; a creature that appears only at day's close and
tallies it; a gatekeeper that lets nothing unsound pass). The rule is absolute:
**a portrait must work as a plain creature first**, the resemblance deniable and
never explained anywhere in the Atlas. No index, key, or wink — if the joke needs a
footnote it isn't done, and it doesn't earn a frontmatter flag either. Add one only
when the platform grows a habit worth portraying, and let the naturalist stay
innocent of the whole thing.

## 7. Verify

Run `pnpm gate:scoped` before opening the PR (CLAUDE.md's **Self-verification** section
owns what it runs). Then eyeball the render — a specimen is a visual artifact,
so screenshot the entry and the biome landing
(`pnpm exec tsx scripts/screenshot.ts <url> <out.png>`), don't trust the HTML text
(CLAUDE.md: grepping SSR HTML is not proof a plate rendered).
