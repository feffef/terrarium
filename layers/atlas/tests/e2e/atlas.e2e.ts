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
import { expectCleanHydration } from '../../../../tests/support/e2e.ts'

/** Register the atlas Tenant's L2 assertions under the caller's active suite. */
export function registerAtlasE2E(): void {
  describe('atlas Tenant', () => {
    it('hydrates a specimen entry with no unresolved components', async () => {
      await expectCleanHydration('/t/atlas/canopy/mycora-susurrans')
    })

    it('hydrates the essay that carries the dial-driven MDC components', async () => {
      // lumina-fabulae weaves ::almanac / :season / ::season-note / ::sighting
      // into its field note — an unresolved MDC tag, or a hydration mismatch in
      // the season-note collapse or the ::sighting registration protocol,
      // surfaces here as a console error/unknown tag.
      await expectCleanHydration('/t/atlas/canopy/lumina-fabulae')
    })

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
  })
}
