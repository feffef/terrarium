// L2 e2e assertions specific to the **marquee** Tenant. Registered by the
// platform smoke spec so it shares that spec's single `setup()`/Nuxt build —
// NOT a standalone `*.spec.ts` (a second spec re-runs `setup()` → another full
// build; ADR-0004 amendment, tests/README.md).
//
// The entry-route sweep in `tests/e2e/smoke.spec.ts` only reaches the reel
// Space landing (`/t/marquee/reel`) — an individual Chapter
// (`/t/marquee/reel/<slug>`) is a deeper route the sweep never visits, and
// it's exactly where `MarqueePoster` renders its authored SVG illustration.
// Cover one representative Chapter here so a typo'd/renamed auto-import
// component on that page can't ship silently (mirrors atlas.e2e.ts/
// blog.e2e.ts's shape).
import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { expectCleanHydration, renderAndCollectErrors } from '../../../../tests/support/e2e.ts'

/** Register the marquee Tenant's L2 assertions under the caller's active suite. */
export function registerMarqueeE2E(): void {
  describe('marquee Tenant', () => {
    it('hydrates a chapter with no unresolved components', async () => {
      await expectCleanHydration('/t/marquee/reel/captain-america-the-first-avenger')
    })

    it('renders the chapter poster illustration as an inline SVG', async () => {
      const { page, errors } = await renderAndCollectErrors('/t/marquee/reel/captain-america-the-first-avenger')
      try {
        expect(errors).toEqual([])
        expect(await page.locator('.mq-poster svg').count()).toBe(1)
      } finally {
        await page.close()
      }
    })

    // The landing lists the five opening chapters in in-universe story order
    // (`order` ascending), not release order — the whole point of the Tenant.
    it('renders the reel landing with the opening five chapters in story order', async () => {
      const html = await $fetch('/t/marquee/reel')
      const titles = [
        'Captain America: The First Avenger',
        'Captain Marvel',
        'Iron Man',
        'Iron Man 2',
        'The Incredible Hulk',
      ]
      let lastIndex = -1
      for (const title of titles) {
        expect(html).toContain(title)
        const index = html.indexOf(title)
        expect(index).toBeGreaterThan(lastIndex)
        lastIndex = index
      }
    })
  })
}
