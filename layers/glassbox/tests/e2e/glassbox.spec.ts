// The smoke sweep visits /t/glassbox/guide; the Tenant root is ours (ADR-0016).
import { describe, it } from 'vitest'
import { expectRedirect, setupL2 } from '../../../../tests/support/e2e.ts'

describe('glassbox Tenant', async () => {
  await setupL2()

  it('redirects the Tenant root /t/glassbox to its guide Space', () =>
    expectRedirect('/t/glassbox', '/t/glassbox/guide'))

  it('sends a Subject folder URL to its card on the guide landing', () =>
    expectRedirect('/t/glassbox/guide/nuxt-vue', '/t/glassbox/guide#nuxt-vue'))
})
