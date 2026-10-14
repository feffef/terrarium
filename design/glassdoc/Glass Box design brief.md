# Glass Box: design brief (direction 1b)

Design pass for [#1985](https://github.com/feffef/terrarium/issues/1985). The mockups are in `Glass Box 1b.dc.html` and its standalone export. This brief records the ideas behind them, so the build spec can turn them into design stories.

## Core idea

The site is the inside of a glass box. The visual language is **frosted panes over a faint grid**. The grid stands for the structure underneath, and the panes for the explanation laid over it. Each Lesson has two layers in that metaphor:

- **The concept** sits on a frosted pane labelled *Outside the box · general*. It is general knowledge that applies to any project.
- **In Terrarium** sits directly on the grid, introduced by a *Looking inside* divider. It shows how Terrarium applies the concept.

Readers can see where the general summary ends and the Terrarium part begins. An expert can skip from one to the other.

## Tone

- Cool and calm, like a reference book. There is no hero imagery and no decoration beyond the grid and the panes.
- Copy is plain. Labels are short mono caps (`ON THIS PAGE`, `FULL REFERENCE`, `TRY IT IN YOUR PROJECT`).
- Header tagline: **"Terrarium, explained from the inside"**, on every page.
- No internal detail is shown to readers: no branch, no commit hash, no Space slug. The page's `revision` appears only as **"Last updated 14 Oct 2026"**.

## Type

- **Instrument Sans** (400/500/600/700) for UI and body text.
- **JetBrains Mono** (400/500) for code, `:file` links, labels and Excerpts.
- Both are OFL fonts, committed as woff2 files in `layers/glassbox/app/assets/fonts/`, with no font service.
- Desktop scale: h1 54px / −0.03em, h2 28px, body 17px / 1.65, lede 21px, labels 11px mono with 0.1em tracking.

## Colour tokens

Every rule is scoped under one wrapper class, for example `.glassbox`. Light and dark follow `prefers-color-scheme`.

| Token | Light | Dark |
| --- | --- | --- |
| `--gb-bg` | `#e6edf0` | `#0a1216` |
| `--gb-grid` (lines, 28px) | `rgba(15,40,55,.06)` | `rgba(255,255,255,.035)` |
| `--gb-ink` | `#0f1d26` | `#dce7ec` |
| `--gb-ink-2` (lede, secondary) | `#1d3340` | `#c4d2d9` |
| `--gb-muted` | `#4a5c66` | `#8ea1ab` |
| `--gb-pane` | `rgba(255,255,255,.5)` + `blur(16px)` | `rgba(255,255,255,.045)` |
| `--gb-pane-edge` | `rgba(255,255,255,.85)` | `rgba(255,255,255,.09)` |
| `--gb-accent` | `oklch(0.48 0.12 220)` | `oklch(0.8 0.1 210)` |
| `--gb-solid` (inverted blocks) | `#0f1d26` on `#fff` | `#dce7ec` on `#0a1216` |

Code inside Excerpts and plain fences keeps the existing Shiki github-light / github-dark themes. `ProsePre` is unchanged.

## Layout

- **Desktop:** a 272px **Subject sidebar** on the left, then a centred 760px content column. The sidebar has three parts:
  - **Start here:** the "Opening a page" Walkthrough.
  - **Subjects:** the full tree with Lesson counts. The current Subject is expanded and the current Lesson highlighted.
  - **Walkthroughs.**
  
  It uses titles and paths only, as ADR-0028 requires.
- **Table of contents:** a frosted pill bar inline above the first section. It lists h2s, with h3s grouped ("Why · Watch for"), and stays on screen while scrolling. There is no right rail.
- **Mobile:** a header with the logo, the tagline on a second line and a 44px menu button. The menu opens the Subject tree as a frosted panel. The table of contents collapses to a sticky pill ("On this page · The concept ▾") and opens as a frosted panel.

## Page types

**Landing page:**
1. The lede.
2. The **Start here** pane: one large frosted card with an arrow button.
3. The **Subject directory**: frosted cards in three columns, each sized to its own content (masonry, not equal rows).
4. The Walkthroughs card, inverted (`--gb-solid`).

Each Subject card shows its folder slug and its Lesson titles. Empty Subjects read "Lessons in preparation".

**Lesson**, in order:
1. A Subject chip.
2. h1 and lede.
3. The skip line, as a plain link.
4. The table of contents bar.
5. *The concept* pane, ending in a solid **Full reference ↗** button.
6. The *Looking inside* divider and *In Terrarium*. *Why it's built this way* and *What to watch for* sit side by side as two frosted cards.
7. **Try it in your project:** an inverted block.
8. **Where next.**
9. **Walkthroughs through this Lesson**, derived from the Walkthroughs' links (for example "A friction becomes a fix · stop 4").
10. **Prev/next.**

**Walkthrough:**
1. A Walkthrough chip, h1, lede and the italic reading note.
2. A table of contents bar listing the stops.
3. The optional diagram pane.
4. The **stops**: numbered circles joined by a thin vertical line, each stop on its own pane, ending in Lesson links shown as small chips. The current stop is emphasised.
5. **A real case:** a tinted accent pane.
6. **Where next.**

## Navigation decisions

- **Prev/next reaches both ways.** Previous stays within the Subject. At a Subject's last Lesson, Next continues into the next Subject and says so ("Leaving Claude Code → Skill pack"). Both cards have the same style; the label carries the meaning.
- **Where next** is one list style for everything. Each row has a type label (WALKTHROUGH / LESSON), the title, then → if the page exists or "Not written yet" if it doesn't. There is no other button styling.

## Code on the page

- **`:file`:** mono text in the accent colour with a dotted underline. There is no box, so it reads naturally inside sentences and brackets. Folders and line ranges look the same as files; the link target does the work.
- **Excerpt:**
  - **Header:** a rounded card whose header holds the `path` as a link, with pills for the line range and the revision link.
  - **Highlighted lines `{n}`:** an accent tint plus a 3px accent bar in the gutter.
  - **Gaps:** a `// …` line renders as a gap row (⋯) and the line numbers jump.
- **Plain fences** (examples for the reader's own project) have no chrome: just the Shiki block with a radius.

## Diagrams

- **Placement:** in Walkthroughs, right after the lede. Glass Box has to work without any diagram.
- **Container:** a frosted pane with the diagram centred on it.
- **Colours:** set through `--diagram-*`. Use `--gb-ink` for nodes, `--gb-accent` for the main lane and `--gb-muted` for secondary lanes.
- **Font:** Instrument Sans.

## Open for the build spec

- Should the Excerpt header show the revision date instead of the short hash, for consistency with "Last updated"?
- Does a frosted table of contents bar that stays on screen work in every target browser? Fallback: a solid `--gb-bg` at 92% opacity.
- Where the sidebar collapses to the menu button (suggested: below 1024px).
- The Start here description and the landing lede are placeholder copy until the Walkthrough is written.
