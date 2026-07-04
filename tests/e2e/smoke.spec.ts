// L2 — Smoke render (ADR-0004): every (Tenant, Space) entry route returns 200
// and renders content without erroring. The target list is generated
// (shared/routing.generated.ts), so new Spaces are covered automatically.
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { $fetch, setup } from '@nuxt/test-utils/e2e'
import { entryRoutes } from '../../shared/routing.generated.ts'

describe('L2 smoke render — entry routes', async () => {
  await setup({ rootDir: fileURLToPath(new URL('../..', import.meta.url)) })

  for (const route of entryRoutes) {
    it(`renders ${route}`, async () => {
      const html = await $fetch(route) // throws on non-2xx
      expect(html).toMatch(/<h1[ >]/)
      expect(html).not.toContain('No document at')
    })
  }
})
