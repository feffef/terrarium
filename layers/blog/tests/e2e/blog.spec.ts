// L2 e2e assertions specific to the **blog** Tenant. Serves the gate's build via
// `setupL2()` and never builds (tests/README.md).
//
// The failure-mode assertions here guard the "component renders empty on link
// navigation, permanently, until a reload" bug (issue #236). @nuxt/content
// answers client-side queries from a WASM SQLite DB whose per-collection dump is
// fetched lazily on first query; a failed load poisons that collection for the
// life of the page. We do NOT patch the dependency (ADR-0019) — instead the Space pages surface the failure as a modal
// (ContentLoadErrorDialog) that a reload recovers from, since the reloaded page
// renders from the server DB. Navigation normally reads a server payload and
// skips the client DB (ADR-0028), so these tests fail that payload too, then a
// dump load, and assert the dialog shows and a reload restores the content.
//
// A failed download (a build chunk or the dump itself) is the exception: it
// reloads itself once (ADR-0019), so its tests assert the content comes back
// with no click — and that a failure surviving that one attempt settles on the
// dialog instead of reloading again.
import { describe, expect, it } from 'vitest'
import { $fetch, createPage, url } from '@nuxt/test-utils/e2e'
import type { Page, Route } from 'playwright-core'
import { expectCleanHydration, setupL2 } from '../../../../tests/support/e2e.ts'

const DAVID_PAYLOAD = '/t/blog/david/_payload.json'

/** Fail David's navigation payload, so the page falls back to the client DB (ADR-0028). */
async function failDavidPayload(page: Page): Promise<void> {
  await page.route(`**${DAVID_PAYLOAD}*`, (route) => route.abort('failed'))
}

/** Answer David's pages dump with `fail`, on the client-DB fallback. */
async function failDavidDump(page: Page, fail: (route: Route) => Promise<void>): Promise<void> {
  await failDavidPayload(page)
  await page.route('**/blog_david_pages/sql_dump.txt*', fail)
}

/**
 * Serve a 500 for the build chunk @nuxt/content dynamically imports on its first
 * client-side query (`await import('@sqlite.org/sqlite-wasm')`) — the failure the
 * production capture recorded (issue #236, 2026-07-19). The chunk is matched by
 * its *content*, not its name: Nuxt emits pure content-hash filenames, so there
 * is no stable path to route on. Routing also disables the page's HTTP cache, so
 * an already-fetched chunk still reaches this handler.
 */
async function failContentChunkImport(page: Page): Promise<void> {
  await failDavidPayload(page)
  await page.route('**/_nuxt/*.js', async (route) => {
    // The test's reloadNuxtApp can dispose the page at any await; vitest counts
    // that rejection as an unhandled error and fails the run.
    try {
      const response = await route.fetch()
      const body = await response.text()
      const isSqliteEntry = body.includes('sqlite3InitModule') && !route.request().url().includes('worker1')
      await (isSqliteEntry
        ? route.fulfill({ status: 500, contentType: 'application/javascript', body: '' })
        : route.fulfill({ response, body }))
    } catch {
      // disposed mid-flight: nothing to answer
    }
  })
}

/**
 * Stand in the state `reloadNuxtApp` leaves behind for a path it has just
 * reloaded (its sessionStorage guard, still inside its TTL — see
 * nuxt/dist/app/composables/chunk.js). This is how a *persistent* failure is
 * reproduced deterministically: a real second pass would need the reloaded
 * page to re-query the client DB, which a hydrated page never does.
 */
async function plantDavidReloadGuard(page: Page): Promise<void> {
  await page.addInitScript(() => {
    sessionStorage.setItem('nuxt:reload', JSON.stringify({ path: '/t/blog/david', expires: Date.now() + 10_000 }))
  })
}

/** True while no full page load has happened since the sentinel was planted. */
async function plantReloadSentinel(page: Page): Promise<void> {
  await page.evaluate(() => {
    ;(window as unknown as { __noReloadSince?: boolean }).__noReloadSince = true
  })
}
async function noReloadHappened(page: Page): Promise<boolean> {
  return page.evaluate(() => (window as unknown as { __noReloadSince?: boolean }).__noReloadSince === true)
}

/** Wait until David's About renders. */
async function expectDavidAbout(page: Page, timeout: number): Promise<void> {
  const about = page.locator('.about-prose')
  await expect
    .poll(async () => ((await about.textContent().catch(() => '')) ?? '').trim().startsWith("I'm David"), { timeout })
    .toBe(true)
}

describe('blog Tenant', async () => {
  await setupL2()

  // The entry-route sweep in `tests/e2e/smoke.spec.ts` only reaches each
  // Persona's landing (`/t/blog/<persona>`) — an individual post is a deeper
  // route the sweep never visits. Cover one representative post here so a
  // typo'd/renamed auto-import component on that page can't ship silently
  // (issue #212).
  it('hydrates a post with no unresolved components', async () => {
    await expectCleanHydration('/t/blog/karen/2026-07-08-a-fix-for-a-bug-you-cant-find')
  })

  it('links a post to the Journal digest of its publish day', async () => {
    const dated = await $fetch<string>('/t/blog/karen/2026-09-30-nothing-cleared-the-bar-because-nobody-checked')
    // The retention sweep moves old Digests from current to archived, so accept either.
    expect(dated).toMatch(/href="\/t\/journal\/(current|archived)\/digests\/2026-09-30"/)
    const archived = await $fetch<string>('/t/blog/karen/2026-07-08-a-fix-for-a-bug-you-cant-find')
    expect(archived).toContain('href="/t/journal/archived/digests/2026-07-08"')
  })

  it('gives the drop cap only to a post that opens on a letter', async () => {
    const quoted = await $fetch<string>('/t/blog/karen/2026-10-07-the-diagrams-were-already-stale-the-gate-hadnt-noticed-either')
    expect(quoted).not.toContain('prose--cap')
    const lettered = await $fetch<string>('/t/blog/david/2026-07-05-first-light')
    expect(lettered).toContain('prose--cap')
  })

  it('answers a missing post with links onward, not an engineering message', async () => {
    const html = await $fetch<string>('/t/blog/karen/no-such-post', { ignoreResponseError: true })
    expect(html).toContain('no post at this address')
    expect(html).not.toMatch(/No document at <code[\s>]/)
    expect(html).toContain('href="/t/blog/karen"')
  })

  // The front door (`/t/blog`) is a Tenant root page, outside the `entryRoutes`
  // sweep (ADR-0016), so it's asserted here, plus its `?tag=` filtered view.
  it('hydrates the front door with no unresolved components', async () => {
    await expectCleanHydration('/t/blog')
  })

  it('hydrates the front door filtered by tag with no unresolved components', async () => {
    await expectCleanHydration('/t/blog?tag=governance')
  })

  it('navigates client-side from the server payload, without the client DB (ADR-0028)', async () => {
    const page = await createPage()
    try {
      await page.goto(url('/t/blog/karen'), { waitUntil: 'hydration' })
      const requests: string[] = []
      page.on('request', (request) => requests.push(request.url()))
      await plantReloadSentinel(page)
      await page.locator('.net-cards a', { hasText: 'David' }).click()

      await expectDavidAbout(page, 8000)
      expect(await noReloadHappened(page)).toBe(true)
      expect(requests.some((u) => u.includes(DAVID_PAYLOAD))).toBe(true)
      expect(requests.filter((u) => u.includes('.wasm') || u.includes('sql_dump.txt'))).toEqual([])
    } finally {
      await page.close()
    }
  })

  // The two downloads a client query needs: the dump, and the build chunk the
  // production capture saw fail (issue #236, 2026-07-19).
  const downloadFailures = [
    { name: 'dump fetch', fail: (page: Page) => failDavidDump(page, (route) => route.abort('failed')) },
    { name: 'content-chunk import', fail: failContentChunkImport },
  ]

  it.each(downloadFailures)('auto-recovers from a failed $name on a client navigation', async ({ fail }) => {
    const page = await createPage()
    try {
      await fail(page)

      await page.goto(url('/t/blog/karen'), { waitUntil: 'hydration' })
      await page.locator('.net-cards a', { hasText: 'David' }).click()

      // No "Reload page" click: the recovery is the app's job. The reloaded
      // page renders the About from the SERVER DB during SSR, so the content
      // arrives even while the download keeps failing.
      await expectDavidAbout(page, 20000)
      expect(await page.locator('dialog.cle-dialog[open]').count()).toBe(0)
    } finally {
      await page.close()
    }
  })

  it.each(downloadFailures)('shows the dialog instead of reloading again when the $name keeps failing', async ({ fail }) => {
    const page = await createPage()
    try {
      await fail(page)
      await plantDavidReloadGuard(page)

      await page.goto(url('/t/blog/karen'), { waitUntil: 'hydration' })
      await plantReloadSentinel(page)
      await page.locator('.net-cards a', { hasText: 'David' }).click()

      const dialog = page.locator('dialog.cle-dialog[open]')
      await expect.poll(async () => dialog.isVisible().catch(() => false), { timeout: 8000 }).toBe(true)
      expect(await dialog.locator('.cle-title').textContent()).toContain('Something went wrong')
      expect(await noReloadHappened(page)).toBe(true)

      // Reloading renders the About from the server DB — the reliable recovery.
      await dialog.getByText('Reload page').click()
      await expectDavidAbout(page, 12000)
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
      await failDavidDump(page, (route) =>
        route.fulfill({ status: 200, contentType: 'text/plain', body: 'not-a-valid-gzip-dump' }),
      )

      await page.goto(url('/t/blog/karen'), { waitUntil: 'hydration' })
      await plantReloadSentinel(page)
      await page.locator('.net-cards a', { hasText: 'David' }).click()
      await page.waitForFunction(() => location.pathname.endsWith('/t/blog/david'))

      const dialog = page.locator('dialog.cle-dialog[open]')
      await expect.poll(async () => dialog.isVisible().catch(() => false), { timeout: 8000 }).toBe(true)

      // The technical-detail disclosure carries a non-empty diagnostic read
      // from the useAsyncData error object.
      await dialog.locator('.cle-details summary').click()
      expect((await dialog.locator('.cle-pre').textContent())?.trim().length).toBeGreaterThan(0)

      // A reload cannot fix a body that decompresses to garbage, so this
      // funnel must NOT auto-recover (issue #236): auto-reloading an
      // unfixable error is strictly worse than the modal.
      expect(await noReloadHappened(page)).toBe(true)
    } finally {
      await page.close()
    }
  })
})
