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
      // Nuxt's own alias for the root `shared/` dir; app modules under test import through it.
      { find: /^#shared\//, replacement: fileURLToPath(new URL('shared/', import.meta.url)) },
      { find: /^vue$/, replacement: vuePackage },
    ],
  },
  test: {
    // Platform tests live under `tests/`; Tenant-specific tests live in their
    // layer under `layers/<tenant>/tests/` (see tests/README.md). `pnpm test` and
    // `pnpm test:e2e` select a project by path. The build lives in the e2e
    // project's globalSetup, which vitest runs only when an e2e spec is selected.
    // Shared: e2e flows need it, and unit specs always ran under it.
    testTimeout: 120_000,
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          // Each file re-imported vue, nuxt utils and the scripts' dependency graph
          // in a fresh context, ~10 s of a 40 s run. A spec that touches
          // process.env, PATH or globalThis must restore it itself.
          isolate: false,
          include: ['tests/unit/**/*.spec.ts', 'layers/*/tests/unit/**/*.spec.ts'],
        },
      },
      {
        extends: true,
        test: {
          name: 'e2e',
          include: ['tests/e2e/**/*.spec.ts', 'layers/*/tests/e2e/**/*.spec.ts'],
          globalSetup: ['tests/support/e2e-global-setup.ts'],
        },
      },
    ],
  },
})
