// L2 e2e assertions specific to the **atlas** Tenant. Registered by the
// platform smoke spec so it shares that spec's single `setup()`/Nuxt build —
// NOT a standalone `*.spec.ts` (a second spec re-runs `setup()` → another full
// build; ADR-0004 amendment, tests/README.md).
//
// The entry-route sweep in `tests/e2e/smoke.spec.ts` only reaches each biome's
// Space landing (`/t/atlas/<biome>`) — a Specimen entry (`/t/atlas/<biome>/<slug>`)
// is a deeper route the sweep never visits, and it's exactly where
// `AtlasSpecimenPlate` and its sibling components render (issue #212's origin,
// PR #208). Cover one representative Specimen route here so a typo'd/renamed
// auto-import component on that page can't ship silently.
//
// The Atlas front door (`/t/atlas`) is a Tenant-root layer route, not a Space —
// it is deliberately outside the manifest/routing map, so it is NOT in
// `entryRoutes` and the platform sweep above never reaches it either
// (ADR-0016). ADR-0016 says a Tenant relying on such a route "should assert it
// in its own way" — this is that assertion, in the same `$fetch`-SSR-string
// style the other Tenant-specific checks in this file use.
import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { expectHydrated, withRendered } from '../../../../tests/support/e2e.ts'

/** Register the atlas Tenant's L2 assertions under the caller's active suite. */
export function registerAtlasE2E(): void {
  describe('atlas Tenant', () => {
    it('shows today under the glass on the front door', async () => {
      await withRendered('/t/atlas', async (page) => {
        const today = await page.locator('.today').textContent()
        expect(today).toMatch(/Day \d+ of the Glass Year/)
        expect(today).toMatch(/Abroad this season:|Nothing is abroad/)
      })
    })

    // issue #355: a body MDC block component with a dropped closing `::`
    // degrades silently to plain prose — no hydration/console error, so a
    // clean-hydration check alone can't catch it. Assert the route's
    // structured, content-driven output actually rendered, not just that
    // nothing errored.
    it('renders the mycora-susurrans field note and its relations structurally', async () => {
      const route = '/t/atlas/canopy/mycora-susurrans'
      await withRendered(route, async (page) => {
        await expectHydrated(page, route)
        const fieldnote = await page.locator('.atlas-fieldnote').textContent()
        expect(fieldnote).toContain('a company of pale sage caps standing shoulder to shoulder')
        const relations = await page.locator('.atlas-relations').textContent()
        expect(relations).toContain('Umbra vacans')
        expect(relations).toContain('Lumina fabulae')
        expect(relations).toContain('Folium mendax')
      })
    })

    // issue #342: the checks above assert prose text, which an unclosed
    // `::almanac`/`::phase-note`/`::sighting` block still carries once MDC
    // degrades it to plain paragraphs — no console error either way. Assert
    // each MDC component's own rendered DOM marker instead, so a silent
    // degrade-to-prose fails the count. Table-driven: mycora-susurrans and
    // lumina-fabulae differ only by route and expected counts. lumina-fabulae
    // weaves ::almanac / ::phase-note / ::sighting into its field note — an
    // unresolved MDC tag, or a hydration mismatch in the phase-note collapse or
    // the ::sighting registration protocol, surfaces as a console error/unknown tag.
    for (const { route, almanac, phaseNote, sighting } of [
      { route: '/t/atlas/canopy/mycora-susurrans', almanac: 1, phaseNote: 4, sighting: 3 },
      { route: '/t/atlas/canopy/lumina-fabulae', almanac: 1, phaseNote: 3, sighting: 2 },
    ]) {
      const slug = route.split('/').pop()
      it(`renders the ${slug} almanac, phase notes, and sightings structurally`, async () => {
        await withRendered(route, async (page) => {
          await expectHydrated(page, route)
          expect(await page.locator('.entry-almanac').count()).toBe(almanac)
          expect(await page.locator('.atlas-phase-note').count()).toBe(phaseNote)
          expect(await page.locator('.atlas-sighting').count()).toBe(sighting)
        })
      })
    }

    // 200 + stable front-door content: the cover title and all three wing names
    // (biomes.ts's `name` fields), so a broken front door or a wing dropped from
    // the directory both fail loudly.
    it('renders the Atlas front door', async () => {
      const html = await $fetch('/t/atlas')
      expect(html).toContain('The Atlas')
      expect(html).toContain('of the Terrarium')
      expect(html).toContain('The Canopy')
      expect(html).toContain('The Floor')
      expect(html).toContain('The Pool')
    })

    // The at-random link must land on a real specimen plate. Math.random is
    // pinned high so the pick can't coincide with the href's first-specimen
    // fallback — proving the click handler, not the plain link, navigated.
    it('opens the guide at a random specimen', async () => {
      await withRendered('/t/atlas', async (page) => {
        const link = page.getByRole('link', { name: /open the guide at random/i })
        const fallback = await link.getAttribute('href')
        await page.evaluate(() => { Math.random = () => 0.999 })
        await link.click()
        await page.waitForURL((u) => /^\/t\/atlas\/[^/]+\/[^/]+$/.test(u.pathname) && u.pathname !== fallback)
        await page.locator('.plate-caption').first().waitFor()
      })
    })
  })
}
