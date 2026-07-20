# Verifying UI changes

How to actually confirm a presentational change works in this repo — and the
Playwright/Chromium/client-only sharp edges that make "it looked fine" or "the
test passed" untrustworthy. Read this before eyeballing a render, debugging a
layout bug, or asserting a style took effect.

The *how-to-capture* tooling — `scripts/preview.ts` (`shot`/`start`/`stop`) and
`scripts/screenshot.ts` — lives in CLAUDE.md's self-verification section. This
doc is the *methodology*: what proves a change, and what only looks like proof.

**Browser facts verified against** (from `node_modules`, re-check if they've
moved): `playwright-core` **1.61.1**, `nuxt` **4.4.8**. Entries that came from a
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
- **To verify a click/interaction, not just a static render**, write a small
  ad-hoc `playwright-core` script against the same pre-installed Chromium
  `scripts/screenshot.ts` uses — import `resolveChromiumPath()` from
  `scripts/chromium-path.ts` rather than re-deriving the `PLAYWRIGHT_BROWSERS_PATH`
  lookup by hand, and launch it with `chromium.launch({ executablePath: resolveChromiumPath() })`.
  Two gotchas: (1) `tsx` runs the ad-hoc script as CJS, so wrap top-level `await`
  in an `async` IIFE; (2) write the script **inside the repo tree** so its imports
  resolve against `node_modules` (any devDependency used in an ad-hoc script —
  `playwright-core`, `yaml`, etc. — is scoped to this repo's `node_modules`, not
  global).
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
  shot` defaults to a 2s `--virtual-time-budget` wait and supports
  `--wait-for <selector>`; use the selector wait when you know the element you're
  waiting on. Chromium's `--virtual-time-budget=<ms>` is the headless-native
  "advance timers up to N ms, then capture" primitive underneath.
- **A cold `--dev` server** compiles routes on demand, so the first shot of a
  route can catch a half-built page and read as a false-positive layout bug.
  Prefer built `preview` mode (or a selector wait) before trusting a `--dev`
  screenshot for diagnosis. (Sessions `…pm7Vkb`, `…Bhu3Y1`.)

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

## See also

- The built-in **`verify`** skill — the general "drive the affected flow and
  observe behavior before committing" affordance; this doc is its browser/UI
  reference. If UI verification ever needs codified *steps* rather than this
  reference alone, `verify` bootstraps a repo-owned project verify skill that
  would disclose to this file.
- CLAUDE.md's self-verification section — how to *capture* a render
  (`scripts/preview.ts`, `scripts/screenshot.ts`) and the DevTools-overlay
  caveat for `--dev` shots.
- `docs/agents/tenant-layers.md` — Nuxt-layer render gotchas (auto-imports,
  alias resolution, Platform-wide component overrides, scoped-CSS token
  inheritance).
