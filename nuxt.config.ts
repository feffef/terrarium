// Platform-wide Nuxt config (ADR-0001: one Nuxt app / one container).
// The keyed content collections are built dynamically in content.config.ts from
// the Tenant manifests at config-evaluation time (ADR-0002/0013).
export default defineNuxtConfig({
  compatibilityDate: '2025-07-04',

  // Tenants are Nuxt layers (CONTEXT.md). Each Tenant that has grown its own
  // fit-out is extended here; a Tenant without a layer falls back to the
  // Platform's generic catch-all renderer. Presentation only — layers never
  // define content collections (that stays in the root content.config.ts).
  extends: ['./tenants/journal', './tenants/blog'],

  modules: ['@nuxt/content', '@nuxt/eslint'],

  content: {
    // Native node:sqlite (Node >= 22.5) — no better-sqlite3 native build in CI.
    experimental: { sqliteConnector: 'native' },
  },

  // Typecheck is run explicitly via `pnpm typecheck` (part of the L0 gate),
  // not on every dev/build, to keep the inner loop fast.
  typescript: { typeCheck: false },
})
