// L2 e2e assertions specific to the **blog** Tenant. Registered by the platform
// smoke spec so it shares that spec's single `setup()`/Nuxt build — NOT a
// standalone `*.spec.ts` (a second spec re-runs `setup()` → another full build;
// ADR-0004 amendment, tests/README.md).
//
// The failure-mode assertions here guard the "component renders empty on link
// navigation, permanently, until a reload" bug (issue #236). @nuxt/content
// answers client-side queries from a WASM SQLite DB whose per-collection dump is
// fetched lazily on first query; a failed load poisons that collection for the
// life of the page. We do NOT patch the dependency (ADR-0019 amendment,
// 2026-07-16) — instead the Space pages surface the failure as a modal
// (ContentLoadErrorDialog) that a reload recovers from, since the reloaded page
// renders from the server DB. These tests inject a failed dump load on a client
// navigation and assert the dialog shows and a reload restores the content.
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

    // A failed client-side content-DB load must never present as a silent,
    // permanent blank (issue #236). With no dependency patch, @nuxt/content's
    // stock client DB poisons its own module state on a failed load — so the
    // guarantee is: the failure raises the ContentLoadErrorDialog (never a
    // silent empty), and a full reload recovers the content (the reloaded page
    // renders the About from the SERVER DB during SSR, never touching the
    // poisoned client WASM DB). Two funnels, same surface + same recovery.

    it('shows the error dialog and recovers on reload after a dump-fetch blip', async () => {
      const page = await createPage()
      try {
        // Fail every request for David's pages dump — a client navigation whose
        // lazy dump fetch never lands. Stock @nuxt/content caches the rejected
        // load and the collection can't load again for the life of the page.
        await page.route('**/blog_david_pages/sql_dump.txt*', (route) => route.abort('failed'))

        // Land on a sibling Persona (SSR), then follow the in-page link to David
        // — a client-side navigation, the only path that hits the client WASM
        // query (an initial load / reload renders via the server DB).
        await page.goto(url('/t/blog/karen'), { waitUntil: 'hydration' })
        await page.locator('.net-links a', { hasText: 'David' }).click()
        await page.waitForFunction(() => location.pathname.endsWith('/t/blog/david'))

        // The failure is surfaced as a modal — never a silent blank.
        const dialog = page.locator('dialog.cle-dialog[open]')
        await expect.poll(async () => dialog.isVisible().catch(() => false), { timeout: 8000 }).toBe(true)
        expect(await dialog.locator('.cle-title').textContent()).toContain('Something went wrong')

        // Reloading renders the About from the server DB — the reliable recovery.
        await dialog.getByText('Reload page').click()
        const about = page.locator('.about-prose')
        await expect
          .poll(async () => (await about.textContent().catch(() => '') ?? '').trim().slice(0, 9), {
            timeout: 12000,
          })
          .toBe("I'm David")
      } finally {
        await page.close()
      }
    })

    it('shows technical details in the dialog after a corrupt dump', async () => {
      const page = await createPage()
      try {
        // A 200 whose body is not a valid gzip dump (a proxy/portal serving
        // non-gzip content, a truncated CDN body) — $fetch does not retry a 200,
        // decompression throws. The dialog must still surface the real cause.
        await page.route('**/blog_david_pages/sql_dump.txt*', (route) =>
          route.fulfill({ status: 200, contentType: 'text/plain', body: 'not-a-valid-gzip-dump' }),
        )

        await page.goto(url('/t/blog/karen'), { waitUntil: 'hydration' })
        await page.locator('.net-links a', { hasText: 'David' }).click()
        await page.waitForFunction(() => location.pathname.endsWith('/t/blog/david'))

        const dialog = page.locator('dialog.cle-dialog[open]')
        await expect.poll(async () => dialog.isVisible().catch(() => false), { timeout: 8000 }).toBe(true)

        // The technical-detail disclosure carries a non-empty diagnostic — the
        // decompress failure funnel writes no __content_db_errors entry, so this
        // proves the dialog reads the useAsyncData error object directly.
        await dialog.locator('.cle-details summary').click()
        expect((await dialog.locator('.cle-pre').textContent())?.trim().length).toBeGreaterThan(0)
      } finally {
        await page.close()
      }
    })
  })
}
