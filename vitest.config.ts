import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts'],
    // e2e (L2) builds the app and is slow; unit (L0/L1/L3) is fast.
    // `pnpm test` runs unit only; `pnpm test:e2e` runs the smoke render.
    testTimeout: 120_000,
    hookTimeout: 240_000,
  },
})
