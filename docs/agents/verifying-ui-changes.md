# Verifying UI changes

How to actually confirm a presentational change works in this repo — and the
Playwright/Chromium/client-only sharp edges that make "it looked fine" or "the
test passed" untrustworthy. Read this before eyeballing a render, debugging a
layout bug, or asserting a style took effect.

## Capture tooling

- **One screenshot:** `pnpm exec tsx scripts/preview.ts shot <route> <out.png> [WxH] [--dev] [--scheme light|dark]`.
  It starts a server on its own port, takes the shot and stops the server, so
  there is nothing to `pkill` (issue #240). By default it serves the production
  build (run `pnpm build` first). `--dev` is faster, but its DevTools overlay
  badge can cover real content and look like a UI bug. `WxH` sets the window
  size; a `#anchor` in `<route>` scrolls to an element.
- **A server that stays up:** `scripts/preview.ts start [--dev]` prints `PID=`
  and `URL=`; `scripts/preview.ts stop <pid>` stops it (always exits 0).
- **A URL that is already serving:** `scripts/screenshot.ts <url> <out.png> [WxH]`
  drives the pre-installed Chromium directly.

**Browser facts verified against** (from `node_modules`, re-check if they've
moved): `playwright-core` **1.64.0**, `nuxt` **4.6.1**. Entries that came from a specific session cite it.

## The methodology

- **A grep of SSR HTML does not prove a change renders.** The HTML includes a
  serialized `useAsyncData` payload, so a string match can succeed even when the
  DOM never picks up the change (or errors trying). Check the **rendered DOM**:
  take a screenshot with `scripts/screenshot.ts`, or drive the page with
  Playwright.
- **If a standalone repro of the logic matches expectations but the live app
  doesn't, immediately render the computed value into the DOM (a debug
  marker);** don't iterate cache-busting/rebuild theories first. A stale build
  looks like a live logic bug from outside, and the marker tells them apart in
  one step.
- **Before calling an e2e/Playwright failure "pre-existing" or
  "environment-only," reproduce it on both `origin/main` and the branch** with the
  full `pnpm test:e2e` suite, never a `-t`-filtered single test: a filtered test
  skips setup and ordering the full suite exercises (rebuild rules:
  `tests/README.md`). A PR once called a
  failing assertion pre-existing on a narrowed or stale repro, and CI then failed
  for real on it (issue #907).
- **To read one in-page value from an already-serving page** (a computed style,
  a bounding rect, any `page.evaluate` result), use `scripts/probe.ts` before an
  ad-hoc script; it handles the gotchas below:
  `pnpm exec tsx scripts/probe.ts <url> "<js-expression>"`, e.g.
  `pnpm exec tsx scripts/probe.ts http://localhost:3000/t/journal/current "getComputedStyle(document.querySelector('.foo')).color"`.
- **To verify a click/interaction, not just a static render**, write a small
  ad-hoc `playwright-core` script and launch the pre-installed Chromium
  `scripts/screenshot.ts` uses with
  `chromium.launch({ executablePath: resolveChromiumPath() })`, importing
  `resolveChromiumPath()` from `scripts/chromium-path.ts` (don't re-derive the
  `PLAYWRIGHT_BROWSERS_PATH` lookup). Three gotchas: (1) `tsx` runs it as CJS,
  so wrap top-level `await` in an `async` IIFE; (2) write it **inside the repo
  tree** so imports resolve against this repo's `node_modules`
  (`playwright-core`, `yaml` and other devDependencies aren't global); (3) pass
  `page.evaluate(...)` its body as a **string**: `tsx`/esbuild's `keepNames`
  injects a `__name` helper that exists only in Node, so a function reference
  throws `__name is not defined` in the page.
- **A screenshot can't be trusted to rule out a subtle/scoped CSS change:**
  downscaled or compressed PNGs can mask a style that actually applied. Before
  concluding a scoped style is missing, read the element's *computed* style
  with `scripts/probe.ts` (above).
- **A diagram, illustration or layout from a brief needs the human's eye first.**
  Agree the reader and the question it answers, and show a rough draft for a
  quick reaction before you polish and publish. Passing gates is necessary, not
  sufficient.
- **The journal Space landing is a custom dashboard, not a Markdown render** —
  see `layers/journal/GLOSSARY.md`'s "What lives where" for what it renders.
  Editing `index.md` alone will not change what most of that page shows; check
  the `.vue` file too.
- **Before shipping a `display: none` (or hide-at-breakpoint) rule, check what
  it hides.** Decorative or redundant markup is fine. If it hides the only
  rendering of real data (e.g. a dataset dimension with no other place at that
  breakpoint), say in the PR description why losing it there is acceptable, or
  where it reappears.

## The sharp edges

Each is documented, intended behaviour, not a bug.

### Visibility is not in-viewport

`locator.isVisible()` / `state: 'visible'` is true for any element with a
non-empty box that isn't `display:none`/`visibility:hidden`, **even when
scrolled off-screen**. To prove it is in the viewport, compare
`getBoundingClientRect()` against the viewport. (Session `…ysCUut`.)

### `locator.click()` scrolls the element into view first

Playwright's actionability checks scroll the target into view before the click,
so geometry measured around a click is post-scroll, not what the user saw. When
geometry matters, call `scrollIntoViewIfNeeded()` yourself first (or account for
the scroll). (Session `…q1cMNn`.)

### `screenshot({ clip })` is viewport-relative unless `fullPage: true`

`clip` is read against the **viewport origin**, not the document, unless you
also pass `fullPage: true`; on a scrolled or tall page it silently captures the
wrong region, so pass `fullPage: true` when clipping below the fold. (Session `…CnKWrh`.)

### Desktop Chromium ignores the page's `<meta name="viewport">`

Playwright's `viewport` option (`newPage({ viewport })`) sizes the CSS layout
viewport **directly**; the page's own `<meta name="viewport">` is a
mobile-emulation input and is ignored in an ordinary desktop launch. So a
"missing viewport meta" theory for a mobile-overflow bug is usually a dead end
once you've confirmed the tag is present — reproduce the narrow width by setting
the viewport via the driver instead. (Session `…Bhu3Y1`.) **Don't reach for a
`--window-size` launch arg as an equivalent** — it leaves a Chromium
chrome/viewport offset uncompensated and ships a frame shorter than requested;
`scripts/screenshot.ts` hit exactly this and switched to `newPage({ viewport })`
(issue #575).

### A screenshot needs a wait; the shutter can fire pre-render

A screenshot captures whatever frame exists *now*. Two ways the frame is empty:

- **Async client-only content** (e.g. any Nuxt Content body that loads
  post-hydration) may not have rendered yet. `scripts/preview.ts
  shot` defaults to a 2s wait (`--wait <ms>`) and supports
  `--wait-for <selector>`; use the selector wait when you know the element you're
  waiting on.
- **A cold `--dev` server** compiles routes on demand, so the first shot of a
  route can catch a half-built page and read as a false-positive layout bug.
  Prefer built `preview` mode (or a selector wait) before trusting a `--dev`
  screenshot for diagnosis. (Sessions `…pm7Vkb`, `…Bhu3Y1`.)

### A green production `preview` probe doesn't prove a dev-warning fix

Hydration-mismatch and other Vue dev warnings are compiled out of production
builds, so a clean production run can't tell "fixed" from "can't appear in
this build mode." Verify such a fix against a `--dev` build (instead or as
well), checking the actual console/warning output.

### `<ClientOnly>` attaches its slot DOM *after* `onMounted`

Nuxt's `<ClientOnly>` returns its default slot only once its own `mounted` ref
flips to `true` in its `onMounted` (`nuxt/dist/app/components/client-only.js`),
so the slot's DOM attaches on the render *after* both child and parent
`onMounted` fire. A
parent `onMounted` that reads a `ref` pointing *inside* a `<ClientOnly>` slot
therefore reads `null`. Drive the render from
`watch(theRef, …, { immediate: true })` instead, so it fires when the ref
actually attaches. (Session `…pm7Vkb` — a Mermaid diagram that rendered blank
because its container ref was null in `onMounted`.)

## CSS sharp edges

- **Media-query order:** an equal-specificity rule inside `@media` loses to a
  later base rule. Put the override after it (#1312).
- **Overrides live elsewhere:** a component's narrow-screen rules may sit in
  the layer's `theme.css`, not its own `<style>`. Grep repo-wide before
  renaming a class (#1434).
- **Scoped classes reach child roots:** a parent's scoped `.filters` also
  styles a child component whose root has class `filters` (#1522).
- **Scroll fades:** an absolutely positioned fade inside a scroller scrolls
  away with the content; put `mask-image` on the scroller instead (#1476).
- **SVG `viewBox`:** CSS can hide SVG parts at a breakpoint but can't change
  the `viewBox`; crop it from JS with `matchMedia` (#1494).
- **GPU-only bugs:** a translucent full-page background can band on some phone
  GPUs, and headless Chromium can't reproduce driver bugs. Prefer opaque page
  backgrounds (#1506).
- **Sticky/scroll-dependent layouts:** a static shot hid a broken one. Scroll,
  then assert bounding boxes after `scrollTo`.

## See also

- Drive the affected flow yourself and observe the behavior before committing;
  this doc is the browser/UI reference for that.
- `docs/agents/tenant-layers.md` — Nuxt-layer render gotchas (Platform-wide
  component overrides, scoped-CSS token inheritance); auto-imports and alias
  resolution are in `.claude/rules/tenant-layers.md`.
