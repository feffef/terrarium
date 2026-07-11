// Platform-wide Nuxt config (ADR-0001: one Nuxt app / one container).
// The keyed content collections are built dynamically in content.config.ts from
// the Tenant manifests at config-evaluation time (ADR-0002/0013).
export default defineNuxtConfig({
  compatibilityDate: '2025-07-04',

  // Tenants are Nuxt layers (CONTEXT.md). They live under Nuxt's conventional
  // `layers/` directory (ADR-0018), so Nuxt auto-extends every `layers/*` — no
  // hand-curated `extends` list. A Tenant without its own fit-out simply has no
  // presentational code and falls back to the Platform's generic catch-all
  // renderer. Layers are presentation only — they never define content
  // collections (that stays in the root content.config.ts).
  modules: ['./modules/routing', '@nuxt/content', '@nuxt/eslint'],

  content: {
    // Native node:sqlite (Node >= 22.5) — no better-sqlite3 native build in CI.
    experimental: { sqliteConnector: 'native' },
  },

  // Typecheck is run explicitly via `pnpm typecheck` (part of the L0 gate),
  // not on every dev/build, to keep the inner loop fast.
  typescript: {
    typeCheck: false,
    // Tenant layers now live under Nuxt's conventional `layers/` directory
    // (ADR-0018), so Nuxt's generated tsconfig already includes their fit-out
    // (`../layers/*/app/**/*`) and layer config (`../layers/*/nuxt.config.*`) —
    // no manual glob needed for those. The one surface Nuxt does
    // NOT know about is each Tenant's `tenant.config.ts` (the manifest — the
    // primary agent-edit surface, ADR-0002): it is evaluated only via jiti at
    // build time, so a type error there would sail through `pnpm typecheck`
    // (the L0 gate, ADR-0004) and only surface later as a jiti/zod failure —
    // or never, for a silently ignored option. Add just that glob.
    // Path is relative to the buildDir (`.nuxt/`), matching the style of Nuxt's
    // own `../layers/*/app/**/*` entry.
    tsConfig: {
      include: ['../layers/*/tenant.config.*'],
    },
  },
})
