// The Marquee Tenant's Nuxt layer (CONTEXT.md: "a Tenant is implemented as a
// Nuxt layer"). Its fit-out — a small movie-blog theme plus a landing and a
// post page — overrides the Platform's generic catch-all renderer for
// `/t/marquee/*`.
//
// Purely presentational: it reads the per-Space keyed collections through the
// shared routing map, defines NO content collections of its own (those stay in
// the root content.config.ts, ADR-0002/0013), and touches none of the
// isolation-critical routing/expansion logic (ADR-0004).
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // The `.mq` theme tokens + base layout, shared by the landing and the post
  // page so neither copy-pastes them. Resolved from this config's own URL so
  // it is unambiguous regardless of layer alias resolution.
  css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
})
