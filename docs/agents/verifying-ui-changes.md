# Verifying UI changes

Goal: confirm a presentational change works in the rendered page. A passing
test, a grepped HTML string or a glance at a screenshot is not proof. Read this
before you check a render, debug a layout or assert a style took effect.

## Capture tooling

Scripts are not executable: run `pnpm exec tsx scripts/ui/<file>.ts` (flags: each
script's `USAGE`).

- **The deployed site (terrarium.feffef.de) is blocked in cloud sessions** (the
  proxy answers 403). Review a local build: `pnpm build`, then `preview.ts shot`
  or `preview.ts review`.
- **One screenshot:** `preview.ts shot <route>`. It starts and stops its own
  server (nothing to kill, issue #240) and serves the production build by
  default. A `#anchor` in `<route>` scrolls to it.
- **`--dev`** needs no build and suits samples for the owner. Its DevTools badge
  can cover real content, and it can serve stale layer utils or CSS. For a
  diagnosis or a trusted shot, `pnpm build` and shoot the build.
- **Several shots of one task:** `preview.ts start --dev` once (prints `PID=` and
  `URL=`), then `screenshot.ts <url> <out.png> [WxH]` per shot, then
  `preview.ts stop <pid>`. After an edit, curl the URL until 200 and wait for
  HMR before reshooting.
- **A page review:** `preview.ts review` writes four full-page shots (desktop and
  mobile, light and dark).
- **One in-page value** (a computed style, a bounding rect, any `page.evaluate`
  result) from a serving page: `eval-in-page.ts`, before an ad-hoc script.
- **A click or other interaction:** write a small `playwright-core` script in
  `.throwaway/` that starts Chromium with `launchChromium()` from
  `scripts/lib/chromium.ts` (it finds the browser and adds this sandbox's flags).
  Pass `page.evaluate` its body as a **string**: a function reference throws
  `__name is not defined` in the page (esbuild injects a helper that exists only
  in Node).

These facts hold for the `playwright-core` and `nuxt` versions in
`package.json`; re-check them after a bump.

## Method

- **Drive the affected flow and observe it before you commit.**
- **Check the rendered DOM, not SSR HTML.** The HTML carries a serialized
  `useAsyncData` payload, so a string match can pass when the DOM never picks the
  change up. Take a screenshot or drive the page.
- **A standalone repro passes but the live app doesn't:** render the computed
  value into the DOM as a debug marker at once. It tells a stale build from a
  logic bug in one step; don't iterate cache-busting theories first.
- **Before you call an e2e failure "pre-existing" or "environment-only,"**
  reproduce it on both `origin/main` and the branch with the full
  `pnpm test:e2e`, never a `-t`-filtered test (it skips setup the full suite
  runs; issue #907; rebuild rules: `tests/README.md`).
- **A screenshot can't confirm a colour, tint or scheme fix:** compressed PNGs
  hide an applied style and a grey passes for a tint. Read the element's
  *computed* colour with `eval-in-page.ts` before you report the fix (or accept a
  subagent's "green"), and pin it with an e2e assert.
- **A screenshot can't confirm text fits a fixed width** (tiles, badges,
  fixed-width columns): this Linux build's fallback fonts are narrow. Force a
  wider font (DejaVu Serif or Sans Mono), then compare `scrollWidth` with
  `clientWidth` with `eval-in-page.ts`; ideally pin it with an e2e assert.
- **A diagram, illustration or layout from a brief needs the owner's eye first:**
  agree the reader and the question it answers, and show a rough draft before you
  polish. Passing gates is necessary, not sufficient.
- **A Space landing may be a custom `.vue` dashboard,** so editing `index.md` may
  not change the page. Check the layer's `app/pages/` and its glossary's "What
  lives where".
- **Before a `display: none` (or hide-at-breakpoint) rule,** check what it hides.
  If it hides the only rendering of real data at that breakpoint, say in the PR
  why losing it there is acceptable, or where it reappears.

## The sharp edges

Each is documented, intended behaviour, not a bug.

### Visibility is not in-viewport

`isVisible()` is true for any element with a non-empty box that isn't hidden,
even when scrolled off-screen. To prove it is in the viewport, compare
`getBoundingClientRect()` with the viewport.

### `locator.click()` scrolls the element into view first

Geometry measured around a click is post-scroll, not what the user saw. When it
matters, call `scrollIntoViewIfNeeded()` yourself first.

### `screenshot({ clip })` is viewport-relative unless `fullPage: true`

On a scrolled or tall page, `clip` silently captures the wrong region; pass
`fullPage: true` when you clip below the fold.

### Desktop Chromium ignores the page's `<meta name="viewport">`

`newPage({ viewport })` sizes the layout viewport directly, so a "missing
viewport meta" theory for a mobile-overflow bug is usually a dead end: set the
width in the driver to reproduce it. Don't use a `--window-size` launch arg
instead: it ships a frame shorter than requested (issue #575).

### A screenshot needs a wait

It captures whatever frame exists now.

- **Async client-only content** (e.g. a Nuxt Content body loaded after
  hydration) may not have rendered. `preview.ts shot` waits for it (`--wait`,
  `--wait-for`); use the selector wait when you know the element.
- **A `--dev` server** compiles routes on demand, so an early frame can look
  like a layout bug. Use a selector wait, or a built preview, before you
  diagnose from it.

### A green production probe doesn't prove a dev-warning fix

Hydration-mismatch and other Vue dev warnings are compiled out of production
builds. Verify such a fix against a `--dev` build and read the console output.

### `<ClientOnly>` attaches its slot DOM *after* `onMounted`

The slot renders only after `<ClientOnly>`'s own `onMounted`, so a parent
`onMounted` that reads a `ref` inside the slot gets `null`. Drive the work from
`watch(theRef, …, { immediate: true })` (a Mermaid diagram once rendered blank
this way).

## CSS sharp edges

- **Media-query order:** an equal-specificity rule inside `@media` loses to a
  later base rule. Put the override after it (#1312).
- **Overrides live elsewhere:** a component's narrow-screen rules may sit in the
  layer's `theme.css`. Grep repo-wide before renaming a class (#1434).
- **Scoped classes reach child roots:** a parent's scoped `.filters` also styles
  a child whose root has class `filters` (#1522).
- **Scroll fades:** an absolutely positioned fade inside a scroller scrolls away
  with the content; put `mask-image` on the scroller (#1476).
- **SVG `viewBox`:** CSS can hide SVG parts at a breakpoint but can't change the
  `viewBox`; crop it from JS with `matchMedia` (#1494).
- **GPU-only bugs:** a translucent full-page background can band on some phone
  GPUs and headless Chromium can't reproduce it. Prefer opaque backgrounds
  (#1506).
- **Sticky or scroll-dependent layouts:** a static shot hid a broken one. Scroll,
  then assert bounding boxes after `scrollTo`.

## See also

`docs/agents/tenant-layers.md` — Nuxt-layer render gotchas; auto-imports and
alias resolution are in `.claude/rules/tenant-layers.md`.
