import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // After `nuxt prepare`, .nuxt/routing.mjs holds the build-time routing map
      // (ADR-0014). Tests that use the real default routing map (without injecting
      // a fixture) resolve it here so vitest can find it without the Nuxt alias layer.
      '#routing': resolve('.nuxt/routing.mjs'),
    },
  },
  test: {
    include: ['tests/**/*.spec.ts'],
    // e2e (L2) builds the app and is slow; unit (L0/L1/L3) is fast.
    // `pnpm test` runs unit only; `pnpm test:e2e` runs the smoke render.
    testTimeout: 120_000,
    hookTimeout: 240_000,
  },
})
