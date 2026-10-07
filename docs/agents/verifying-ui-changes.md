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

The rest of this doc is the *methodology*: what proves a change, and what only
looks like proof.

**Browser facts verified against** (from `node_modules`, re-check if they've
moved): `playwright-core` **1.63.0**, `nuxt` **4.5.2**. Entries that came from a
specific session cite it.

## The methodology

- **Grepping SSR HTML is not proof a change renders.** The server-rendered
  output includes a serialized `useAsyncData` payload — a string match there can
  succeed even when the actual DOM never picks up the change (or errors trying
  to). Verify presentational changes against the **rendered DOM**, not the raw
  HTML text — take a screenshot with `scripts/screenshot.ts`, or drive the page
  with Playwright.
- **When a standalone repro of the logic agrees with expectations but the live
  app doesn't, render the computed value into the DOM (a debug marker)
  immediately** — don't iterate cache-busting/rebuild theories first. A stale
  build can look identical to a live logic bug from the outside; a debug marker
  settles which one you're looking at in one step.
- **Before asserting an e2e/Playwright failure is "pre-existing" or
  "environment-only," reproduce it with the full `test:e2e` suite — never a
  `-t`-filtered single test — against a fresh `pnpm build` — never a reused
  `.output` — on both `origin/main` and the branch.** A narrowed or stale
  repro is not a valid comparison: a single filtered test skips setup/ordering
  the full suite exercises, and a reused `.output` can quietly omit the very
  change under test. A PR once asserted a failing assertion was pre-existing
  on exactly this kind of invalid repro, and CI then failed for real on the
  same assertion (issue #907).
- **For the common case of checking one already-serving in-page value** (a
  computed style, a bounding rect, any other value read via `page.evaluate`),
  reach for `scripts/probe.ts` before writing an ad-hoc script — it already
  handles the gotchas below:
  `pnpm exec tsx scripts/probe.ts <url> "<js-expression>"`, e.g.
  `pnpm exec tsx scripts/probe.ts http://localhost:3000/t/journal/current "getComputedStyle(document.querySelector('.foo')).color"`.
- **To verify a click/interaction, not just a static render**, write a small
  ad-hoc `playwright-core` script against the same pre-installed Chromium
  `scripts/screenshot.ts` uses — import `resolveChromiumPath()` from
  `scripts/chromium-path.ts` rather than re-deriving the `PLAYWRIGHT_BROWSERS_PATH`
  lookup by hand, and launch it with `chromium.launch({ executablePath: resolveChromiumPath() })`.
  Three gotchas: (1) `tsx` runs the ad-hoc script as CJS, so wrap top-level `await`
  in an `async` IIFE; (2) write the script **inside the repo tree** so its imports
  resolve against `node_modules` (any devDependency used in an ad-hoc script —
  `playwright-core`, `yaml`, etc. — is scoped to this repo's `node_modules`, not
  global); (3) pass `page.evaluate(...)` its body as a **string**, not a function
  reference — `tsx`/esbuild's `keepNames` transform injects a `__name` helper into
  a compiled function that only exists in the Node/tsx context, so a function
  reference throws `__name is not defined` inside the browser page.
- **A screenshot can't be trusted to rule out a subtle/scoped CSS change** —
  downscaled or compressed PNGs can mask a style that actually applied. Before
  concluding a scoped style is missing, probe the element's *computed* style
  with the same `playwright-core` pattern above, e.g.
  `page.$eval(selector, el => getComputedStyle(el).propertyName)`. A screenshot
  confirms a render happened; computed-style probing confirms a *specific* style
  took effect.
- **The journal Space landing is a custom dashboard, not a Markdown render** —
  see `layers/journal/CONTEXT.md`'s "What lives where" for what it renders.
  Editing `index.md` alone will not change what most of that page shows; check
  the `.vue` file too.
- **A `display: none` (or equivalent hide-at-breakpoint) rule that hides the
  only rendering of real content/data is a design smell to justify, not a
  default to ship silently.** Before shipping one, check whether it hides
  purely decorative/redundant markup (fine) or the sole rendering of some
  actual data (e.g. a dataset dimension with no other place it appears at
  that breakpoint) — if the latter, call it out explicitly in the PR
  description: why it's acceptable for that data to disappear at this
  breakpoint, or where it reappears instead.

## The sharp edges

Each of these is documented, intended behaviour that surprises on first contact
and has cost a confused bisection round.

### Visibility is not in-viewport

`locator.isVisible()` / `state: 'visible'` is true for an element that has a
non-empty box and isn't `display:none`/`visibility:hidden` — **even when it's
scrolled off-screen**. Proving something is actually *in the viewport* needs an
explicit `getBoundingClientRect()`-vs-viewport check, not a visibility
assertion. (Session `…ysCUut`.)

### `locator.click()` scrolls the element into view first

Playwright's actionability checks scroll the target into view before dispatching
the click. So a test that measures exact geometry *around* a click is measuring
a post-scroll layout, not the one the user saw. Call `scrollIntoViewIfNeeded()`
yourself first (or account for the scroll) when the geometry matters. (Session
`…q1cMNn`.)

### `screenshot({ clip })` is viewport-relative unless `fullPage: true`

`page.screenshot({ clip })` interprets `clip` coordinates against the **viewport
origin**, not the document origin — unless you also pass `fullPage: true`. On a
scrolled or tall page, `clip` alone silently captures the wrong region. Pass
`fullPage: true` with `clip` when clipping below the fold. (Session `…CnKWrh`.)

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
- **A green production `preview` probe is not proof a hydration-mismatch or
  Vue dev-warning fix worked.** Those diagnostics are Vue dev-only and are
  compiled out of production builds entirely, so a clean production run is
  consistent with *either* "actually fixed" or "warning can't appear in this
  build mode regardless." Verify this class of fix against a `--dev` build
  instead (or in addition), checking the actual console/warning output.

### `<ClientOnly>` attaches its slot DOM *after* `onMounted`

Nuxt's `<ClientOnly>` renders its default slot only once its own `mounted` ref
flips to `true`, which happens *in* its `onMounted` — so the slot's DOM attaches
on the render *after* both child and parent `onMounted` fire (confirmed in
`nuxt/dist/app/components/client-only.js`: `mounted` starts `false`, flips in
`onMounted`, and the default slot is returned only when `mounted.value`). A
parent `onMounted` that reads a `ref` pointing *inside* a `<ClientOnly>` slot
therefore reads `null`. Drive the render from
`watch(theRef, …, { immediate: true })` instead, so it fires when the ref
actually attaches. (Session `…pm7Vkb` — a Mermaid diagram that rendered blank
because its container ref was null in `onMounted`.)

## CSS sharp edges

Each cost a session at least one extra fix-and-check round.

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

- **How to verify a UI change actually works**: drive the affected flow
  yourself and observe behavior before committing — this doc is the
  browser/UI-specific reference for that.
- `docs/agents/tenant-layers.md` — Nuxt-layer render gotchas (auto-imports,
  alias resolution, Platform-wide component overrides, scoped-CSS token
  inheritance).
