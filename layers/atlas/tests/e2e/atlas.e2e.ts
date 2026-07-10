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
import { describe, it } from 'vitest'
import { expectCleanHydration } from '../../../../tests/support/e2e.ts'

/** Register the atlas Tenant's L2 assertions under the caller's active suite. */
export function registerAtlasE2E(): void {
  describe('atlas Tenant', () => {
    it('hydrates a specimen entry with no unresolved components', async () => {
      await expectCleanHydration('/t/atlas/canopy/mycora-susurrans')
    })

    it('hydrates the essay that carries the dial-driven MDC components (#283)', async () => {
      // lumina-fabulae weaves :season / ::phase / ::sighting into its field
      // note — an unresolved MDC tag or a hydration mismatch in the
      // registration protocol surfaces here as a console error/unknown tag.
      await expectCleanHydration('/t/atlas/canopy/lumina-fabulae')
    })
  })
}
