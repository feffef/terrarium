// The Atlas Tenant's Nuxt layer (CONTEXT.md: "a Tenant is implemented as a Nuxt
// layer"). Its fit-out — a Victorian specimen-plate field guide — overrides the
// Platform's generic catch-all renderer for `/t/atlas/*` and adds the Tenant's
// own front door at `/t/atlas` (a layer route, not a Space; #65).
//
// Purely presentational (ADR-0004): it reads the per-biome keyed collections
// through the shared routing map, defines NO content collections of its own
// (those stay in the root content.config.ts, ADR-0002/0013), and touches none of
// the isolation-critical routing/generator logic.
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // The `.atlas` theme tokens + per-biome palettes, registered globally so every
  // layer view (front door, biome wing, specimen entry) and every nested
  // component inherits them. Resolved from this config's own URL so it is
  // unambiguous regardless of layer alias resolution (docs/agents/tenant-layers.md §1).
  css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
})
