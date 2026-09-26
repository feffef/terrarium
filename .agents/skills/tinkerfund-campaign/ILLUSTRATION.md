# Drawing Tinkerfund figures

Reference for step 5 of [`SKILL.md`](SKILL.md): how to get Campaign figures that
match the catalog's finish on the first run. The same holds for redrawing or
polishing existing figures.

## Dispatch

Hand the drawing to one subagent on the **Fable** model (Agent tool,
`model: "fable"`, `isolation: "worktree"`), with the `dispatch-subagents` Skill's
brief rules. Point it at this file and at the Campaign page (story, Specifications,
Rewards and options), so every figure depicts the actual invention: its parts,
mechanism, options and use. Ask for **at least four figures**, two isometric and
two patent, plus the numbers below per figure in its report. Look at its final
sheets yourself before landing.

## The two styles

Both come from the illustration style (issue #1363) and the Instrument identity
(#1362). Study the prod Campaigns' figures first; they are the quality bar.

- **Isometric** — the Campaign's face. Flat, three-face shading at a true 30°
  (top lightest, the two sides accent and darker accent, or the ink family for
  hardware), a soft ground-shadow ellipse under anything that stands, no
  outlines. FIG. 1 is the hero: the invention alone, centred, filling the frame,
  legible at 52 px in the index table. Later isometric figures: exploded views,
  the invention in use, its Reward options side by side.
- **Patent** — detail, shown only in the Campaign's gallery. Ink line art
  (1.6 stroke, 2.4 for the main outline, 0.9 for leaders), hatching for cut
  faces, dashed hidden lines, even reference numerals (10, 12, 14 …) on curved
  leaders, dimension lines where a Specification gives a size, and one
  upper-case monospace title line at the bottom ("SECTION A–A", "PLAN · DOCK").
  Captions name the numerals: "Section A–A through the key: keycap (10), stem
  (12), spring (14) …".

Captions are deadpan, like the rest of the shop: they describe, precisely, and
let the invention be absurd on its own ("The pea (14) is shown in position and
is not included.").

## Hard rules

Checked by the schema and `validate:content`, and by the tools before that:

- `viewBox` 0 0 400 300; the markup is the inner SVG only.
- Colours only from theme tokens — `none`, `currentColor`, `var(--tf-*)` or a
  `color-mix` of two tokens — so a figure reads in light and dark. The invention
  is drawn in the accent family (`a1–a3`) and its hardware in the ink family
  (`k1–k3`), like every Campaign in the catalog; `good` and `link` only for
  small signals (an LED, a phone notification). `--tf-warn` is the marker
  yellow the identity keeps for urgency, so it never colours a figure.
- No `id` attributes: a figure can appear twice on one page. Hatch with
  explicit segments, not `<pattern>` or `clipPath`.
- ≤ 4096 bytes each: round coordinates to one decimal and reuse path data.
- Order: every isometric figure first (hero first), then every patent figure.

## Tools

In `tools/` beside this file, run from the repo root:

- `lib.mjs` — drawing helpers: token palette `C` (`a1–a3` accent faces, `k1–k3`
  ink faces, `good`/`link` and their mixes for signals), iso projection (`iso`, `box`,
  `cyl`, `TOP` for drawing on the ground plane), patent strokes (`G0`, `K24`,
  `T9`, `HID`, `HATCH` with `hatch()` clipped to polygons), `leaders`, `nums`,
  `title`, `dimH`/`dimV`, and `check()` (the schema's svg rule, locally). Write
  each Campaign's figures as a module exporting
  `figures = [{ style, caption, svg }]` built from these helpers; add
  `before = [...]` to compare against drawings being replaced.
- `preview.mjs <figures.mjs> <out-dir>` — renders every figure framed like the
  Campaign page, in both themes, at 400 px and at the 120/84/52 px thumbnail
  sizes, to `sheet.png`, and prints bytes and problems per figure. Look at the
  PNG with the Read tool.
- `apply.mjs <figures.mjs> <campaign.md>` — writes the list into the Campaign's
  frontmatter, refusing a wrong order or a broken rule.

## Refinement

Each figure gets **three passes**: draft, preview, critique, redraw. Bank every
pass to disk before starting the next. Critique against this list — the faults
the launch catalog's drawings actually had:

- Does it read as the invention at 52 px? Enlarge the parts that carry the idea
  (a stirring vane drawn as a tiny cross read as nothing).
- Do objects stand on their shadows? Anything floating over an empty shadow
  reads as a mistake.
- Do white or pale parts vanish on the white frame? Give them a `var(--tf-line)`
  rim.
- Are arcs bent the right way? A dimple drawn through the top of its circle
  filled the pea with hatching.
- Is the lettering crisp? Text inside a stroked group inherits the outline and
  smears into bold unless it sets `stroke:none`; the lib helpers do, and
  `check()` flags any that doesn't.
- Is any text clipped at the frame edge or colliding with a leader, arrow or
  another label? Right-anchor text near the right edge; keep labels ≥ 9 px.
- Are numerals unique, each with exactly one leader, and named in the caption?
- Are the isometric angles and face shading consistent with the other figures,
  with the light on the far faces and the darker accents on the near ones? An
  umbrella canopy first came out with its shading inverted.
- Does anything that moves (a hinged cover, a dashed open position) rotate the
  way the mechanism would, and stay inside the frame?
- Over budget? Drop decoration before detail that explains the invention.
- Does the dark sheet read as well as the light one?

After `apply.mjs`, run `pnpm validate:content`, then screenshot the Campaign page
(`pnpm exec tsx scripts/preview.ts shot /t/tinkerfund/prod/campaigns/<slug> <out.png> 1280x1600 --dev`)
and Home, and check the gallery thumbnails and the hero in place.
