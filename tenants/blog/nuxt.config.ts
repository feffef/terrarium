// The Blog Tenant's Nuxt layer (CONTEXT.md: "a Tenant is implemented as a Nuxt
// layer"). Its fit-out — a simple blog theme plus a Persona landing and a post
// page — overriding the Platform's generic catch-all renderer for `/t/blog/*`.
//
// Purely presentational: it reads the already-generated, per-Space keyed
// collections through the shared routing map, defines NO content collections of
// its own (those stay in the generated root content.config.ts, ADR-0002/0007), and
// touches none of the isolation-critical routing/generator logic (ADR-0004).
import { fileURLToPath } from 'node:url'

export default defineNuxtConfig({
  // The `.bl` theme tokens + base layout, shared by the Persona landing and the
  // standalone post page so neither copy-pastes them. Resolved from this config's
  // own URL so it is unambiguous regardless of layer alias resolution.
  css: [fileURLToPath(new URL('./app/assets/theme.css', import.meta.url))],
})
