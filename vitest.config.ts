import { createRequire } from 'node:module'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// `vue` is Nuxt's dependency, not ours, so pnpm's strict store leaves it
// unresolvable from the repo root — which is why no unit test could import an
// app module that uses reactivity (issue #450). Resolve it through Nuxt's own
// resolution context rather than hardcoding a `.pnpm` path, which changes with
// every version bump. The alias is anchored (`^vue$`) so it can't also rewrite
// `vue/…` subpaths, which are separate packages.
const require = createRequire(import.meta.url)
const vuePackage = dirname(require.resolve('vue/package.json', {
  paths: [dirname(require.resolve('nuxt/package.json'))],
}))

export default defineConfig({
  resolve: {
    alias: [
      // After `nuxt prepare`, .nuxt/routing.mjs holds the build-time routing map
      // (ADR-0014). Tests that use the real default routing map (without injecting
      // a fixture) resolve it here so vitest can find it without the Nuxt alias layer.
      // fileURLToPath+URL keeps resolution correct regardless of invocation cwd.
      { find: '#routing', replacement: fileURLToPath(new URL('.nuxt/routing.mjs', import.meta.url)) },
      // Same wiring for the cross-Tenant catalog (ADR-0025) so a test that reads
      // the real `#catalog` resolves it without the Nuxt alias layer.
      { find: '#catalog', replacement: fileURLToPath(new URL('.nuxt/catalog.mjs', import.meta.url)) },
      { find: /^vue$/, replacement: vuePackage },
    ],
  },
  test: {
    // Platform tests live under `tests/`; Tenant-specific tests live in their
    // layer under `layers/<tenant>/tests/` (see tests/README.md). Only `.spec.ts`
    // is collected — tenant e2e modules use `.e2e.ts` and run via the platform
    // smoke spec's single build, so they are never collected standalone.
    include: ['tests/**/*.spec.ts', 'layers/*/tests/**/*.spec.ts'],
    // e2e (L2) builds the app and is slow; unit (L0/L1/L3) is fast.
    // `pnpm test` runs unit only; `pnpm test:e2e` runs the smoke render.
    testTimeout: 120_000,
    hookTimeout: 240_000,
  },
})
