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

    // Offsets are relative to real time, so prod's states hold on any day.
    for (const [slug, action] of [
      ['counterclockwise-mug', 'Back this Campaign'],
      ['solo-pea-rest', 'Pledging has closed'],
      ['one-key-keyboard', 'Back this Campaign'],
      ['emotional-support-rock', 'Notify me'],
      ['pocket-sundial-with-snooze', 'Pledging has closed'],
      ['rain-aware-umbrella', 'Back this Campaign'],
    ] as const) {
      it(`renders the prod Campaign page for ${slug}`, async () => {
        const html = await $fetch(`/t/tinkerfund/prod/campaigns/${slug}`)
        expect(html).toMatch(/<nav[^>]*aria-label="Breadcrumb"[\s\S]*>Home<[\s\S]*category\/[\s\S]*aria-current="page"/)
        expect(html).toMatch(/FIG\. 1 · TF-000\d/)
        expect(html).toMatch(/<h1[^>]*>/)
        expect(html).toMatch(/aria-label="Sections"[\s\S]*href="#story"[\s\S]*href="#rewards"[\s\S]*href="#updates"[\s\S]*href="#comments"/)
        expect(html).toMatch(/<caption[^>]*>Specifications<\/caption>/)
        expect(html).toContain(action)
        expect(html).toContain('<meta property="og:type" content="website">')
      })
    }

    it('shows each qa edge case on its Campaign page', async () => {
      const page = (slug: string) => $fetch(`/t/tinkerfund/qa/campaigns/${slug}`)
      const lamp = await page('last-minute-lamp')
      expect(lamp).toContain('2 of 40 left')
      expect(lamp).toContain('Max 1 per Backer')
      expect(lamp).toContain('Digital, nothing ships')
      expect(lamp).toContain('Est. delivery Jul 2026')
      expect(lamp).toMatch(/Test Inventor<\/b><span[^>]*>Inventor</)
      expect(lamp).toMatch(/Spare bulb[\s\S]*Sold out/)
      expect(lamp).toMatch(/<li class="yes"[^>]*>[\s\S]*A dimmer/)

      const stapler = await page('goal-exact-stapler')
      expect(stapler).toContain('10% off, applied automatically')
      expect(stapler).toMatch(/Early-bird stapler[\s\S]*?<fieldset disabled[\s\S]*?Sold out/)

      expect(await page('unhurried-kettle')).toMatch(/Notify me[\s\S]*Opens at launch/)
      expect(await page('indoor-hammock')).toMatch(/Unfunded[\s\S]*Pledging has closed[\s\S]*Closed/)
      expect(await page('self-assembling-workbench')).toContain('3 of 3 left')
    })

    it('renders an Update with breadcrumbs back to its Campaign', async () => {
      const html = await $fetch('/t/tinkerfund/qa/campaigns/last-minute-lamp/updates/1')
      expect(html).toMatch(/>Home<[\s\S]*>Desk<[\s\S]*href="\/t\/tinkerfund\/qa\/campaigns\/last-minute-lamp"[^>]*>Last-Minute Lamp<[\s\S]*aria-current="page"[^>]*>Update #1</)
      expect(html).toMatch(/<h1[^>]*>Tooling is done<\/h1>/)
      expect(html).toContain('<meta property="og:type" content="article">')
    })

    it('hydrates a prod Campaign page cleanly', async () => {
      await expectCleanHydration('/t/tinkerfund/prod/campaigns/counterclockwise-mug')
    })

    it('walks a Campaign on a phone: back bar, section nav, Reward options, an Update', async () => {
      const page = await createPage()
      try {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto(url('/t/tinkerfund/qa/campaigns/last-minute-lamp'), { waitUntil: 'hydration' })
        const current = () => page.locator('nav[aria-label="Sections"] [aria-current]').textContent()
        expect(await current()).toContain('Story')

        const bar = page.locator('.backbar')
        expect((await bar.boundingBox())!.y + (await bar.boundingBox())!.height).toBeCloseTo(844, -1)
        await bar.getByRole('link', { name: 'Back this Campaign' }).click()
        await expect.poll(current).toContain('Rewards')

        const lamp = page.getByRole('article', { name: 'One lamp' })
        await lamp.getByText('White').click()
        expect(await lamp.getByLabel('White').isChecked()).toBe(true)
        expect(await lamp.getByRole('button', { name: 'More' }).count()).toBe(0)
        expect(await lamp.getByRole('button', { name: 'Add to cart' }).isEnabled()).toBe(true)

        await page.locator('nav[aria-label="Sections"]').getByRole('link', { name: /Comments/ }).click()
        await expect.poll(current).toContain('Comments')

        await page.getByRole('link', { name: /Tooling is done/ }).click()
        await page.waitForURL('**/campaigns/last-minute-lamp/updates/1')
        await page.getByRole('navigation', { name: 'Breadcrumb' }).getByRole('link', { name: 'Last-Minute Lamp' }).click()
        await page.waitForURL('**/campaigns/last-minute-lamp')
      } finally {
        await page.close()
      }
    })

    it('switches figures and sets an Upcoming reminder', async () => {
      const page = await createPage()
      try {
        await page.goto(url('/t/tinkerfund/qa/campaigns/unhurried-kettle'), { waitUntil: 'hydration' })
        await page.getByRole('button', { name: /^Figure 2:/ }).click()
        expect(await page.locator('.hero .frame .cap').first().textContent()).toBe('FIG. 2 · TF-9003')
        const notify = page.locator('.readout button[aria-pressed]')
        expect(await notify.textContent()).toContain('Notify me')
        await notify.click()
        expect(await notify.getAttribute('aria-pressed')).toBe('true')
        expect(await page.getByRole('button', { name: 'Opens at launch' }).isDisabled()).toBe(true)
      } finally {
        await page.close()
      }
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
