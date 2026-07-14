// Shared L2 e2e support, imported by the single platform smoke spec
// (`tests/e2e/smoke.spec.ts`) AND by each Tenant's e2e module
// (`layers/<tenant>/tests/e2e/*.e2e.ts`). It is NOT a spec itself (no `.spec.ts`
// suffix) so vitest never collects it standalone — it only runs under the one
// `setup()`/build the smoke spec owns (see tests/README.md and ADR-0004's
// amendment: the L2 gate stays a single Nuxt build as Tenants multiply).
import type { Page } from 'playwright-core'
import { expect } from 'vitest'
import { createPage, url } from '@nuxt/test-utils/e2e'
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
 * Navigate to `route` in a fresh page, capturing every console *error* and
 * uncaught page error from before navigation until the network settles. Returns
 * the page (for DOM assertions) and the collected error strings.
 */
export async function renderAndCollectErrors(route: string): Promise<{ page: Page; errors: string[] }> {
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
 * Navigates to `route`, then asserts (a) an `<h1>` exists in the rendered
 * DOM, (b) no console/page error fired, and (c) no unresolved auto-import
 * component rendered as an `HTMLUnknownElement` (issue #212). Closes the page
 * itself (success or failure) so call sites don't each repeat the try/finally.
 */
export async function expectCleanHydration(route: string): Promise<void> {
  const { page, errors } = await renderAndCollectErrors(route)
  try {
    expect(await page.locator('h1').count()).toBeGreaterThan(0)
    expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
    const unknownTags = await collectUnknownElementTags(page)
    expect(unknownTags, `unresolved components on ${route}: ${unknownTags.join(', ')}`).toEqual([])
  } finally {
    await page.close()
  }
}
