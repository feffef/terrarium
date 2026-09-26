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

    it('lists the categories collection in the header', async () => {
      const html = await $fetch('/t/tinkerfund/prod/how-it-works')
      expect(html).toMatch(/category\/kitchen[\s\S]*category\/desk[\s\S]*category\/outdoors/)
    })

    // qa pins now 36h before this Campaign ends (issue #1364).
    it('derives a Campaign’s state and countdown from qa’s pinned now', async () => {
      const html = await $fetch('/t/tinkerfund/qa/campaigns/last-minute-lamp')
      expect(html).toContain('TF-9001')
      expect(html).toMatch(/data-state="live"[^>]*>Live</)
      expect(html).toContain('Ending soon')
      expect(html).toContain('Goal reached')
      expect(html).toContain('125% funded')
      expect(html).toMatch(/<time [^>]*datetime="2026-06-03T00:00:00.000Z"[^>]*>1 day 12 hours to go<\/time>/)
    })

    // Worked out by hand from each fixture's offsets against qa's pinned now.
    it('shows every qa Campaign’s status in the component gallery', async () => {
      const html = await $fetch('/t/tinkerfund/qa')
      expect(html).toMatch(/<h1[^>]*>Component gallery<\/h1>/)
      expect(html).toMatch(/<time datetime="2026-06-01T12:00:00.000Z"[^>]*>2026-06-01 12:00 UTC<\/time>/)
      const status = (registry: string) => html.match(new RegExp(`${registry}</span>([\\s\\S]*?)</div>`))?.[1] ?? ''
      expect(status('TF-9001')).toMatch(/Live<[\s\S]*Ending soon[\s\S]*Goal reached[\s\S]*125% funded[\s\S]*1 day 12 hours to go/)
      expect(status('TF-9002')).toMatch(/Live<[\s\S]*Goal reached[\s\S]*100% funded[\s\S]*21 days 0 hours to go/)
      expect(status('TF-9003')).toMatch(/Upcoming<[\s\S]*0% funded[\s\S]*Launches in 3 days 0 hours/)
      expect(status('TF-9004')).toMatch(/Live<[\s\S]*0% funded[\s\S]*28 days 0 hours to go/)
      expect(status('TF-9005')).toMatch(/Ended<[\s\S]*>Funded<[\s\S]*12480% funded/)
      expect(status('TF-9006')).toMatch(/Ended<[\s\S]*>Unfunded<[\s\S]*23% funded/)
      expect(await $fetch('/t/tinkerfund/prod')).not.toContain('Component gallery')
    })

    for (const [colorScheme, surface, ink] of [
      ['light', 'rgb(255, 255, 255)', 'rgb(17, 23, 27)'],
      ['dark', 'rgb(19, 25, 29)', 'rgb(225, 231, 234)'],
    ] as const) {
      it(`renders the gallery in the ${colorScheme} theme`, async () => {
        const page = await createPage()
        try {
          await page.emulateMedia({ colorScheme })
          await page.goto(url('/t/tinkerfund/qa'), { waitUntil: 'hydration' })
          const specimen = await page.locator('.specimen').first().evaluate((el) => {
            const s = getComputedStyle(el)
            return { surface: s.backgroundColor, ink: s.color }
          })
          expect(specimen).toEqual({ surface, ink })
        } finally {
          await page.close()
        }
      })
    }

    it('hydrates a Campaign page cleanly', async () => {
      await expectCleanHydration('/t/tinkerfund/qa/campaigns/last-minute-lamp')
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

    // Chromium's default placeholder grey misses 4.5:1 on --tf-bg, and the
    // placeholder is the field's only visible label.
    it('draws the search placeholder in the muted token', async () => {
      const page = await createPage()
      try {
        await page.emulateMedia({ colorScheme: 'dark' })
        await page.goto(url('/t/tinkerfund/qa/how-it-works'), { waitUntil: 'hydration' })
        const placeholder = await page.locator('.head input[name="q"]').first().evaluate((el) => {
          const s = getComputedStyle(el, '::placeholder')
          return { color: s.color, opacity: s.opacity }
        })
        expect(placeholder).toEqual({ color: 'rgb(143, 156, 164)', opacity: '1' })
      } finally {
        await page.close()
      }
    })

    // WCAG 1.4.11: the ring must sit on the surface, not over the checked
    // option's ink fill.
    it('rings the theme switch on the surface when tabbed into', async () => {
      const page = await createPage()
      try {
        await page.emulateMedia({ colorScheme: 'dark' })
        await page.goto(url('/t/tinkerfund/qa/how-it-works'), { waitUntil: 'hydration' })
        await page.locator('.foot').getByRole('button', { name: 'Reset demo' }).focus()
        await page.keyboard.press('Tab')
        expect(await page.getByLabel('System').evaluate((el) => el === document.activeElement)).toBe(true)
        const ring = await page.locator('.theme .options').evaluate((el) => {
          const s = getComputedStyle(el)
          return { style: s.outlineStyle, color: s.outlineColor, offset: s.outlineOffset }
        })
        expect(ring).toEqual({ style: 'solid', color: 'rgb(138, 180, 255)', offset: '2px' })
        const checkedSpan = await page.locator('.theme input:checked + span').evaluate((el) => getComputedStyle(el).outlineStyle)
        expect(checkedSpan).toBe('none')
      } finally {
        await page.close()
      }
    })

    it('switches theme, keeps it across a reload, and Reset demo returns it to System', async () => {
      const page = await createPage()
      try {
        const open = () => page.goto(url('/t/tinkerfund/qa/how-it-works'), { waitUntil: 'hydration' })
        await open()
        const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
        const light = 'rgb(242, 244, 243)'
        const dark = 'rgb(12, 16, 19)'

        await page.getByLabel('Light').check()
        expect(await bg()).toBe(light)
        await page.getByLabel('Dark').check()
        expect(await bg()).toBe(dark)
        expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark')

        await open()
        expect(await page.evaluate(() => document.documentElement.dataset.tfTheme)).toBe('dark')
        expect(await page.getByLabel('Dark').isChecked()).toBe(true)

        await Promise.all([
          page.waitForEvent('load'),
          page.locator('.demo').getByRole('button', { name: 'Reset demo' }).click(),
        ])
        expect(await page.evaluate(() => document.documentElement.dataset.tfTheme)).toBeUndefined()
        expect(await page.evaluate(() => sessionStorage.getItem('tinkerfund:theme'))).toBeNull()
        expect(await bg()).toBe(light)
      } finally {
        await page.close()
      }
    })
  })
}
