// Shared L2 e2e support, imported by the single platform smoke spec
// (`tests/e2e/smoke.spec.ts`) AND by each Tenant's e2e module
// (`layers/<tenant>/tests/e2e/*.e2e.ts`). It is NOT a spec itself (no `.spec.ts`
// suffix) so vitest never collects it standalone — it only runs under the one
// `setup()`/build the smoke spec owns (see tests/README.md and ADR-0004's
// amendment: the L2 gate stays a single Nuxt build as Tenants multiply).
import type { Locator, Page } from 'playwright-core'
import { expect } from 'vitest'
import { createPage, fetch, url } from '@nuxt/test-utils/e2e'
import { entryRoutesFrom, expand, loadManifests } from '../../shared/expand.ts'
import { mermaidRoutes } from './mermaid-pages.ts'

// Both target lists are derived at test-time from the SAME expanded manifests
// (ADR-0014), so new Spaces/pages are covered automatically with no hard-coding.
const expandedCollections = expand(loadManifests())

// The L2 target list, derived at test-time from the manifests (ADR-0014) so new
// Spaces are covered automatically. Single-homed in `shared/expand.ts` so the
// build-time routing module and this test-time list can't drift.
export const entryRoutes = entryRoutesFrom(expandedCollections)

// Every content page, across every Tenant, whose body contains a fenced
// ```mermaid block — the L2 sweep target list for issue #469.
export const mermaidPageRoutes = mermaidRoutes(expandedCollections)

/**
 * Navigate to `route` in a fresh page, capturing every console *error*, uncaught
 * page error, and requested URL from before navigation until the network
 * settles. Returns the page (for DOM assertions), the collected error strings,
 * and every request URL (so a test can assert what did — or, for #379's
 * zero-mermaid-JS guarantee, did NOT — get fetched).
 */
export async function renderAndCollectErrors(
  route: string,
): Promise<{ page: Page; errors: string[]; requests: string[] }> {
  const errors: string[] = []
  const requests: string[] = []
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
  page.on('request', (req) => {
    requests.push(req.url())
  })
  // waitUntil: 'hydration' blocks until Nuxt reports isHydrating === false, so a
  // throw during hydration surfaces as a pageerror we then assert on.
  await page.goto(url(route), { waitUntil: 'hydration' })
  await page.waitForLoadState('networkidle')
  return { page, errors, requests }
}

/**
 * Returns the deduped, lowercased tag names of any `HTMLUnknownElement`s in
 * `page`'s live DOM — the signature of a typo'd or renamed auto-imported Vue
 * component: Vue emits the unresolved tag as-is, the browser parses it as a
 * custom element, and the page renders around the gap silently (issue #212).
 * An empty array is the passing case; the repo has no genuine custom elements
 * to allowlist today.
 */
export async function collectUnknownElementTags(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...new Set(
      [...document.querySelectorAll('*')]
        .filter((e) => Object.getPrototypeOf(e).constructor.name === 'HTMLUnknownElement')
        .map((e) => e.tagName.toLowerCase()),
    )],
  )
}

/**
 * Renders `route` and runs `fn` against the page, then asserts no console/page
 * error fired (also the requests seen, for #379's zero-mermaid-JS guarantee).
 * Closes the page itself (success or failure) so call sites don't each repeat
 * the try/finally.
 */
export async function withRendered(
  route: string,
  fn: (page: Page, requests: string[]) => Promise<void>,
): Promise<void> {
  const { page, errors, requests } = await renderAndCollectErrors(route)
  try {
    await fn(page, requests)
    expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
  } finally {
    await page.close()
  }
}

/** Asserts (a) an `<h1>` exists in the rendered DOM and (b) no unresolved
 *  auto-import component rendered as an `HTMLUnknownElement` (issue #212). */
export async function expectHydrated(page: Page, route: string): Promise<void> {
  expect(await page.locator('h1').count()).toBeGreaterThan(0)
  const unknownTags = await collectUnknownElementTags(page)
  expect(unknownTags, `unresolved components on ${route}: ${unknownTags.join(', ')}`).toEqual([])
}

/** `withRendered` + `expectHydrated` for a route that needs no other assertion. */
export const expectCleanHydration = (route: string): Promise<void> =>
  withRendered(route, (page) => expectHydrated(page, route))

/** Asserts `from` answers a 302 to `to` (no redirect followed). */
export async function expectRedirect(from: string, to: string): Promise<void> {
  const res = await fetch(from, { redirect: 'manual' })
  expect(res.status).toBe(302)
  expect(res.headers.get('location')).toBe(to)
}

/** The `name` attribute of every element `loc` matches, '' when absent. */
export const attrs = (loc: Locator, name: string): Promise<string[]> =>
  loc.evaluateAll((els, n) => els.map((el) => el.getAttribute(n) ?? ''), name)
