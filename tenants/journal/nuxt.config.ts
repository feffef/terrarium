// The Journal Tenant's Nuxt layer (CONTEXT.md: "a Tenant is implemented as a
// Nuxt layer"). This is the Tenant's own fit-out — components and a Space-landing
// page that render its content nicely, overriding the Platform's generic catch-all
// renderer for `/t/journal/<space>` only.
//
// Purely presentational: it reads the already-generated, per-Space keyed
// collections through the shared routing map. It defines NO content collections
// of its own — those stay governed solely by the generated root content.config.ts
// (ADR-0002/0007) — and touches none of the isolation-critical routing/generator
// logic (ADR-0004).
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // The `.jd` theme tokens + base layout / breadcrumb / prose, shared by the
  // Space landing and the standalone document page so neither copy-pastes them.
  // Resolved from this config's own URL so it's unambiguous regardless of layer
  // alias resolution.
  css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
})
