// Shared L2 e2e support, imported by the single platform smoke spec
// (`tests/e2e/smoke.spec.ts`) AND by each Tenant's e2e module
// (`layers/<tenant>/tests/e2e/*.e2e.ts`). It is NOT a spec itself (no `.spec.ts`
// suffix) so vitest never collects it standalone — it only runs under the one
// `setup()`/build the smoke spec owns (see tests/README.md and ADR-0004's
// amendment: the L2 gate stays a single Nuxt build as Tenants multiply).
import type { Page } from 'playwright-core'
import { createPage, url } from '@nuxt/test-utils/e2e'
import { entryRoutesFrom, expand, loadManifests } from '../../shared/expand.ts'

// The L2 target list, derived at test-time from the manifests (ADR-0014) so new
// Spaces are covered automatically. Single-homed in `shared/expand.ts` so the
// build-time routing module and this test-time list can't drift.
export const entryRoutes = entryRoutesFrom(expand(loadManifests()))

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
