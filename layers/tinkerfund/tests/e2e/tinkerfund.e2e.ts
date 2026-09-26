// L2 e2e assertions for the Tinkerfund Tenant, registered by the platform smoke
// spec so they share its single build (tests/README.md). Flow tests run
// against `qa` (issue #1360); later stories add theirs here.
import { describe, expect, it } from 'vitest'
import { $fetch, createPage, fetch, url } from '@nuxt/test-utils/e2e'
import { expectCleanHydration } from '../../../../tests/support/e2e.ts'

export function registerTinkerfundE2E(): void {
  describe('tinkerfund Tenant', () => {
    it('redirects the Tenant root to prod', async () => {
      const res = await fetch('/t/tinkerfund', { redirect: 'manual' })
      expect(res.status).toBe(302)
      expect(res.headers.get('location')).toBe('/t/tinkerfund/prod')
    })

    for (const space of ['prod', 'qa']) {
      it(`renders the shell in ${space}`, async () => {
        const html = await $fetch(`/t/tinkerfund/${space}`)
        expect(html).toContain('Demo shop — nothing here is real')
        expect(html).toContain('Reset demo')
        expect(html).toMatch(/<header[^>]*>[\s\S]*Tinkerfund[\s\S]*Discover[\s\S]*Categories[\s\S]*Deals/)
        expect(html).toContain(`href="/t/tinkerfund/${space}/cart"`)
        expect(html).toMatch(/<footer[\s\S]*How it works[\s\S]*Theme/)
        expect(html).toContain('class="tf-page"')
      })
    }

    it('renders How it works with its title and social meta', async () => {
      const html = await $fetch('/t/tinkerfund/prod/how-it-works')
      expect(html).toContain('<title>How Tinkerfund works · Tinkerfund</title>')
      expect(html).toContain('<meta property="og:site_name" content="Tinkerfund">')
      expect(html).toContain('<meta name="robots" content="index, follow">')
    })

    it('keeps qa out of search results', async () => {
      expect(await $fetch('/t/tinkerfund/qa/how-it-works')).toContain('<meta name="robots" content="noindex, nofollow">')
    })

    it('hydrates How it works cleanly', async () => {
      await expectCleanHydration('/t/tinkerfund/qa/how-it-works')
    })

    it('404s an unknown Space', async () => {
      expect((await fetch('/t/tinkerfund/staging')).status).toBe(404)
    })

    it('answers an unknown page with the branded 404 inside the shell', async () => {
      const res = await fetch('/t/tinkerfund/qa/no-such-page', { headers: { accept: 'text/html' } })
      expect(res.status).toBe(404)
      const html = await res.text()
      expect(html).toContain('This page isn’t in the catalog')
      expect(html).toContain('Demo shop — nothing here is real')
    })

    it('switches theme, keeps it across a reload, and Reset demo returns it to System', async () => {
      const page = await createPage()
      try {
        await page.goto(url('/t/tinkerfund/qa/how-it-works'), { waitUntil: 'hydration' })
        const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
        const light = 'rgb(242, 244, 243)'
        const dark = 'rgb(12, 16, 19)'

        await page.getByLabel('Light').check()
        expect(await bg()).toBe(light)
        await page.getByLabel('Dark').check()
        expect(await bg()).toBe(dark)

        await page.reload({ waitUntil: 'hydration' })
        expect(await page.evaluate(() => document.documentElement.dataset.tfTheme)).toBe('dark')
        expect(await page.getByLabel('Dark').isChecked()).toBe(true)

        await Promise.all([
          page.waitForEvent('load'),
          page.locator('.demo').getByRole('button', { name: 'Reset demo' }).click(),
        ])
        await page.waitForFunction(() => !document.documentElement.dataset.tfTheme)
        expect(await page.getByLabel('System').isChecked()).toBe(true)
      } finally {
        await page.close()
      }
    })
  })
}
