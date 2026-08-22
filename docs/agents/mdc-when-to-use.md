# MDC (Markdown Components): what it is, and when to reach for it

A general reference for deciding whether **MDC** — Nuxt Content's "Markdown
Components" — is the right tool for a given piece of content, with a decision
checklist at the end. The Journal on-ramp cards are used as a worked example of
a case where MDC is *capable but not the right fit*; the guidance itself is
meant to outlast that feature.

Version pins, verbatim syntax quotes, and component-resolution mechanics are
grounding detail, not the decision itself — single-homed in
`docs/research/nuxt-content-review-grounding.md` §13, not re-derived here.

---

## What MDC is

MDC lets an author drop **Vue components into Markdown** using a lightweight
syntax, so a `.md` body can contain rich, interactive, or structured blocks
alongside ordinary prose. The Markdown is parsed to an AST (stored as minimark
in SQLite in Content v3) and rendered with `<ContentRenderer :value="doc" />`,
which resolves each custom tag to a Vue component and hydrates it like any other.

It exists to solve one problem well: **letting content authors compose from a
palette of components without writing Vue or leaving the Markdown file.** That
framing — *author-facing, in-prose composition* — is the lens for every
"should I use it?" decision below.

The syntax forms are: inline components (single `:`), block components (`::`,
requiring a closing `::` — a missing one fails silently rather than erroring,
so verify a block component actually rendered by checking the DOM rather than
trusting a clean build; mechanism and citations: §13), inline `{}` props, a YAML
`---` block for props (nested arrays of objects are a first-class fit, no
escaping needed), default plus named `#slots` (slot content is itself rendered
Markdown), and nesting (more colons per depth, indentation-significant). Full
verbatim syntax reference, with citations: `docs/research/nuxt-content-review-grounding.md` §13.

Practical cost in a layer that doesn't already use MDC: adopting it means
creating a `components/content/` dir and a new SFC (component-resolution
mechanics: same §13). This repo's journal layer keeps its components under a
*prefixed* `components/journal/` dir and has no `components/content/` today.

## The validation caveat (important in this repo)

**Body MDC bypasses the collection's Zod schema entirely.** Only a `.md` file's
**frontmatter** is `safeParse`d (by this repo's own `scripts/validate-content.ts`);
the body "isn't part of the authored schema." Why that's true at the Nuxt
Content level — what a collection `schema` is (and isn't) used for at build —
is single-homed in `docs/research/nuxt-content-review-grounding.md` §2, with
the primary-source line citations; not re-derived here.

Consequence: data authored **in the body** (as MDC props) gets **zero gate
validation** — a typo'd key or a missing field surfaces only at render, if at
all. Data authored in **frontmatter** *is* schema-validated (via
`pnpm validate:content`). In a repo where "schemas are contracts" and agents
write nearly everything, that difference is a real trade-off, not a detail.

## When MDC is a good fit

Reach for MDC when **the content is authored in-prose and benefits from
composition**:

- **Rich editorial inside a page body** — callout/note/tip blocks, figures with
  captions, embeds, tabbed examples, a hero — placed *where they sit in the
  reading flow*.
- **Author-facing component palettes** — you want writers (or content-editing
  agents) to compose from reusable blocks without touching Vue.
- **One block with rich content** — a slot that holds formatted Markdown
  (emphasis, links, nested blocks) is exactly what slots are for.
- **Content that's naturally part of the document's narrative order** — the
  block's position in the body *is* its position on the page.

## When MDC is the wrong tool

Avoid MDC (prefer frontmatter fields, a data collection, or plain SFC/layout
code) when:

- **The layout — not the document flow — decides where the block goes.** Body
  MDC renders *wherever it sits in the body*; there is **no built-in "teleport
  to the page layout" affordance**. If a block must sit *outside* or *between*
  prose regions the page component controls, MDC fights you.
- **The data needs schema validation.** Body content isn't schema-checked (see
  above). Structural/config data that must not silently break belongs in
  frontmatter or a typed data collection.
- **It's structural navigation or chrome, not editorial** — nav cards, menus,
  "related links" the layout positions and gates. These are page-structure, not
  in-prose composition.
- **You'd move machinery without shrinking it** — if adopting MDC means a new
  `components/content/` dir, a new SFC, and *relocating scoped CSS out of the
  page*, for content that used to be a small array, you've added moving parts,
  not removed them.
- **Logic must wrap the block** — filtering, gating on other data, ordering.
  That logic lives naturally in the SFC/computed, not in a body node the layout
  has to reach into.

## Decision checklist

Ask these in order; a "no" on the first three usually means *don't* use body MDC:

1. **Is this content authored inside prose, in reading order?** (If it's
   layout-positioned chrome → not MDC.)
2. **Does the page layout stay out of *where* it renders?** (If the layout must
   place it between/around prose regions → not MDC; body content can't be
   hoisted.)
3. **Is it fine for this data to skip schema validation?** (If it's config that
   must be gate-checked → frontmatter or a data collection, not the body.)
4. **Does it genuinely need a *component* (interactivity, rich slots), vs. just
   structured data?** (Pure data → frontmatter/data collection. A component with
   rich slot Markdown → MDC is a strong fit.)
5. **Does adopting it *reduce* moving parts?** (If it adds an SFC + a
   `components/content/` dir + relocated CSS for what was a small array → the
   simpler home wins.)
6. **Who authors it, and with what tooling?** (Writers/agents composing in
   Markdown → MDC's whole point. A maintainer editing a Vue file anyway → less
   upside.)

If most answers point "yes," MDC is the neat choice. If they point "no," a
frontmatter field or a data collection read by the layout is usually simpler and
safer.

## Worked example: the Journal on-ramp cards (why MDC was *not* picked)

**Task:** move the dashboard's "New here?" on-ramp cards out of the Space-landing
SFC and into content.

MDC *could* do it — a `::onramp-cards` block with a `cards:` YAML array,
resolved from a new `layers/journal/app/components/content/OnrampCards.vue`,
rendering through the existing `<ContentRenderer :value="rootDoc" />`. But it
failed the checklist:

1. **Placement (checklist #2).** The cards sit *between* the editorial intro and
   the daily digests — a position the **page layout** owns. Body MDC would render
   the block *inside* the intro's `<ContentRenderer>` output, wherever it sits in
   `index.md`. There's no clean hoist; the workarounds (the `excerpt`
   single-cut, or reading the body AST in the SFC to pull the node out) are
   fragile and worse than the alternative.
2. **Machinery (checklist #5).** It would add a `components/content/` dir, a new
   SFC, and force the scoped `.onramp*` CSS out of `index.vue` — more parts, not
   fewer — to replace a small array.
3. **Validation (checklist #3).** Body MDC skips Zod, so the card data would get
   no gate coverage.
4. **Logic (when-wrong bullet).** The cards are filtered so a card only shows
   when its target page exists in-Space — layout logic that lives cleanly in a
   `computed`, awkwardly in a body node.

**What was chosen instead:** frontmatter on the *target* pages. Each explainer
page declares its own `onramp` order + `onrampLabel`/`onrampBlurb`, and the
dashboard reads them from the already-loaded `pages`. That keeps placement in the
SFC, gets real schema validation, single-homes each door's copy next to the page
it opens, and fits the repo's manifest/frontmatter-as-intent grain (ADR-0002/0013)
and single-home rule (CLAUDE.md). This is the general pattern: **structural,
layout-positioned, gate-validated data → frontmatter or a data collection; rich
in-prose editorial → MDC.**

Sources for the syntax/version/resolution claims above: `docs/research/nuxt-content-review-grounding.md` §13 and its own Sources section.
