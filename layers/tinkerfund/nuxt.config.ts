// The Tinkerfund Tenant's Nuxt layer: presentation only, no server code
// (issue #1371), no collections of its own (ADR-0002/0013).
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
  // Nuxt reads a page's viewTransition meta only with this flag on; the app default stays off, pages opt in (#1376).
  experimental: { viewTransition: true },
  app: { viewTransition: false },
})
