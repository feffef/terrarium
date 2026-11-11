// The smoke sweep visits /t/glassbox/guide; the Tenant root is ours (ADR-0016).
import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { expectRedirect, setupL2 } from '../../../../tests/support/e2e.ts'

describe('glassbox Tenant', async () => {
  await setupL2()

  it('redirects the Tenant root /t/glassbox to its guide Space', () =>
    expectRedirect('/t/glassbox', '/t/glassbox/guide'))

  it('sends a Subject folder URL to its first Lesson', () =>
    expectRedirect('/t/glassbox/guide/nuxt-vue', '/t/glassbox/guide/nuxt-vue/layers'))

  // The landing is the overview, framed like every page, with the sidebar as its menu.
  it('serves the guide landing as the overview with the sidebar', async () => {
    const html = await $fetch<string>('/t/glassbox/guide')
    expect(html).toContain('id="gb-nav"')
    expect(html).toContain('How a change happens')
  })

  // The workshop is a live record of one page: no Subject menu, no edition date, and a way back to the guide.
  it('serves the workshop without a sidebar or edition date, linking back to the guide', async () => {
    const html = await $fetch<string>('/t/glassbox/workshop')
    expect(html).not.toContain('id="gb-nav"')
    expect(html).not.toContain('Last updated')
    expect(html).toMatch(/<a[^>]*class="gb-brand"[^>]*href="\/t\/glassbox\/guide"|<a[^>]*href="\/t\/glassbox\/guide"[^>]*class="gb-brand"/)
    expect(html).toContain('Back to the guide')
    expect(html).toContain('id="lately"')
    expect(html).toContain('class="lately"')
  })
})
