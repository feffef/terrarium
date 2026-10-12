// L2 — Platform entry-route sweep (ADR-0004), odd half: every (Tenant, Space)
// entry route returns 200, renders content, and — in a REAL browser — hydrates
// with no console/page errors. The target list is derived from the manifests
// (ADR-0014), so new Spaces are covered automatically. The list is split by
// index parity over entry-routes-even.spec.ts and entry-routes-odd.spec.ts so
// the two halves run in parallel; together they cover every route.
//
// Every e2e spec calls `setupL2()` and never builds. The one build is the gate's
// `pnpm build`; the e2e project's globalSetup (tests/support/e2e-global-setup.ts)
// reuses it and builds only if `.output` is stale (ADR-0004 amendment; tests/README.md).
//
// A real browser (`createPage`) loads each route: the server-rendered document
// is checked from the navigation's response, and the client bundle actually
// executes. That is the half CLAUDE.md warns a string match on SSR HTML cannot
// prove — uncaught errors and hydration throws surface as console.error /
// pageerror, which the listeners assert stay empty.
import { describe, it } from 'vitest'
import { entryRoutes, expectCleanHydration, setupL2 } from '../support/e2e.ts'

describe('L2 entry routes (odd half)', async () => {
  await setupL2()

  describe('entry routes', () => {
    // Every entry route is loaded in Chromium. The navigation's server-rendered
    // document must be 2xx with an <h1> and not the 404 page; then the client
    // bundle runs and we assert (a) an <h1> exists in the *rendered DOM*, (b)
    // nothing logged a console error or threw during hydration, and (c) no
    // unresolved auto-import component silently rendered as an unknown custom
    // element (issue #212) — vue-tsc and (a)/(b) all stay green on that failure
    // mode, so it needs its own assertion.
    for (const route of entryRoutes.filter((_, i) => i % 2 === 1)) {
      it(`hydrates ${route} in a browser with no console/page errors`, async () => {
        await expectCleanHydration(route)
      })
    }
  })
})
