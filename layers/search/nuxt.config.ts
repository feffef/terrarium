// The Search Tenant's Nuxt layer (CONTEXT.md: "a Tenant is implemented as a Nuxt
// layer"). Its fit-out overrides the Platform's generic catch-all for the
// `/t/search/all` landing with a real search interface over the cross-Tenant
// `#catalog` (ADR-0025).
//
// Presentation-only (ADR-0004): it reads the catalog through the sanctioned
// `queryAcrossTenants` composable and defines NO content collections or
// isolation-critical logic of its own.
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // The `.se-page` theme tokens, resolved from this config's own URL so it is
  // unambiguous regardless of layer alias resolution (docs/agents/tenant-layers.md §1).
  css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
})
