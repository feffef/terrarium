// L2 e2e assertions specific to the **commons** Tenant — the Platform's
// cross-Tenant Aggregator (ADR-0025, issue #642), with a Search Space and a
// Timeline Space. Registered by the platform smoke spec so it shares that spec's
// single `setup()`/Nuxt build — NOT a standalone `*.spec.ts` (a second spec
// re-runs `setup()` → another full build; ADR-0004 amendment, tests/README.md).
//
// The entry-route sweep already hits `/t/commons/search` and `/t/commons/timeline`
// for a clean 200/hydration. These assertions prove what makes the Commons more
// than another Tenant: each view aggregates ACROSS Tenants via `#catalog`, and
// neither surfaces the Commons itself (the isolation default).
import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { attrs, expectRedirect, withRendered } from '../../../../tests/support/e2e.ts'

/** Register the commons Tenant's L2 assertions under the caller's active suite. */
export function registerCommonsE2E(): void {
  describe('commons Tenant', () => {
    it('redirects the Tenant root /t/commons to its main Space', () =>
      expectRedirect('/t/commons', '/t/commons/search'))

    // ── Search Space ──────────────────────────────────────────────────────────
    it('search: renders a corpus aggregated across multiple Tenants', async () => {
      const html = await $fetch('/t/commons/search')
      expect(html).toContain('Search')
      for (const tenant of ['atlas', 'marquee', 'midden', 'journal']) {
        expect(html, `expected a result from "${tenant}"`).toContain(tenant)
      }
      expect(html).toMatch(/across [5-9] sites/)
    })

    it('search: does not index the Commons itself (opt-in isolation default), and filters the corpus live as the user types', async () => {
      await withRendered('/t/commons/search', async (page) => {
        // The list pages itself; expand it all so the isolation check covers the whole corpus.
        const more = page.locator('.more')
        while (await more.count()) await more.click()
        const hrefs = await attrs(page.locator('.se-result a'), 'href')
        expect(hrefs.length).toBeGreaterThan(0)
        expect(hrefs.some((h) => h.startsWith('/t/commons'))).toBe(false)
        expect(hrefs.every((h) => /^\/t\/[a-z]+\/[a-z]+/.test(h))).toBe(true)

        const total = await page.locator('.se-result').count()
        expect(total).toBeGreaterThan(1)
        await page.locator('.se-box').fill('marquee')
        await expect.poll(() => page.locator('.se-result').count()).toBeGreaterThan(0)
        const filtered = await page.locator('.se-result').count()
        expect(filtered).toBeLessThan(total)
        const rows = await page.locator('.se-result').allTextContents()
        expect(rows.every((t) => t.toLowerCase().includes('marquee'))).toBe(true)
      })
    })

    // ── Timeline Space ────────────────────────────────────────────────────────
    it('timeline: renders a reverse-chronological feed across Tenants, linking to real routes, with session logs and daily digests deep-linked into the Journal', async () => {
      await withRendered('/t/commons/timeline', async (page) => {
        // The feed pages itself; expand it all so the assertions cover every entry.
        const more = page.locator('.more')
        expect(await page.locator('.tl-entry').count()).toBe(50)
        expect(await more.count()).toBe(1)
        while (await more.count()) await more.click()
        const entries = page.locator('.tl-entry')
        const count = await entries.count()
        expect(count).toBeGreaterThan(1)

        // Content spans more than one Tenant — posts (blog/marquee) plus the
        // Journal's sessions and digests.
        const provs = await page.locator('.tl-entry .prov').allTextContents()
        const tenants = new Set(provs.map((p) => p.trim().split(/\s/)[0]))
        expect(tenants.size).toBeGreaterThan(1)

        // Newest-first: the ISO datetimes are non-increasing down the feed.
        const times = await attrs(page.locator('.tl-entry time'), 'datetime')
        const sorted = [...times].sort((a, b) => b.localeCompare(a))
        expect(times).toEqual(sorted)

        // Every entry links to a real `/t/<tenant>/<space>` route, never the Commons.
        const hrefs = await attrs(page.locator('.tl-entry a'), 'href')
        expect(hrefs.length).toBe(count)
        expect(hrefs.some((h) => h.startsWith('/t/commons'))).toBe(false)
        expect(hrefs.every((h) => /^\/t\/[a-z]+\/[a-z]+/.test(h))).toBe(true)

        // Session logs (the `session` data kind) and digests (Journal pages under
        // /digests/) both appear, alongside posts — proving the cross-KIND read.
        expect(await page.locator('.tl-entry .genre-session').count()).toBeGreaterThan(0)
        expect(await page.locator('.tl-entry .genre-digest').count()).toBeGreaterThan(0)
        expect(await page.locator('.tl-entry .genre-post').count()).toBeGreaterThan(0)

        // Sessions/digests have no standalone page route, so they deep-link into
        // the Journal dashboard by fragment.
        expect(hrefs.some((h) => h.includes('/t/journal/') && h.includes('#session-'))).toBe(true)
        expect(hrefs.some((h) => h.includes('/t/journal/') && h.includes('#digest-'))).toBe(true)
      })
    })
  })
}
