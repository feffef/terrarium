// The Commons Tenant's Nuxt layer (CONTEXT.md: "a Tenant is implemented as a Nuxt
// layer"). Its fit-out overrides the Platform's generic catch-all for each Space
// landing (`/t/commons/search`, `/t/commons/timeline`) with a real cross-Tenant
// view over `#catalog` (ADR-0025).
//
// Presentation-only (ADR-0004): it reads the catalog through the sanctioned
// `queryAcrossTenants`/`queryTimeline` composables and defines NO content
// collections or isolation-critical logic of its own.
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // The `.commons-page` theme tokens, resolved from this config's own URL so it is
  // unambiguous regardless of layer alias resolution (docs/agents/tenant-layers.md §1).
  css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
})
