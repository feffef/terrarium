// The Atlas Tenant's Nuxt layer (GLOSSARY.md: "a Tenant is implemented as a Nuxt
// layer"). Its fit-out — a Victorian specimen-plate field guide — overrides the
// Platform's generic catch-all renderer for `/t/atlas/*` and adds the Tenant's
// own front door at `/t/atlas` (a layer route, not a Space; #65).
//
// Purely presentational: it reads the per-biome keyed collections through the
// shared routing map, defines no collections of its own (ADR-0013), and touches
// none of the isolation-critical routing/expansion logic (ADR-0004).
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // The `.atlas` theme tokens + per-biome palettes, registered globally so every
  // layer view (front door, biome wing, specimen entry) and every nested
  // component inherits them. Resolved from this config's own URL so it is
  // unambiguous regardless of layer alias resolution (.claude/rules/tenant-layers.md).
  css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
})
