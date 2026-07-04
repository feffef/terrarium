// Platform-wide Nuxt config (ADR-0001: one Nuxt app / one container).
// The keyed content collections live in the GENERATED content.config.ts,
// produced from tenant manifests by scripts/generate.ts (ADR-0002).
export default defineNuxtConfig({
  compatibilityDate: '2025-07-04',

  modules: ['@nuxt/content', '@nuxt/eslint'],

  content: {
    // Native node:sqlite (Node >= 22.5) — no better-sqlite3 native build in CI.
    experimental: { sqliteConnector: 'native' },
  },

  // Typecheck is run explicitly via `pnpm typecheck` (part of the L0 gate),
  // not on every dev/build, to keep the inner loop fast.
  typescript: { typeCheck: false },
})
