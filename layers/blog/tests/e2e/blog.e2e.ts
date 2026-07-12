// L2 e2e assertions specific to the **blog** Tenant. Registered by the platform
// smoke spec so it shares that spec's single `setup()`/Nuxt build — NOT a
// standalone `*.spec.ts` (a second spec re-runs `setup()` → another full build;
// ADR-0004 amendment, tests/README.md).
//
// The one assertion here is a regression guard for the "component renders empty
// on link navigation, permanently, until a reload" bug. @nuxt/content answers
// client-side queries from a WASM SQLite DB whose per-collection dump is fetched
// lazily on first query; a transient failure of that dump fetch used to reject
// and POISON the collection's cached load promise, so the About section stayed
// blank for the life of the page. The fix (a committed pnpm patch of
// @nuxt/content) retries the dump fetch to ride out a blip and evicts the
// promise on failure so a later query can recover. This test injects exactly
// that blip and asserts the content still arrives without a reload.
import { describe, expect, it } from 'vitest'
import { createPage, url } from '@nuxt/test-utils/e2e'
import { expectCleanHydration } from '../../../../tests/support/e2e.ts'

/** Register the blog Tenant's L2 assertions under the caller's active suite. */
export function registerBlogE2E(): void {
  describe('blog Tenant', () => {
    // The entry-route sweep in `tests/e2e/smoke.spec.ts` only reaches each
    // Persona's landing (`/t/blog/<persona>`) — an individual post is a deeper
    // route the sweep never visits. Cover one representative post here so a
    // typo'd/renamed auto-import component on that page can't ship silently
    // (issue #212).
    it('hydrates a post with no unresolved components', async () => {
      await expectCleanHydration('/t/blog/karen/2026-07-08-a-fix-for-a-bug-you-cant-find')
    })

    // The Tenant-root front door (`/t/blog`, ADR-0016 precedent) isn't in the
    // generated `entryRoutes` sweep — a Tenant-root page never is (ADR-0016) —
    // so it's asserted here, plus its `?tag=` filtered view.
    it('hydrates the front door with no unresolved components', async () => {
      await expectCleanHydration('/t/blog')
    })

    it('hydrates the front door filtered by tag with no unresolved components', async () => {
      await expectCleanHydration('/t/blog?tag=governance')
    })

    it('recovers content after a transient dump-fetch blip on client navigation', async () => {
      const page = await createPage()
      try {
        // Fail the first two requests for David's pages dump — enough to beat
        // $fetch's single built-in retry, which is precisely what used to poison
        // the client DB permanently. Allow everything after.
        let seen = 0
        await page.route('**/blog_david_pages/sql_dump.txt*', async (route) => {
          seen += 1
          if (seen <= 2) return route.abort('failed')
          return route.continue()
        })

        // Land on a sibling Persona (SSR), then follow the in-page link to David
        // — a client-side navigation, which is the only path that hits the client
        // WASM query (a reload would render via the server DB and mask the bug).
        await page.goto(url('/t/blog/karen'), { waitUntil: 'hydration' })
        await page.locator('.net-links a', { hasText: 'David' }).click()
        await page.waitForFunction(() => location.pathname.endsWith('/t/blog/david'))

        // The About must arrive on its own — no reload. Pre-fix it stayed empty
        // forever; the patched retry re-fetches the dump and fills it within ~1s.
        const about = page.locator('.about-prose')
        await expect
          .poll(async () => (await about.textContent().catch(() => '') ?? '').trim().slice(0, 9), {
            timeout: 8000,
          })
          .toBe("I'm David")
      } finally {
        await page.close()
      }
    })
  })
}
