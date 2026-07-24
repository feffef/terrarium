// The Midden Tenant's Nuxt layer (CONTEXT.md: "a Tenant is implemented as a Nuxt
// layer"). Its fit-out — an archaeology-themed catalogue of the Platform's own
// discarded work — overrides the Platform's generic catch-all renderer for
// `/t/midden/*` and adds the Tenant's own front door at `/t/midden` (a layer
// route, not a Space; issue #515).
//
// Purely presentational (ADR-0004): it reads the per-Space keyed collections
// through the shared routing map, defines NO content collections of its own
// (those stay in the root content.config.ts, ADR-0002/0013), and touches none of
// the isolation-critical routing/expansion logic.
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // The `.midden` theme tokens (cream/parchment ground, one terracotta
  // accent), registered globally so every layer view and every nested
  // component inherits them. Resolved from this
  // config's own URL so it is unambiguous regardless of layer alias resolution
  // (docs/agents/tenant-layers.md §1).
  css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
})
