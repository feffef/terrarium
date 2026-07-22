// L2 e2e assertions specific to the **search** Tenant — the first *aggregator*
// (ADR-0025, issue #642). Registered by the platform smoke spec so it shares that
// spec's single `setup()`/Nuxt build — NOT a standalone `*.spec.ts` (a second spec
// re-runs `setup()` → another full build; ADR-0004 amendment, tests/README.md).
//
// The entry-route sweep already hits `/t/search/all` for a clean 200/hydration.
// These assertions prove the thing that makes Search more than another Tenant:
// it renders a corpus aggregated ACROSS Tenants via `#catalog`, filters it live,
// and — the isolation-default check — does NOT index itself.
import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { renderAndCollectErrors } from '../../../../tests/support/e2e.ts'

/** Register the search Tenant's L2 assertions under the caller's active suite. */
export function registerSearchE2E(): void {
  describe('search Tenant', () => {
    // SSR renders the whole (unfiltered) corpus, so provenance labels from
    // multiple OTHER Tenants must be present — that is the cross-Tenant
    // aggregation working, not a hardcoded roster.
    it('renders a corpus aggregated across multiple Tenants', async () => {
      const html = await $fetch('/t/search/all')
      expect(html).toContain('Search')
      // Provenance labels (`<span class="prov">tenant · space`) from Tenants that
      // opted a `pages` collection into `#catalog`.
      for (const tenant of ['atlas', 'marquee', 'midden', 'journal']) {
        expect(html, `expected a result from "${tenant}"`).toContain(tenant)
      }
      // "across N tenants" — six content Tenants opted in.
      expect(html).toMatch(/across [6-9] tenants/)
    })

    it('does not index its own search landing (opt-in isolation default)', async () => {
      const { page, errors } = await renderAndCollectErrors('/t/search/all')
      try {
        expect(errors).toEqual([])
        const hrefs = await page.locator('.se-result a').evaluateAll((els) =>
          els.map((el) => el.getAttribute('href') ?? ''),
        )
        expect(hrefs.length).toBeGreaterThan(0)
        // The Search Tenant's own `pages` collection carries no `kind`, so no
        // result may link back into `/t/search/*`.
        expect(hrefs.some((h) => h.startsWith('/t/search'))).toBe(false)
        // And every result links to a real `/t/<tenant>/<space>` route (ADR-0006).
        expect(hrefs.every((h) => /^\/t\/[a-z]+\/[a-z]+/.test(h))).toBe(true)
      } finally {
        await page.close()
      }
    })

    it('filters the corpus live as the user types', async () => {
      const { page, errors } = await renderAndCollectErrors('/t/search/all')
      try {
        const total = await page.locator('.se-result').count()
        expect(total).toBeGreaterThan(1)

        await page.locator('.se-box').fill('marquee')
        // The filtered set is non-empty and strictly smaller, and every surviving
        // row matches the needle *somewhere* in its visible text — the filter
        // spans provenance (tenant · space), title, and description, so a row is a
        // legitimate hit whichever of those matched.
        await expect.poll(() => page.locator('.se-result').count()).toBeGreaterThan(0)
        const filtered = await page.locator('.se-result').count()
        expect(filtered).toBeLessThan(total)
        const rows = await page.locator('.se-result').allTextContents()
        expect(rows.every((t) => t.toLowerCase().includes('marquee'))).toBe(true)

        expect(errors).toEqual([])
      } finally {
        await page.close()
      }
    })
  })
}
