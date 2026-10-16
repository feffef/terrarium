// The smoke sweep visits /t/glassbox/guide; the Tenant root is ours (ADR-0016).
import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { expectRedirect, setupL2 } from '../../../../tests/support/e2e.ts'

describe('glassbox Tenant', async () => {
  await setupL2()

  it('redirects the Tenant root /t/glassbox to its guide Space', () =>
    expectRedirect('/t/glassbox', '/t/glassbox/guide'))

  it('sends a Subject folder URL to its card on the guide landing', () =>
    expectRedirect('/t/glassbox/guide/nuxt-vue', '/t/glassbox/guide#nuxt-vue'))

  // Walkthroughs don't lead while they're being worked out (layers/glassbox/GLOSSARY.md).
  it('leads the guide landing with Subjects, Walkthroughs after them and no Start here', async () => {
    const html = await $fetch<string>('/t/glassbox/guide')
    expect(html).not.toContain('Start here')
    expect(html.indexOf('class="directory"')).toBeGreaterThan(0)
    expect(html.indexOf('class="walkthroughs"')).toBeGreaterThan(html.indexOf('class="directory"'))
  })
})
