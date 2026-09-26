// The Tinkerfund Tenant's Nuxt layer: presentation only, no server code
// (issue #1371), no collections of its own (ADR-0002/0013).
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
  // Installs Nuxt's view-transition plugin with every page off by default, so
  // no other Tenant changes; a Tinkerfund page opts in with
  // definePageMeta({ viewTransition: true }) (issue #1361). Nuxt 4.5 renders an
  // object here as "[object Object]", hence the boolean-plus-app-default pair.
  experimental: { viewTransition: true },
  app: { viewTransition: false },
})
