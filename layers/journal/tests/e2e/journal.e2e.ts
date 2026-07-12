// L2 e2e assertions specific to the **journal** Tenant — its custom Space
// dashboard, inline session/digest disclosures, themed Document routes, and
// archived-Space isolation. These are the journal-only half of the smoke gate;
// the cross-Tenant entry-route sweep stays in `tests/e2e/smoke.spec.ts`.
//
// This is NOT a standalone spec (no `.spec.ts` suffix). It exports a `register`
// function that the platform smoke spec calls INSIDE its single `describe`, so
// these tests share the one `setup()`/Nuxt build the smoke spec owns. Do NOT
// promote this to its own `*.e2e.spec.ts`: a second spec file re-runs `setup()`
// → another full `nuxt build`, multiplying the gate's slowest step per Tenant
// (ADR-0004 amendment; tests/README.md).
import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { expectCleanHydration } from '../../../../tests/support/e2e.ts'
import type { renderAndCollectErrors } from '../../../../tests/support/e2e.ts'

export interface JournalE2EContext {
  entryRoutes: string[]
  renderAndCollectErrors: typeof renderAndCollectErrors
}

/** Register the journal Tenant's L2 assertions under the caller's active suite. */
export function registerJournalE2E({ entryRoutes, renderAndCollectErrors }: JournalE2EContext): void {
  describe('journal Tenant', () => {
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
      for (const url of ['/t/journal/current/architecture', '/t/journal/current/digests/2026-07-04']) {
        const html = await $fetch(url)
        expect(html).toContain('class="jd"') // themed wrapper, not system-ui catch-all
        expect(html).toContain('aria-label="Breadcrumb"')
        expect(html).toContain('jd-prose')
        expect(html).not.toContain('No document at')
      }
    })

    // The entry-route sweep in `tests/e2e/smoke.spec.ts` only reaches the Space
    // landing (`/t/journal/<space>`) — a standalone Document is a deeper route
    // the sweep never visits. Cover one representative Document here so a
    // typo'd/renamed auto-import component on that page can't ship silently
    // (issue #212).
    it('hydrates a standalone document with no unresolved components', async () => {
      await expectCleanHydration('/t/journal/current/architecture')
    })

    // The archived Space's Document routes are served by the SAME themed override
    // (not the generic catch-all) AND stay isolated: `/t/journal/archived/architecture`
    // has no document, so it renders a *themed* not-found and must not leak
    // `current`'s architecture body.
    it('serves archived Document routes themed and isolated', async () => {
      const html = await $fetch('/t/journal/archived/architecture')
      expect(html).toContain('class="jd"') // themed override reaches archived
      expect(html).toContain('aria-label="Breadcrumb"')
      expect(html).toContain('No document at') // no such doc in archived
      expect(html).not.toContain('Nuxt Content fits this experiment') // did NOT leak current/architecture
    })

    // A Space with no sessions (archived) must render the same dashboard without
    // erroring — the empty-state paths are exercised, isolation preserved.
    it('renders a session-less Space gracefully', async () => {
      const html = await $fetch('/t/journal/archived')
      expect(html).toContain('No sessions logged in this Space yet.')
      expect(html).not.toContain('No document at')
    })

    // The `how-it-works` Document embeds a fenced ```mermaid block, rendered
    // client-only via a dynamic `import('mermaid')` (issue #364) — only a real
    // browser proves the fallback `<pre>` got replaced by an actual inline SVG,
    // since the SSR HTML can never contain it. Assert on the rendered DOM, not
    // the fetched markup.
    it('renders a mermaid diagram as an inline SVG', async () => {
      const route = '/t/journal/current/how-it-works'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        await page.locator('.mermaid-diagram svg').first().waitFor({ state: 'attached', timeout: 10_000 })
        expect(await page.locator('.mermaid-diagram svg').count()).toBeGreaterThan(0)
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })

    // ── Tier 2: interaction — expand-on-click renders in the live DOM ──────────
    // The digest body ships only in the useAsyncData payload until a click mounts
    // it (the accordion defaults closed) — this is precisely the case the SSR-string
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

    // Both feeds are one page-wide accordion: opening a session card collapses an
    // already-open digest (and vice versa), so at most one item is ever expanded.
    it('keeps a single item open across both feeds (accordion)', async () => {
      const route = '/t/journal/current'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        await page.locator('.digest .drow').first().click()
        await page.locator('.digest-body').first().waitFor({ state: 'visible' })
        expect(await page.locator('.digest-body').count()).toBe(1)
        // Opening a session card must collapse the open digest.
        await page.locator('.feed .card .head').first().click()
        await page.locator('.feed .card .detail').first().waitFor({ state: 'visible' })
        await expect.poll(() => page.locator('.digest-body').count()).toBe(0)
        expect(await page.locator('.feed .card.open').count()).toBe(1)
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })

    // Opening an item scrolls its top into view (like a deep-link load). The
    // accordion is one-at-a-time, so opening one item collapses whatever else was
    // open — a tall entry above the one just clicked would otherwise shrink out
    // from under it and strand the new entry scrolled past its own top ("opened in
    // the middle"). Park a card low in the viewport, open it, and assert its top
    // settles at the viewport top rather than staying where it was clicked.
    it('scrolls a newly opened item to the top of the viewport', async () => {
      const route = '/t/journal/current'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        const card = page.locator('.feed .card').first()
        const id = await card.getAttribute('id')
        const topOf = () =>
          page.evaluate((cardId) => document.getElementById(cardId!)!.getBoundingClientRect().top, id)
        // Park the card near the bottom of the viewport so "opened → at top" is a
        // real scroll, not a coincidence of where it already sat.
        await page.evaluate((cardId) => {
          const el = document.getElementById(cardId!)!
          window.scrollTo(0, window.scrollY + el.getBoundingClientRect().top - (window.innerHeight - 120))
        }, id)
        expect(await topOf()).toBeGreaterThan(250) // precondition: parked well below the top
        await card.locator('.head').click()
        // Poll past the (async, possibly animated) scroll: the opened card's top
        // must settle at the viewport top (block:'start' + scroll-margin-top).
        await expect.poll(async () => (await topOf()) <= 80).toBe(true)
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })

    // Deep-linking: loading the page with an item's anchor as the URL hash opens
    // that item on the client (the server never sees the fragment) AND scrolls it
    // into the viewport. `2026-07-04` is the oldest digest — last in the list,
    // below the fold on load — so the viewport check genuinely exercises the
    // scroll, not a coincidental already-visible target. The `<li>`'s id is the
    // anchor, so the deep-linked digest body is scoped by id here.
    it('opens the item named in the URL hash on load and scrolls it into view (deep-link)', async () => {
      const route = '/t/journal/current#digest-2026-07-04'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        const body = page.locator('#digest-2026-07-04 .digest-body')
        await body.waitFor({ state: 'visible' })
        expect(await body.isVisible()).toBe(true)
        // Poll past the (async, possibly animated) scroll: the row's top edge
        // must settle within the viewport.
        await expect
          .poll(() =>
            page.evaluate(() => {
              const el = document.getElementById('digest-2026-07-04')
              if (!el) return false
              const { top } = el.getBoundingClientRect()
              return top >= 0 && top <= window.innerHeight
            }),
          )
          .toBe(true)
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })

    // The open item is mirrored to the URL hash so it can be shared, and the hash
    // clears when the item is collapsed — the two halves of the deep-link contract.
    it('mirrors the open item to the URL hash and clears it on collapse', async () => {
      const route = '/t/journal/current'
      const { page, errors } = await renderAndCollectErrors(route)
      try {
        const firstRow = page.locator('.digest .drow').first()
        await firstRow.click()
        await page.locator('.digest-body').first().waitFor({ state: 'visible' })
        await expect.poll(() => page.evaluate(() => location.hash)).toMatch(/^#digest-/)
        await firstRow.click() // collapse
        await expect.poll(() => page.evaluate(() => location.hash)).toBe('')
        expect(errors, `console/page errors on ${route}:\n${errors.join('\n')}`).toEqual([])
      } finally {
        await page.close()
      }
    })
  })
}
