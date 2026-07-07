// L2 — Smoke render (ADR-0004): every (Tenant, Space) entry route returns 200,
// renders content, and — in a REAL browser — hydrates with no console/page
// errors. The target list is derived at build time from the manifests
// (ADR-0014), so new Spaces are covered automatically.
//
// Two layered tiers, cheapest-first (the gate's own design principle, ADR-0004):
//   Tier 1 — fast SSR `$fetch`: the route serves 200, the server-rendered HTML
//            carries the expected structure, and isolation leaks are caught in
//            the payload (presence in the payload IS a leak regardless of render).
//   Tier 2 — real browser (`createPage`): the client bundle actually executes.
//            This is the half CLAUDE.md warns a string match on SSR HTML cannot
//            prove. Two error classes are covered together:
//              • Uncaught errors (bad client-only code, `window`/`document`
//                misuse, third-party throws) → console.error / pageerror, which
//                the listeners below assert stay empty.
//              • A throw inside a Vue lifecycle hook is caught by Vue and, since
//                Nuxt registers its own errorHandler, is *silent* on the console
//                in a production build — but it breaks client reactivity, so the
//                expand-on-click interaction (which needs a working client to
//                mount the digest body) fails. That interaction is the load-
//                bearing proof the client truly rendered: an <h1> alone can be
//                the SSR DOM persisting through a failed hydration.
//
// The browser is located, not resolved by playwright's own pinned revision:
// first a Chromium under PLAYWRIGHT_BROWSERS_PATH (the agent sandbox's
// pre-installed build, or the one CI provisions there), then the system
// Chrome/Chromium. Both lookups are single-homed in scripts/chromium-path.ts,
// shared with scripts/screenshot.ts and ad-hoc probes (issue #202). CI pins a
// Playwright-managed Chromium via the first path for determinism; the
// system-Chrome fallback keeps every other environment provisioning-free
// (issue #97).
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, createPage, setup, url } from '@nuxt/test-utils/e2e'
import { entryRoutesFrom, expand, loadManifests } from '../../shared/expand.ts'
import { findPreinstalledChromium, findSystemChrome } from '../../scripts/chromium-path.ts'

const entryRoutes = entryRoutesFrom(expand(loadManifests()))

const chromiumPath = findPreinstalledChromium() ?? findSystemChrome()

/**
 * Navigate to `route` in a fresh page, capturing every console *error* and
 * uncaught page error from before navigation until the network settles. Returns
 * the page (for DOM assertions) and the collected error strings.
 */
async function renderAndCollectErrors(route: string) {
  const errors: string[] = []
  // Un-navigated page (createPage() with no path skips its own goto), so the
  // listeners are attached BEFORE the client bundle runs and can see hydration
  // errors that fire on first paint.
  const page = await createPage()
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(`console.error: ${msg.text()}`)
  })
  page.on('pageerror', (err) => {
    errors.push(`pageerror: ${err.message}`)
  })
  // waitUntil: 'hydration' blocks until Nuxt reports isHydrating === false, so a
  // throw during hydration surfaces as a pageerror we then assert on.
  await page.goto(url(route), { waitUntil: 'hydration' })
  await page.waitForLoadState('networkidle')
  return { page, errors }
}

describe('L2 smoke render — entry routes', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../..', import.meta.url)),
    browser: true,
    browserOptions: {
      type: 'chromium',
      launch: {
        ...(chromiumPath ? { executablePath: chromiumPath } : {}),
        args: ['--no-sandbox', '--disable-gpu'],
      },
    },
  })

  // ── Tier 1: fast SSR checks (cheap first tier) ──────────────────────────────
  for (const route of entryRoutes) {
    it(`renders ${route}`, async () => {
      const html = await $fetch(route) // throws on non-2xx
      expect(html).toMatch(/<h1[ >]/)
      expect(html).not.toContain('No document at')
    })
  }

  // The journal Tenant's layer replaces the generic Space landing with an
  // overview dashboard (state + recent activity + Skill Inventory).
  it('renders the journal overview dashboard', async () => {
    const html = await $fetch('/t/journal/current')
    expect(html).toContain('Recent activity')
    expect(html).toContain('Friction signal')
    expect(html).toContain('Platform Skills')
  })

  // Session cards are expand-on-click disclosures — sessions are a `data`
  // collection with no route of their own, so the full log is revealed inline.
  // Assert the control is wired (SSR-collapsed) and the detail data is delivered.
  it('renders session cards as expandable disclosures', async () => {
    const html = await $fetch('/t/journal/current')
    expect(html).toContain('aria-expanded="false"')
    expect(html).toMatch(/role="button"/)
  })

  // Digests expand inline on the landing (like the session cards): the body is
  // preloaded for zero-request expansion, and the standalone page route still works.
  it('shows daily digests inline and keeps the digest route', async () => {
    const html = await $fetch('/t/journal/current')
    expect(html).toContain('Daily digests')
    expect(html).toContain('went from empty repo') // the Digest body, preloaded inline
    const digest = await $fetch('/t/journal/current/digests/2026-07-04')
    expect(digest).toMatch(/<h1[ >]/) // the standalone route still renders
  })

  // Standalone Document pages (#25) must render in the journal theme via the
  // Tenant's own `[space]/[...slug]` override, NOT fall through to the Platform's
  // unstyled catch-all. Assert the `.jd` wrapper + breadcrumb are present so it
  // can't silently regress to the generic renderer.
  it('renders standalone journal documents in the Tenant theme', async () => {
    for (const url of ['/t/journal/current/about', '/t/journal/current/digests/2026-07-04']) {
      const html = await $fetch(url)
      expect(html).toContain('class="jd"') // themed wrapper, not system-ui catch-all
      expect(html).toContain('aria-label="Breadcrumb"')
      expect(html).toContain('jd-prose')
      expect(html).not.toContain('No document at')
    }
  })

  // The archived Space's Document routes are served by the SAME themed override
  // (not the generic catch-all) AND stay isolated: `/t/journal/archived/about`
  // has no document, so it renders a *themed* not-found and must not leak
  // `current`'s about body.
  it('serves archived Document routes themed and isolated', async () => {
    const html = await $fetch('/t/journal/archived/about')
    expect(html).toContain('class="jd"') // themed override reaches archived
    expect(html).toContain('aria-label="Breadcrumb"')
    expect(html).toContain('No document at') // no such doc in archived
    expect(html).not.toContain('single SQLite database') // did NOT leak current/about
  })

  // A Space with no sessions (archived) must render the same dashboard without
  // erroring — the empty-state paths are exercised, isolation preserved.
  it('renders a session-less Space gracefully', async () => {
    const html = await $fetch('/t/journal/archived')
    expect(html).toContain('No sessions logged in this Space yet.')
    expect(html).not.toContain('No document at')
  })

  // ── Tier 2: real browser render — hydrates cleanly and the DOM is present ────
  // Every entry route is loaded in Chromium, the client bundle runs, and we
  // assert (a) an <h1> exists in the *rendered DOM* (not the SSR string) and
  // (b) nothing logged a console error or threw during hydration.
  for (const route of entryRoutes) {
    it(`hydrates ${route} in a browser with no console/page errors`, async () => {
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        expect(await page.locator('h1').count()).toBeGreaterThan(0)
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })
  }

  // ── Tier 2: interaction — expand-on-click renders in the live DOM ────────────
  // The digest body ships only in the useAsyncData payload until a click mounts
  // it (openDigests defaults false) — this is precisely the case the SSR-string
  // "went from empty repo" check above CANNOT prove renders. Click a real row
  // and assert the body becomes *visible* in the DOM.
  it('expands a journal digest on click (live DOM, not payload)', async () => {
    const route = '/t/journal/current'
    expect(entryRoutes).toContain(route)
    const { page, errors } = await renderAndCollectErrors(route)
    try {
      const firstRow = page.locator('.digest .drow').first()
      expect(await firstRow.count()).toBeGreaterThan(0)
      expect(await page.locator('.digest-body').count()).toBe(0) // collapsed: not mounted
      await firstRow.click()
      const body = page.locator('.digest-body').first()
      await body.waitFor({ state: 'visible' })
      expect(await body.isVisible()).toBe(true)
      expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
    } finally {
      await page.close()
    }
  })
})
