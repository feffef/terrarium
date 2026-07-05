// Platform-wide Nuxt config (ADR-0001: one Nuxt app / one container).
// The keyed content collections live in the GENERATED content.config.ts,
// produced from tenant manifests by scripts/generate.ts (ADR-0002).
export default defineNuxtConfig({
  compatibilityDate: '2025-07-04',

  // Tenants are Nuxt layers (CONTEXT.md). Each Tenant that has grown its own
  // fit-out is extended here; a Tenant without a layer falls back to the
  // Platform's generic catch-all renderer. Presentation only — layers never
  // define content collections (that stays in the generated content.config.ts).
  extends: ['./tenants/journal', './tenants/blog'],

  modules: ['@nuxt/content', '@nuxt/eslint'],

  content: {
    // Native node:sqlite (Node >= 22.5) — no better-sqlite3 native build in CI.
    experimental: { sqliteConnector: 'native' },
  },

  // Typecheck is run explicitly via `pnpm typecheck` (part of the L0 gate),
  // not on every dev/build, to keep the inner loop fast.
  typescript: {
    typeCheck: false,
    // Tenant layers live under `tenants/`, not Nuxt's conventional `layers/`,
    // so Nuxt's generated tsconfig includes (`../app/**`, `../layers/*/app/**`)
    // never see them — `nuxt typecheck` (the L0 gate, ADR-0004) would skip all
    // Tenant fit-out code. Add the Tenant glob so every `tenants/*/app/**` file
    // is typechecked. Path is relative to the buildDir (`.nuxt/`), matching the
    // style of Nuxt's own `../layers/*/app/**/*` entry.
    tsConfig: {
      include: ['../tenants/*/app/**/*'],
    },
  },
})
