# Rendering Mermaid without a browser at runtime: options for a no-prod-browser static site

**Question / scope.** This repo renders Mermaid diagrams **client-side** today —
`app/components/MermaidDiagram.vue` dynamically `import('mermaid')` in the browser
and calls `mermaid.render()` on mount, shipping the ~large mermaid renderer to any
page that contains a diagram. We want to move diagram generation off the client so
pages ship **zero (or near-zero) mermaid JS**. The **hard constraint**: the
**production container has no browser installed** (no Chromium/Chrome), so any
approach that needs a headless browser *at prod runtime* is disqualified. The
saving grace is that this is a **static content site** — diagrams come from
` ```mermaid ` fenced blocks in Markdown that is fixed at build time — and the
**build environment (CI + the dev/session container) already has a pre-installed
Chromium plus `playwright-core`** (`scripts/chromium-path.ts`, `scripts/screenshot.ts`).
So the real axis is **build-time pre-render vs. runtime server-render**, and whether
a genuinely **browserless** renderer exists at all.

This note ranks the options and recommends one for *this* repo, given: no browser
in prod · Chromium + `playwright-core` available at build · static content · a
desire to keep client JS minimal · and the current **theming / dark-mode**
requirement (diagrams read live `--diagram-*` CSS custom properties so they adapt
to the Tenant palette and to `prefers-color-scheme: dark`).

**Versions this was verified against** (from this repo's `package.json` /
`node_modules` — re-check if they've moved):

- `mermaid` **11.16.0** (`node_modules/mermaid/package.json`; repo pins `^11.16.0`)
- `@nuxt/content` **3.x** (repo pins `^3.7.1`), `nuxt` **^4.0.0**
- `playwright-core` **^1.55.0** — already a devDependency, already wired to the
  pre-installed Chromium via `scripts/chromium-path.ts` (`resolveChromiumPath()`).
- mermaid's own deps that matter below: `d3` **^7.9.0** (DOM manipulation),
  `khroma` **^2.1.0** (colour math), `dompurify` **^3.3.3**
  (`node_modules/mermaid/package.json`).

Where a claim rests on **this session's empirical testing** rather than a
published source, it is labelled *(session finding)*.

---

## 1. Is truly browserless Mermaid rendering possible at all?

**Short answer: no — not for Mermaid specifically.** Mermaid lays out every
diagram by *measuring rendered text* — it inserts `<text>` nodes into a live SVG
DOM and reads their geometry back via `getBBox()` / `getComputedTextLength()` to
size nodes, wrap labels, and route edges. That geometry only exists if something
actually performs SVG **layout**.

- The dependency is pervasive, not incidental: the **installed mermaid 11.16.0**
  `dist/` references `.getBBox` **1302 times across 139 files** and
  `.getComputedTextLength` **98 times** (`grep -rc` over
  `node_modules/mermaid/dist/`, this session). Text measurement is woven through
  the layout code of essentially every diagram type — there is no config flag that
  turns it off.
- Mermaid drives the DOM through **d3** and manipulates a real document; it is
  written for a browser (`node_modules/mermaid/package.json` → `d3`, `dompurify`).
  *(session finding, corroborated by the dep list)*: plain Node `mermaid.render()`
  throws `document is not defined`.
- **jsdom does not close the gap**, because jsdom deliberately implements **no
  layout or rendering engine**. Its own README: *"Layout: the ability to calculate
  where elements will be visually laid out as a result of CSS, which impacts
  methods like `getBoundingClientRects()` or properties like `offsetTop`"* is
  listed under **unimplemented parts of the web platform**, and even the
  `pretendToBeVisual` option *"is really just about pretending to be visual, not
  about implementing the parts of the platform a real, visual web browser would
  implement"* — jsdom "still does not do any layout or rendering"
  (https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform,
  https://github.com/jsdom/jsdom#pretending-to-be-a-visual-browser). So
  layout-dependent methods return zeros. *(session finding)*: with jsdom shims,
  mermaid gets past `document is not defined` but then dies on
  `text2.getBBox is not a function` — exactly the missing-layout wall the jsdom
  README describes.
- Mermaid's maintainers track this as the standing reason server-side rendering
  isn't built in: the "Server Side Support" request notes that a *"browser
  environment is currently required for precomputing widths/heights"*
  (https://github.com/mermaid-js/mermaid/issues/3650), and the long-running
  "server side mermaid with jsdom" thread is the same wall
  (https://github.com/mermaid-js/mermaid/issues/559). The **official** answer is
  the CLI, which drives a real browser (see §2).

**Conclusion:** for Mermaid, "no browser at runtime" cannot be met by shimming
`getBBox` — it can only be met by (a) doing the rendering **at build time** in a
browser, so prod ships static SVG, or (b) **not using mermaid's renderer** (a
different, layout-capable renderer — §3).

---

## 2. The maintained headless renderers — and what they actually need

Both maintained renderers work by running mermaid **inside a real browser** and
extracting the SVG. Neither is browserless; the question for this repo is whether
the browser can be confined to **build time** and pointed at the **already-installed
Chromium** (no download).

### `@mermaid-js/mermaid-cli` (`mmdc`) — the official CLI

- It requires **Puppeteer + Chromium**. Puppeteer is a **peerDependency**:
  `"puppeteer": "^23 || ^24 || ^25"`
  (https://github.com/mermaid-js/mermaid-cli/blob/master/package.json).
- It **can** use an already-installed Chromium with **no download**: create a
  `puppeteerConfigFile.json` `{ "executablePath": "/path/to/chrome" }` and run
  `mmdc --puppeteerConfigFile puppeteerConfigFile.json`; set
  `PUPPETEER_SKIP_DOWNLOAD=1` at install to skip the bundled-Chromium download
  (https://github.com/mermaid-js/mermaid-cli/blob/master/docs/already-installed-chromium.md).
- The browser is needed **only at render time**, i.e. it can run **purely at
  build time**. Cost for this repo: it adds a **`puppeteer`** dependency the repo
  doesn't have (the repo standardises on `playwright-core`), plus a CLI subprocess
  per invocation.

### `mermaid-isomorphic`

- Outside a browser it uses **Playwright**: *"you need to install Playwright and a
  Playwright browser"*
  (https://github.com/remcohaszing/mermaid-isomorphic#readme). Its peer dep is
  `"playwright": "1"` (optional)
  (https://github.com/remcohaszing/mermaid-isomorphic/blob/main/package.json).
- It **can** be pointed at an existing Chromium: `createMermaidRenderer` accepts
  `launchOptions` (Playwright `LaunchOptions`, forwarded to
  `browserType.launch(launchOptions)`), and `LaunchOptions.executablePath` selects
  a custom Chromium binary
  (https://github.com/remcohaszing/mermaid-isomorphic/blob/main/src/mermaid-isomorphic.ts).
  It returns `{ svg, width, height, ... }`.
- Browser needed **only at render time** → **build-time-only** is fine. Cost:
  it adds a **`playwright`** peer dep (the browser-download-managing package),
  whereas the repo already has **`playwright-core`** (the same driver *without*
  the download machinery). In practice you can hand it a `launchOptions.executablePath`
  pointing at the pre-installed Chromium — but the peer-dep it declares is the full
  `playwright`, so this is a heavier add than rolling the render yourself (§5).

**Both** satisfy the prod constraint *only if run at build time* — running either
in prod would require a browser prod doesn't have.

---

## 3. WASM / pure-JS alternatives that need no browser AND no separate binary

This is the most important axis given the constraint, so it's worth being precise
about what each candidate can and cannot do.

### `@viz-js/viz` — Graphviz compiled to WebAssembly (genuinely browserless)

- It is **Graphviz compiled to WASM**, running in **Node or browser with no
  external browser and no native binary**
  (https://github.com/mdaines/viz-js). Node usage:
  `import { instance } from '@viz-js/viz'; instance().then(viz => viz.renderString(dot, { format: 'svg' }))`
  (also `viz.renderSVGElement(dot)`).
- **But it only accepts the Graphviz DOT language — not Mermaid syntax**
  (https://github.com/mdaines/viz-js). Graphviz *does* do its own text
  measurement/layout internally (that's why it needs no DOM), which is exactly why
  it sidesteps the `getBBox` problem — but it is a **different renderer with a
  different input language**.
- **The gap:** adopting it means either (a) **switching authoring syntax** from
  ` ```mermaid ` to Graphviz DOT for the diagrams we keep, or (b) building a
  **mermaid→DOT translation layer**, which is only tractable for the simplest
  flowchart/graph subset and throws away mermaid's sequence/state/class/gantt/etc.
  diagram types. This is the only truly browserless *renderer* on the table, but it
  is not a drop-in for mermaid content.

### `svgdom` (+ `opentype.js`/fontkit) — a server-side SVG DOM with font metrics

- `svgdom` is the svg.js server-side DOM. It **does** compute text bounding boxes,
  but only by **loading real font files**: *"In order to calculate bounding boxes
  for text the font needs to be loaded first"*, via `config.setFontDir()` /
  `setFontFamilyMappings()` / `preloadFonts()`, defaulting to Open Sans
  (https://github.com/svgdotjs/svgdom#text-and-fonts). Bold/italic work *"only
  when you explicitly load that font"*.
- **Why this doesn't rescue mermaid:** `svgdom` provides a getBBox for the
  **svg.js** object model, not a general browser-grade layout engine wired into the
  `document`/`SVGTextElement` API mermaid+d3 drive. It measures text metrics for
  *svg.js-authored* shapes; it is not a substitute for the browser DOM mermaid
  expects. It is a building block for a **hand-rolled** svg.js renderer, not a
  mermaid shim. (The same is true of feeding `opentype.js` glyph metrics into a
  custom renderer — that's writing a new renderer, not running mermaid.)

### `@resvg/resvg-js` — an SVG **rasteriser**, not a layout engine

- *"resvg-js is a high-performance SVG renderer and toolkit, powered by Rust based
  resvg … also a pure WebAssembly backend"* — it converts an **already-structured
  SVG** to a **PNG bitmap** (https://github.com/yisibl/resvg-js). It does **not**
  lay out diagrams or measure text for layout; it needs fonts only to paint
  existing `<text>`.
- **Role:** purely downstream. It could turn a pre-rendered SVG into a PNG, but
  that would *lose* vector scaling, interactivity, and — critically for us —
  **dark-mode adaptivity** (a raster bakes one theme). Not a renderer choice; not
  applicable to keeping adaptive SVG.

### `nomnoml` and other pure-JS diagrammers

- Pure-JS diagram libraries that avoid a DOM generally do so by measuring text on a
  `<canvas>` 2D context (`measureText`) or bundled font metrics, and they use their
  **own** DSL, not mermaid syntax. Same shape as `@viz-js/viz`: browserless is
  possible, but only by **changing the authoring language**, and only for the
  diagram kinds that tool supports.

**Bottom line for §3:** there is **no WASM/pure-JS renderer that runs *mermaid*
browserlessly.** The browserless renderers exist (`@viz-js/viz` especially) but
speak a different language. Keeping mermaid syntax ⇒ you need a browser *somewhere*,
which the constraint pushes to **build time**.

---

## 4. Kroki (diagram-as-a-service)

Kroki turns diagram text into SVG over HTTP. It does **not** eliminate the browser
for mermaid — it **relocates it into a different container**. Kroki's Mermaid
support is a **separate companion service** (`yuzutech/kroki-mermaid`) that runs
**Node.js + Puppeteer + headless Chrome**: its Dockerfile installs `chromium` and
sets `ENV PUPPETEER_EXECUTABLE_PATH=/usr/lib/chromium/chrome`
(https://github.com/yuzutech/kroki/blob/main/mermaid/Dockerfile). The main Kroki
gateway proxies mermaid requests to that companion
(`KROKI_MERMAID_HOST`), i.e. mermaid specifically needs the headless-Chrome sidecar
while Kroki's other diagram types (PlantUML, Graphviz, etc.) don't.

Fit against our constraint:

- **As a prod-runtime dependency:** it satisfies "no browser in *our* prod
  container" only by standing up a *second* container that *does* have Chrome, plus
  a network hop on every page/render. That's more infra, not less, and reintroduces
  a runtime rendering service for a site whose diagrams are fixed at build.
- **At build time only:** hitting a self-hosted (or the public
  `kroki.io`) Kroki **during the build** to fetch SVGs is viable and keeps prod
  browserless — but it's strictly heavier than rendering with the Chromium we
  already have locally at build (§5): it adds a service to run/pin (self-host) or a
  third-party/network + privacy dependency (public instance) for no capability we
  don't already have on the box.

---

## 5. Build-time pre-render in a Nuxt Content 3 project

Because the content is static, the cleanest fix renders each ` ```mermaid ` block
to **inline SVG at build time** and stores that in the parsed content, so the page
ships the SVG markup and **no mermaid JS at all**. Two things make this a natural
fit here:

**(a) The build box already has everything.** `playwright-core` is already a
devDependency and `scripts/chromium-path.ts` already resolves the pre-installed
Chromium (`resolveChromiumPath()`, driven exactly as `scripts/screenshot.ts`
does). *(session finding)*: driving that pre-installed Chromium via
`playwright-core` — load a blank page, inject mermaid (already a dep), call
`mermaid.render()`, read back the SVG — **works and produces correct SVG**. So the
"maintained renderer" behaviour of §2 is reproducible with **zero new
dependencies** (mermaid + playwright-core are both already in `package.json`).

**(b) Nuxt Content 3 gives real build-time transform hooks.** Confirmed in the
installed `@nuxt/content` source and docs
(https://content.nuxt.com/docs/advanced/hooks):

- **`content:file:beforeParse`** — fires with `{ file, collection, parserOptions }`
  before Markdown parsing (`node_modules/@nuxt/content/dist/module.mjs:1479-1480`).
  `file.body` is the **raw Markdown string**, so this is the *simplest* place to
  find ` ```mermaid ` fences and replace them (e.g. with a raw-HTML block holding
  the pre-rendered `<svg>`, or a lightweight component tag) before the AST is even
  built.
- **`content:file:afterParse`** — fires with `{ file, content, collection }` after
  parse (`module.mjs:1518-1520`); `content.body` is the parsed **minimark AST**.
  Rewriting here means walking the AST for `code`/`pre` nodes with
  `language === 'mermaid'` and swapping in an SVG node — more work than the raw
  string rewrite, but keeps you inside the parsed structure. (Community threads
  confirm `afterParse` body manipulation is a supported-but-fiddly path, e.g.
  https://github.com/nuxt/content/issues/2502.)

Both hooks are registered from `nuxt.config.ts` (`hooks: { 'content:file:beforeParse'(ctx){…} }`)
or a Nuxt module, and run during `nuxt build`/`nuxt prepare` — i.e. **build time**,
never in the prod request path.

**Alternative wiring (no Content hook):** a standalone **pre-build script**
(a sibling of `scripts/*.ts`, run before `nuxt build` in the gate) that scans the
content tree, renders each fenced mermaid block once, and writes the SVG (inline,
or to a cached `.svg` keyed by a hash of the diagram source so unchanged diagrams
skip re-render). This is the most transparent option and keeps the render step out
of Nuxt's internals; the hook approach is tidier if you want it to "just happen"
during parse.

**Downsides of build-time pre-render (be honest about them):**

- **The build now depends on a browser being present.** True — but it already is
  (CI + dev container ship Chromium + `playwright-core`), and this is the
  *opposite* container from the one the constraint protects. The dependency moves
  from prod (forbidden) to build (already satisfied).
- **CI ordering / cost.** Rendering must run before the SSG output is finalised,
  and launching Chromium per build costs seconds; a content-hash SVG cache makes
  incremental builds cheap.
- **Theming is baked at build** (one theme per SVG) unless mitigated — see §6.
- **Diagrams are frozen at build.** Fine for a static-content site (that's the
  premise); a runtime-authored diagram would not be covered (we have none).
- **Client interactivity is dropped.** The current renderer produces a static SVG
  anyway (no pan/zoom), so this is no regression.

---

## 6. Preserving theming and dark mode in a static SVG

The current component reads live `--diagram-*` CSS custom properties via
`getComputedStyle` and passes them to mermaid as `themeVariables`, so one render
adapts to the Tenant palette *and* to `prefers-color-scheme: dark`
(`app/components/MermaidDiagram.vue`). A pre-rendered SVG bakes **one** palette —
so we must make the baked SVG still reference CSS vars. What the sources support:

- Mermaid supports customising the **`base`** theme via **`themeVariables`**
  (`primaryColor`, `primaryBorderColor`, `primaryTextColor`, `lineColor`,
  `fontFamily`, `fontSize`, …) — *"the only theme that can be customized is the
  `base` theme"*
  (https://mermaid.js.org/config/theming.html, source
  `packages/mermaid/src/docs/config/theming.md`). It also accepts **`themeCSS`**, a
  string of **arbitrary CSS injected into the diagram's `<style>`** (the `themeCSS`
  config key is present in installed mermaid 11.16.0 `dist/`).
- **Caveat on putting `var(--x)` directly in `themeVariables`:** mermaid derives
  secondary colours from the primaries using **`khroma`** colour math
  (`node_modules/mermaid/package.json` → `khroma ^2.1.0`) — lighten/darken/mix
  operations that expect a *resolved* colour, not a `var(...)` token. Passing raw
  CSS vars as theme-variable *values* is therefore fragile (the derived-colour step
  can choke). So the robust pattern is **not** "feed vars into themeVariables."
- **Robust approach — post-process the emitted SVG.** Render once at build with
  concrete placeholder colours, then rewrite the SVG's baked palette to
  `var(--diagram-*, <fallback>)` references — either by using **`themeCSS`** to
  emit class-based rules whose colours are `var(--diagram-node-bg)` etc., or by a
  small post-render string/attribute pass that replaces the known baked hex values
  (and/or the `<style>` block mermaid injects) with `fill: var(--diagram-node-bg, #…)`
  and friends. Because SVG honours CSS custom properties and `currentColor`, the
  resulting static SVG **re-resolves against the live Tenant/dark-mode tokens in the
  browser** with no JS — exactly the adaptivity we have now, minus the 600 KB
  chunk. *(This last step is a reasoned engineering recommendation grounded in the
  themeCSS/CSS-var mechanics above, not a single documented mermaid feature — it
  should be prototyped and eyeballed in both light and dark before trusting it;
  verify against the rendered DOM per CLAUDE.md's "Verifying UI changes".)*

The mapping table already in `MermaidDiagram.vue` (`DIAGRAM_TOKENS`: mermaid
variable → `--diagram-*` CSS var) is the exact contract to reuse for the
post-processing rewrite, so the Tenant-token wiring is preserved rather than
reinvented.

---

## Comparison

| Option | Browser at prod runtime? | New dependency | Ships mermaid JS to client | Keeps mermaid syntax | Dark-mode adaptivity | Verdict for this repo |
| --- | --- | --- | --- | --- | --- | --- |
| **Build-time pre-render via existing `playwright-core` + pre-installed Chromium** (Content hook or pre-build script) | **No** | **None** (mermaid + playwright-core already present) | **None** | **Yes** | Yes, via §6 post-process | **Recommended** |
| `mermaid-isomorphic` at build time | No (build only) | `playwright` peer dep | None | Yes | Yes, via §6 | Good, but heavier dep than rolling it |
| `@mermaid-js/mermaid-cli` (`mmdc`) at build time | No (build only) | `puppeteer` peer dep | None | Yes | Yes, via §6 | Official; adds puppeteer + subprocess |
| Kroki (self-host or public) at build time | No (build only) | A running service / network | None | Yes | Yes, via §6 | Works but strictly more infra than local Chromium |
| Kroki as a prod service | **Yes, in a sidecar** | A Chrome-bearing container | None | Yes | Yes | Reintroduces a runtime browser (elsewhere) |
| `@viz-js/viz` (Graphviz WASM) | No | `@viz-js/viz` | None (or tiny) | **No** — DOT only | Yes, via §6 | Only if willing to change authoring syntax |
| jsdom / `svgdom` shims to run mermaid | No | jsdom/svgdom | — | Yes | — | **Not viable** — no real layout (§1/§3) |
| `@resvg/resvg-js` | No | resvg-js | None | Yes | **No** (raster) | Not a renderer choice; rasteriser only |
| Client-side (status quo) | No | — | **~600 KB+** | Yes | Yes | The thing we're replacing |

---

## Recommendation

**Pre-render mermaid diagrams to inline SVG at build time, using the repo's
already-present `playwright-core` driving the pre-installed Chromium (via
`resolveChromiumPath()`), with mermaid loaded in that build-time browser** — wired
either as a `content:file:beforeParse` hook that rewrites ` ```mermaid ` fences, or
as a standalone pre-build script with a content-hash SVG cache. Then **post-process
the emitted SVG to reference `var(--diagram-*)`** (§6) so dark-mode/Tenant theming
survives, and **replace `MermaidDiagram.vue`'s client `import('mermaid')` with a
component that just renders the baked SVG** (keeping the `<pre>` fallback for
render failures).

Why this one:

- **It fully sidesteps the hard constraint.** Prod ships static SVG and needs **no
  browser** — the browser dependency lives only in the build container, which
  already has Chromium + `playwright-core`.
- **Zero new dependencies.** Both mermaid (`^11.16.0`) and `playwright-core`
  (`^1.55.0`) are already in `package.json`; `scripts/chromium-path.ts` already
  resolves the browser. `mermaid-isomorphic` (adds `playwright`) and `mmdc` (adds
  `puppeteer`) do the *same* build-time browser render but each drags in a
  browser-automation dep the repo has deliberately avoided — and adding a
  dependency is itself an ADR-0004 human-only escalation, so "no new dep" is worth
  real points here.
- **Client JS drops to ~zero** for diagram pages (the ~600 KB mermaid chunk goes
  away), which is the whole objective.
- **Mermaid authoring syntax is preserved** — unlike `@viz-js/viz`, the only
  genuinely browserless *renderer*, which would force a switch to Graphviz DOT and
  drop most mermaid diagram types.

Fallback ranking if the DIY route is rejected: **`mermaid-isomorphic` at build
time** (it aligns with the repo's Playwright choice and exposes
`launchOptions.executablePath` for the pre-installed Chromium) ahead of **`mmdc`**
(official, but Puppeteer) ahead of **build-time Kroki** (more infra for no extra
capability). `@viz-js/viz` is the answer *only* if the project decides to change
diagram authoring to Graphviz DOT. jsdom/`svgdom` shims and `@resvg/resvg-js` are
not viable renderers for mermaid content (§1, §3).

Note there is a real trade-off to weigh — hard to reverse, a genuine cost — so
per the repo's ADR bar this decision likely earns an ADR if adopted: it changes how
diagram content is built (a build-time browser step) and moves the theming
mechanism from live JS to a static-SVG-plus-CSS-var scheme. Prototype §6's
dark-mode post-process and eyeball it in both themes (against the rendered DOM,
per CLAUDE.md's "Verifying UI changes") before committing.

---

## Sources

Primary sources — official docs, source repos, installed `node_modules`, and this
session's empirical tests (labelled inline):

- **Mermaid layout/getBBox dependency:** installed `mermaid` **11.16.0** —
  `node_modules/mermaid/dist/` references `.getBBox` 1302×/139 files,
  `.getComputedTextLength` 98× (this session); deps `d3`, `khroma`, `dompurify`
  (`node_modules/mermaid/package.json`). Maintainer position that a browser is
  required to precompute sizes: https://github.com/mermaid-js/mermaid/issues/3650,
  https://github.com/mermaid-js/mermaid/issues/559.
- **jsdom does no layout/rendering:**
  https://github.com/jsdom/jsdom#unimplemented-parts-of-the-web-platform and
  https://github.com/jsdom/jsdom#pretending-to-be-a-visual-browser.
- **mermaid-cli (`mmdc`):** Puppeteer peer dep —
  https://github.com/mermaid-js/mermaid-cli/blob/master/package.json; using an
  already-installed Chromium (`puppeteerConfigFile` `executablePath`,
  `PUPPETEER_SKIP_DOWNLOAD`) —
  https://github.com/mermaid-js/mermaid-cli/blob/master/docs/already-installed-chromium.md.
- **mermaid-isomorphic:** Playwright requirement —
  https://github.com/remcohaszing/mermaid-isomorphic#readme; `playwright` (optional)
  peer dep — https://github.com/remcohaszing/mermaid-isomorphic/blob/main/package.json;
  `launchOptions`/`executablePath` in the launcher —
  https://github.com/remcohaszing/mermaid-isomorphic/blob/main/src/mermaid-isomorphic.ts.
- **`@viz-js/viz` (Graphviz WASM, Node, DOT-only):**
  https://github.com/mdaines/viz-js.
- **`svgdom` text metrics need loaded fonts:**
  https://github.com/svgdotjs/svgdom#text-and-fonts.
- **`@resvg/resvg-js` is an SVG→PNG rasteriser:** https://github.com/yisibl/resvg-js.
- **Kroki mermaid companion = Node + Puppeteer + headless Chrome:**
  https://github.com/yuzutech/kroki/blob/main/mermaid/Dockerfile;
  Docker image https://hub.docker.com/r/yuzutech/kroki-mermaid.
- **Nuxt Content 3 hooks:** https://content.nuxt.com/docs/advanced/hooks; installed
  signatures `content:file:beforeParse` `{ file, collection, parserOptions }`
  (`node_modules/@nuxt/content/dist/module.mjs:1479-1480`) and
  `content:file:afterParse` `{ file, content, collection }` (`module.mjs:1518-1520`);
  afterParse body-manipulation discussion
  https://github.com/nuxt/content/issues/2502.
- **Mermaid theming:** https://mermaid.js.org/config/theming.html (source
  `packages/mermaid/src/docs/config/theming.md`) — `base`-theme `themeVariables`,
  `themeCSS`; `themeCSS` config key present in installed mermaid 11.16.0 `dist/`;
  `khroma ^2.1.0` colour math (`node_modules/mermaid/package.json`).
- **This repo's build-time browser capability:** `scripts/chromium-path.ts`
  (`resolveChromiumPath()` over `PLAYWRIGHT_BROWSERS_PATH`), `scripts/screenshot.ts`,
  `package.json` (`playwright-core ^1.55.0`, `mermaid ^11.16.0`,
  `@nuxt/content ^3.7.1`); current client renderer
  `app/components/MermaidDiagram.vue`.
