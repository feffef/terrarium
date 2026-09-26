# Tinkerfund: testing interactive flows in a Tenant's e2e module

Grounding note for issue #1360, written 2026-09-26. Tinkerfund is a planned
Tenant: a crowdfunding showcase shop with Spaces `prod` and `qa`. Its cart and
checkout are simulated in the browser and stored in tab-lifetime
`sessionStorage`, and `qa` pins "now" in content. The question: can its e2e
module drive real browser flows deterministically, inside the existing
single-build harness, without downloading a new browser?

**Sources.** playwright.dev and nuxt.com are blocked by this sandbox's egress
proxy (`EGRESS_BLOCKED`), so every API claim below was checked against the
installed package sources that implement those docs:
`playwright-core` 1.61.1 (`types/types.d.ts`), `@nuxt/test-utils` 3.23.0
(`dist/shared/*.mjs`), `vitest` 4.1.11 and `@vue/runtime-core` 3.5.42. Repo
claims cite the file they come from. Re-check against the official docs when
you can reach them.

## Answer

Yes. **The harness already supports this. No new dependency, no browser
download, and no second build.** Write `layers/tinkerfund/tests/e2e/tinkerfund.e2e.ts`
exporting `registerTinkerfundE2E()`, then add one import and one call in
`tests/e2e/smoke.spec.ts`. That is the ADR-0004 (2026-07-07 amendment) and
`tests/README.md` shape. Drive the flows with `createPage()` plus ordinary
Playwright locators (`click`, `fill`, `selectOption`), and assert with vitest's
`expect` / `expect.poll`. Point them at `/t/tinkerfund/qa/...`.

**The brief is slightly off.** Existing modules do more than check rendered
content, because interaction-driving tests already exist:
- `layers/blog/tests/e2e/blog.e2e.ts`: clicks links and dialog buttons,
  intercepts routes with `page.route`, and seeds `sessionStorage` with
  `page.addInitScript`.
- `layers/commons/tests/e2e/commons.e2e.ts`: types into search with
  `.fill('marquee')`, then polls the filtered result count.
- `layers/journal/tests/e2e/journal.e2e.ts`: clicks rows and checks
  `location.hash`.

Tinkerfund's flows follow the same patterns.

## Why it works

- **Every `createPage()` starts with a fresh `sessionStorage`.**
  `@nuxt/test-utils`' `createPage` calls `browser.newPage(options)`, and
  Playwright documents that call as one that "creates a new page in a new
  browser context. Closing this page will close the context as well"
  (`types.d.ts`, `Browser.newPage`). So each test starts with an empty cart,
  and tests can't leak state into each other through storage. Within one
  page, `page.reload()` keeps `sessionStorage`, as tab-lifetime storage should.
  That gives two cheap assertions: "cart survives a reload" and "a new tab has
  no cart".
- **Storage can be inspected or seeded directly.** `page.sessionStorage` is a
  `WebStorage` object with `getItem`, `setItem`, `items`, `removeItem` and
  `clear` in playwright-core 1.61. A "Reset demo" test can click the control
  and then assert the storage key is gone, not just that the UI looks empty.
  To seed state before the app boots (for example "already checked out"), use
  `page.addInitScript(() => sessionStorage.setItem(...))`, which blog already
  does.
- **Wait for hydration before interacting.** Use
  `page.goto(url(route), { waitUntil: 'hydration' })`, which waits until
  `window.useNuxtApp().isHydrating === false` (test-utils `waitForHydration`).
  A click that lands before hydration hits inert SSR markup. For
  client-side route changes such as cart → checkout → confirmation, either
  poll with `waitForFunction(() => location.pathname.endsWith(...))`, as blog
  does. Avoid test-utils' `waitUntil: 'route'`: it compares
  `_route.fullPath` (a path) with the argument given to `goto`, which here is
  the absolute `url(...)`. Whether those ever match is unverified.
- **Catch errors for free.** Start from `renderAndCollectErrors(route)`
  (`tests/support/e2e.ts`) so every flow also asserts no console or page
  errors. That matters for timing (next section).
- **Use vitest assertions, not Playwright's.** Playwright's own matchers
  (`toBeVisible` etc.) don't run here (`tests/README.md`). `expect.poll`
  defaults to a 1000 ms timeout, so raise it per call for any transition.

## Clock strategy

**Rely on the content-pinned "now", and make the app read it from one
SSR-stable source. Browser clock control is optional. Use it for at most one
test of live ticking, never as the main mechanism.**

1. **`page.clock` only controls the browser.** `Clock` is installed per
   `BrowserContext` and fakes `Date`, the timers, `requestAnimationFrame` and
   `performance` inside the page (`types.d.ts`, `Clock`). The Nitro server
   that `setup()` starts runs in Node and keeps real time, so SSR would still
   render a countdown from the real clock. Only a "now" read from content
   controls **both** sides.
2. **A disagreement between server and client "now" fails the gate, not just
   a test.** The production Vue build logs
   `console.error("Hydration completed but contains mismatches.")`
   (`runtime-core.cjs.prod.js`). The smoke's error listeners assert that
   stays empty. So Tinkerfund's `useNow()` should work like Atlas's
   `useGlassToday()` (`layers/atlas/app/composables/almanac.ts`):
   - compute "now" once on the server,
   - carry it to the client with `useState`,
   - in `qa`, source it from the pinned content value,
   - start any live ticking only after mount.

   This applies to `prod` too, because `prod`'s entry route is already
   hydrated by the platform sweep (`entryRoutes`) against the real clock.
3. **Freeze `qa`'s "now" instead of ticking from it.** Then the countdown
   and funded/ended states are pure functions of content, and no browser
   clock is needed. If the ticking itself needs a test, use one test that
   calls `page.clock.install({ time: pinnedNow })` **before** `goto`, then
   `runFor(...)`. Playwright recommends installing before navigation
   (`Clock.pauseAt` docs): pausing time or faking `setTimeout`/rAF too early
   can stall page load and Nuxt transitions. Prefer `install` + `runFor` over
   `setFixedTime` whenever timers must fire.

## Gate cost (ADR-0004)

- **No build or download cost.** The module runs under the smoke spec's one
  `setup()`, so there is no extra `nuxt build`. Chromium comes from
  `PLAYWRIGHT_BROWSERS_PATH` (`scripts/chromium-path.ts`). CI already
  provisions it (`gate.yml`: `playwright-core install chromium`), so
  Tinkerfund adds nothing there. Don't reach for
  `@nuxt/test-utils/playwright`: it imports `@playwright/test`, which isn't
  installed, so it would be a new dependency and a human-only escalation
  under ADR-0004's 2026-07-06 amendment.
- **The cost is per-test wall time.** Tests in the one spec file run
  serially. Each flow costs a new context, a navigation, hydration, and
  `networkidle` (roughly hundreds of ms to a few seconds). One session log
  recorded the whole e2e run at about 58 s (2026-07-11,
  `layers/journal/content/archived/sessions/2026-07-11-session_012MgmwGad8fk8B9r6Ah3ut6.yml`).
  That is a single anecdote, not a benchmark.
- **Keep the flow tests few and wide.** Aim for about 4–6 tests: one
  add → checkout → confirm journey on a single page, one filter test, one
  Reset demo test, one reload/new-tab persistence check, and one
  countdown/funded state check. That beats many narrow tests.
- **Watch the `qa` entry route.** It is swept automatically, so an
  unhydratable countdown fails there first.
- **Local runs.** The heavy layers (including `test:e2e`) run under
  `gate:scoped` whenever `layers/` changes, so a Tinkerfund PR always pays
  for them locally.
