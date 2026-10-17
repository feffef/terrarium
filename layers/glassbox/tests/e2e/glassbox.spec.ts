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

  it('collects every Lesson\'s Try it exercise on one guide page, and nowhere in drafts', async () => {
    const html = await $fetch<string>('/t/glassbox/guide/try-it')
    expect(html).toContain('Try it in your project')
    expect(html).toContain('Find the doc your agent most often forgets')
    expect(html).toContain('href="/t/glassbox/guide/claude-code/claude-md"')
    expect((await $fetch<string>('/t/glassbox/guide')).indexOf('/t/glassbox/guide/try-it')).toBeGreaterThan(0)
    await expect($fetch('/t/glassbox/drafts/try-it')).rejects.toThrow()
  })
})
