// The smoke sweep visits /t/glassbox/guide; the Tenant root is ours (ADR-0016).
import { describe, expect, it } from 'vitest'
import { $fetch } from '@nuxt/test-utils/e2e'
import { expectRedirect, setupL2, withRendered } from '../../../../tests/support/e2e.ts'

describe('glassbox Tenant', async () => {
  await setupL2()

  it('redirects the Tenant root /t/glassbox to its guide Space', () =>
    expectRedirect('/t/glassbox', '/t/glassbox/guide'))

  it('serves a Subject folder URL as a page listing its Lessons with their descriptions', async () => {
    const html = await $fetch<string>('/t/glassbox/guide/nuxt-vue')
    expect(html).toContain('id="gb-nav"')
    expect(html).toMatch(/<h1[^>]*>Nuxt (?:&amp;|&) Vue<\/h1>/)
    expect(html).toContain('href="/t/glassbox/guide/nuxt-vue/layers"')
    expect(html).toMatch(/\d+ Lessons/)
    expect(html).toContain('How Nuxt merges several folders into one app')
  })

  it("points a Lesson's Subject chip at the Subject page", async () => {
    expect(await $fetch<string>('/t/glassbox/guide/nuxt-vue/layers')).toContain('href="/t/glassbox/guide/nuxt-vue"')
  })

  // The landing is the overview, framed like every page, with the sidebar as its menu.
  it('serves the guide landing as the overview with the sidebar', async () => {
    const html = await $fetch<string>('/t/glassbox/guide')
    expect(html).toContain('id="gb-nav"')
    expect(html).toContain('How a change happens')
  })

  // Reading progress lives in the visitor's browser, applied after mount (GLOSSARY.md, Reading progress).
  it('ticks a Lesson once Where next is scrolled into view and moves its link into Lessons already read', async () => {
    const layers = '/t/glassbox/guide/nuxt-vue/layers'
    const routing = '/t/glassbox/guide/nuxt-vue/file-routing'
    expect(await $fetch<string>(layers)).not.toContain('Lessons already read')
    await withRendered(layers, async (page) => {
      await page.locator('#where-next').scrollIntoViewIfNeeded()
      await page.locator(`#gb-nav a[href="${layers}"] .tick`).waitFor()
      expect(await page.locator('#gb-nav summary:has-text("Nuxt") .count').first().textContent()).toMatch(/^1\/\d+$/)
      expect(await page.locator('.read').count()).toBe(0)
      expect(await page.evaluate("localStorage.getItem('glassbox:read')")).toBe('["/nuxt-vue/layers"]')

      // File routing lists Nuxt layers in Where next; once read, it moves below.
      await page.locator(`#gb-nav a[href="${routing}"]`).click()
      await page.locator('.read').waitFor()
      expect(await page.locator('.read li').allTextContents()).toEqual(['Nuxt & VueNuxt layers'])
      expect(await page.locator('.read li .gb-tick').count()).toBe(1)
      expect(await page.locator(`.gb-next a[href="${layers}"]`).count()).toBe(0)

      await page.locator('.read .reset').click()
      expect(await page.locator('.read').count()).toBe(0)
      expect(await page.locator(`.gb-next a[href="${layers}"]`).count()).toBe(1)
      expect(await page.evaluate("localStorage.getItem('glassbox:read')")).toBeNull()
    })
  })

  // The row mark is a CSS pseudo-element no unit test sees: a book for a Glass Box page, → for the Journal.
  // This Lesson's Where next lists both kinds.
  it('ends a Where next row in a book for a Glass Box page and in an arrow for another place', async () => {
    await withRendered('/t/glassbox/guide/agents/cloud-sessions', async (page) => {
      const rows = (await page.evaluate(`[...document.querySelectorAll('.gb-next li')].map((li) => {
        const after = getComputedStyle(li, '::after')
        return { guide: !!li.querySelector('a[href^="/t/glassbox/"]'), content: after.content, mask: after.maskImage }
      })`)) as { guide: boolean, content: string, mask: string }[]
      const guide = rows.filter((row) => row.guide)
      const other = rows.filter((row) => !row.guide)
      expect(guide.length).toBeGreaterThan(0)
      expect(other.length).toBeGreaterThan(0)
      for (const row of guide) expect(row).toMatchObject({ content: '""', mask: expect.stringContaining('url(') })
      for (const row of other) expect(row).toMatchObject({ content: '"→"', mask: 'none' })
    })
  })

  it('ticks an opened Lesson on its Subject page and counts it read', async () => {
    const subject = '/t/glassbox/guide/nuxt-vue'
    const layers = `${subject}/layers`
    await withRendered(layers, async (page) => {
      await page.locator('#where-next').scrollIntoViewIfNeeded()
      await page.locator(`#gb-nav a[href="${layers}"] .tick`).waitFor()
      await page.goto(new URL(subject, page.url()).href)
      await page.locator(`.list a[href="${layers}"] .tick`).waitFor()
      expect(await page.locator('article .count').textContent()).toMatch(/^1 of \d+ read$/)
    })
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
