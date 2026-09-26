// L2 e2e assertions for the Tinkerfund Tenant, registered by the platform smoke
// spec so they share its single build (tests/README.md). Flow tests run
// against `qa` (issue #1360); later stories add theirs here.
import { describe, expect, it } from 'vitest'
import { $fetch, createPage, fetch, url } from '@nuxt/test-utils/e2e'
import { expectCleanHydration } from '../../../../tests/support/e2e.ts'

// The rendered page only: the Nuxt payload after it carries the whole catalog.
const main = (html: string) => html.slice(html.indexOf('<main'), html.indexOf('</main>'))

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
      expect(await page('indoor-hammock')).toMatch(/Unfunded[\s\S]*Ended 1 hour ago[\s\S]*Pledging has closed[\s\S]*Closed/)
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

    // WCAG 2.2 SC 2.4.11: a focused control must not sit wholly under the back bar.
    it('keeps Tab-focused Reward controls above the phone back bar', async () => {
      const page = await createPage()
      try {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto(url('/t/tinkerfund/prod/campaigns/counterclockwise-mug'), { waitUntil: 'hydration' })
        const checked: string[] = []
        for (let i = 0; i < 200; i++) {
          await page.keyboard.press('Tab')
          const focus = await page.evaluate(() => {
            const el = document.activeElement!
            if (!el.closest('#rewards')) return undefined
            return { name: el.textContent?.trim() || el.getAttribute('aria-label') || el.tagName, bottom: el.getBoundingClientRect().bottom, barTop: document.querySelector('.backbar')!.getBoundingClientRect().top }
          })
          if (!focus) {
            if (checked.length) break
            continue
          }
          expect(focus.bottom, focus.name).toBeLessThanOrEqual(focus.barTop)
          checked.push(focus.name)
        }
        expect(checked).toContain('Add to cart')
      } finally {
        await page.close()
      }
    })

    // The same rule at the top edge, under the sticky header and section nav.
    for (const [width, height] of [[390, 844], [1280, 800]] as const) {
      it(`keeps Shift+Tab-focused controls below the section nav at ${width}px`, async () => {
        const page = await createPage()
        try {
          await page.setViewportSize({ width, height })
          await page.goto(url('/t/tinkerfund/prod/campaigns/counterclockwise-mug'), { waitUntil: 'hydration' })
          await page.locator('#updates a').first().focus()
          const checked = new Set<string>()
          for (let i = 0; i < 200; i++) {
            await page.keyboard.press('Shift+Tab')
            const focus = await page.evaluate(() => {
              const el = document.activeElement!
              const section = el.closest('.body > section')
              if (!section) return undefined
              const name = el.textContent?.trim() || el.getAttribute('aria-label') || el.tagName
              return { section: section.id, name, top: el.getBoundingClientRect().top, navBottom: document.querySelector('nav[aria-label="Sections"]')!.getBoundingClientRect().bottom }
            })
            if (!focus) break
            expect(focus.top, `${focus.section}: ${focus.name}`).toBeGreaterThanOrEqual(focus.navBottom)
            checked.add(focus.section)
          }
          expect([...checked]).toEqual(['rewards', 'story'])
        } finally {
          await page.close()
        }
      })
    }

    it('switches figures and sets an Upcoming reminder', async () => {
      const page = await createPage()
      try {
        await page.goto(url('/t/tinkerfund/qa/campaigns/unhurried-kettle'), { waitUntil: 'hydration' })
        // The exact launch time is the visitor's own, so only the browser fills it in.
        await expect.poll(() => page.locator('.readout time').first().getAttribute('title')).toMatch(/2026/)
        expect(await page.locator('.readout .date').textContent()).toMatch(/Launches .*2026/)
        // On desktop the Reward column is always in view, so the nav skips it.
        await page.setViewportSize({ width: 1280, height: 800 })
        expect(await page.locator('nav[aria-label="Sections"] a[href="#rewards"]').isVisible()).toBe(false)
        await page.getByRole('button', { name: /^Figure 2:/ }).click()
        expect(await page.locator('.hero .frame .cap').first().textContent()).toBe('FIG. 2 · TF-9003')
        const notify = page.locator('.readout button[aria-pressed]')
        expect(await notify.getAttribute('aria-pressed')).toBe('false')
        await notify.click()
        expect(await notify.getAttribute('aria-pressed')).toBe('true')
        expect(await notify.textContent()).toContain('Notify me')
        expect(await page.getByRole('button', { name: 'Opens at launch' }).isDisabled()).toBe(true)
      } finally {
        await page.close()
      }
    })

    it('hydrates the Cart cleanly', async () => {
      await expectCleanHydration('/t/tinkerfund/qa/cart')
    })

    it('adds from two Campaigns through the drawer, edits the Cart, and keeps prod’s Cart apart', async () => {
      const page = await createPage()
      try {
        await page.goto(url('/t/tinkerfund/qa/campaigns/goal-exact-stapler'), { waitUntil: 'hydration' })
        const count = page.locator('.head .cart .count')
        const pledged = () => page.locator('.readout .big').textContent()
        const before = await pledged()
        expect(await count.textContent()).toBe('0')
        expect(await page.getByRole('button', { name: 'Add One more staple to cart' }).isDisabled()).toBe(true)

        const stapler = page.getByRole('article', { name: 'One stapler' })
        await stapler.getByRole('button', { name: 'More' }).click()
        await stapler.getByRole('button', { name: 'Add to cart' }).click()
        const drawer = page.getByRole('dialog', { name: 'Added to your Cart' })
        await drawer.waitFor()
        expect(await drawer.textContent()).toMatch(/One stapler[\s\S]*2 × €25[\s\S]*Subtotal · 2 items[\s\S]*€50/)
        await drawer.getByRole('button', { name: 'Close' }).click()

        await page.getByRole('button', { name: 'Add One more staple to cart' }).click()
        expect(await drawer.textContent()).toMatch(/One more staple[\s\S]*1 × €1/)
        await drawer.getByRole('button', { name: 'Close' }).click()
        await page.getByLabel('Amount (EUR)').fill('5')
        await page.getByRole('button', { name: 'Add support' }).click()
        expect(await drawer.textContent()).toMatch(/Bonus support[\s\S]*€5[\s\S]*Subtotal · 3 items[\s\S]*€56/)
        await drawer.getByRole('button', { name: 'Close' }).click()
        expect(await count.textContent()).toBe('3')
        expect(await pledged()).toBe(before)

        await page.goto(url('/t/tinkerfund/qa/campaigns/last-minute-lamp'), { waitUntil: 'hydration' })
        const lamp = page.getByRole('article', { name: 'One lamp' })
        await lamp.getByRole('button', { name: 'Add to cart' }).click()
        await drawer.getByRole('button', { name: 'Close' }).click()
        await lamp.getByRole('button', { name: 'Add to cart' }).click()
        expect(await lamp.getByRole('alert').textContent()).toBe('Max 1 per Backer')

        await page.locator('.head .cart').click()
        await page.waitForURL('**/qa/cart')
        await expect.poll(() => page.locator('h1').textContent()).toMatch(/Your Cart\s*4 items/)
        const groups = page.locator('.group h2')
        expect(await groups.allTextContents()).toEqual(['Goal-Exact Stapler', 'Last-Minute Lamp'])
        await page.getByRole('button', { name: 'More One stapler' }).click()
        await expect.poll(() => page.locator('.summary').textContent()).toMatch(/Subtotal\s*€100\s*Shipping\s*€9\s*Estimated total\s*€109/)
        await page.getByLabel('Estimate shipping to').selectOption('europe')
        expect(await page.locator('.group', { hasText: 'Last-Minute Lamp' }).textContent()).toContain('Doesn’t ship to Europe')

        await page.reload()
        await expect.poll(() => count.textContent()).toBe('5')

        await page.goto(url('/t/tinkerfund/prod/cart'), { waitUntil: 'hydration' })
        await expect.poll(() => page.locator('.empty').textContent()).toContain('Your Cart is empty')
        expect(await count.textContent()).toBe('0')
      } finally {
        await page.close()
      }
    })

    it('Reset demo empties the Cart and removes only Tinkerfund’s keys', async () => {
      const page = await createPage()
      try {
        await page.goto(url('/t/tinkerfund/qa/campaigns/goal-exact-stapler'), { waitUntil: 'hydration' })
        await page.evaluate(() => sessionStorage.setItem('journal:keep', '1'))
        await page.getByRole('article', { name: 'One stapler' }).getByRole('button', { name: 'Add to cart' }).click()
        await page.getByRole('dialog', { name: 'Added to your Cart' }).getByRole('button', { name: 'Close' }).click()
        expect(await page.evaluate(() => sessionStorage.getItem('tinkerfund:qa:overlay'))).toContain('stapler')

        await Promise.all([
          page.waitForEvent('load'),
          page.locator('.foot').getByRole('button', { name: 'Reset demo' }).click(),
        ])
        expect(await page.evaluate(() => sessionStorage.getItem('tinkerfund:qa:overlay'))).toBeNull()
        expect(await page.evaluate(() => sessionStorage.getItem('journal:keep'))).toBe('1')
        expect(await page.locator('.head .cart .count').textContent()).toBe('0')
      } finally {
        await page.close()
      }
    })

    it('hydrates checkout and the Confirmation cleanly', async () => {
      await expectCleanHydration('/t/tinkerfund/qa/checkout')
      await expectCleanHydration('/t/tinkerfund/qa/checkout/done')
    })

    // The One-Button Keypad is €38 short of its goal; one keypad at TINKER10's
    // 10% off (€40.50) tips it over and past its €1,001 Stretch goal.
    it('checks out in three steps with a code, and the Pledge tips a Campaign over its goal', async () => {
      const page = await createPage()
      try {
        await page.goto(url('/t/tinkerfund/qa/campaigns/one-button-keypad'), { waitUntil: 'hydration' })
        expect(await page.locator('.readout .big').textContent()).toBe('€962')
        await page.getByRole('article', { name: 'One keypad' }).getByRole('button', { name: 'Add to cart' }).click()
        await page.getByRole('dialog', { name: 'Added to your Cart' }).getByRole('link', { name: 'Checkout' }).click()

        await page.waitForURL('**/qa/checkout')
        const summary = page.locator('.summary')
        await expect.poll(() => page.locator('h1').textContent()).toBe('Shipping')
        expect(await page.locator('.head').textContent()).toContain('Secure checkout (demo)')
        expect(await page.locator('[aria-current="step"]').textContent()).toContain('Shipping')
        expect(await page.locator('nav, footer').count()).toBe(0)
        expect(await page.getByRole('note').filter({ hasText: 'no payment is taken' }).count()).toBe(1)
        expect(await page.locator('address').textContent()).toContain('1 Test Way')

        await page.getByLabel('Rest of world').check()
        await expect.poll(() => page.locator('.step [role="alert"]').textContent()).toContain('can’t be pledged to Rest of world')
        expect(await page.locator('.pledge').textContent()).toContain('Doesn’t ship to Rest of world')
        await page.getByLabel('Europe').check()
        await expect.poll(() => page.url()).toContain('zone=europe')
        await page.getByRole('link', { name: 'Continue to payment' }).click()

        await expect.poll(() => page.locator('h1').textContent()).toBe('Payment')
        expect(await page.locator('[aria-current="step"]').textContent()).toContain('Payment')
        expect(await page.locator('.step input:not([type="radio"])').count()).toBe(0)
        await page.getByLabel('Promissory handshake').check()
        await page.getByLabel('Discount code').fill('nope')
        await page.getByRole('button', { name: 'Apply' }).click()
        await expect.poll(() => summary.getByRole('alert').textContent()).toBe('That code isn’t valid')
        await page.getByLabel('Discount code').fill('tinker10')
        await page.getByRole('button', { name: 'Apply' }).click()
        await expect.poll(() => summary.textContent()).toMatch(/Subtotal\s*€45\s*Discount\s*−€4.50\s*Shipping\s*€9\s*Total\s*€49.50[\s\S]*Code TINKER10 applied/)

        await page.goBack()
        await expect.poll(() => page.locator('h1').textContent()).toBe('Shipping')
        expect(await page.getByLabel('Europe').isChecked()).toBe(true)
        await page.goForward()
        await expect.poll(() => page.locator('h1').textContent()).toBe('Payment')
        expect(await page.getByLabel('Promissory handshake').isChecked()).toBe(true)
        await page.getByRole('link', { name: 'Review your Pledges' }).click()

        await expect.poll(() => page.locator('h1').textContent()).toBe('Review')
        expect(await page.locator('.choices-made').textContent()).toMatch(/Ship to\s*Europe[\s\S]*Pay with\s*Promissory handshake/)
        await page.getByRole('button', { name: 'Confirm Pledge' }).click()

        await page.waitForURL('**/qa/checkout/done?refs=TF-P-9004')
        await expect.poll(() => page.locator('h1').textContent()).toBe('Your Pledge is in')
        const receipt = await page.locator('.pledge').textContent()
        expect(receipt).toMatch(/Pledge TF-P-9004[\s\S]*One-Button Keypad[\s\S]*1 × One keypad\s*€45[\s\S]*Discount\s*−€4.50\s*Shipping to Europe\s*€9\s*Total\s*€49.50/)
        expect(receipt).toMatch(/You’ll only be charged if this Campaign is funded, when it ends on .*2026/)
        expect(await page.locator('.head .cart .count').textContent()).toBe('0')

        await page.getByRole('link', { name: 'See One-Button Keypad' }).click()
        await page.waitForURL('**/qa/campaigns/one-button-keypad')
        await expect.poll(() => page.locator('.readout .big').textContent()).toBe('€1,002.50')
        const readout = await page.locator('.readout.tf-panel').textContent()
        expect(readout).toContain('Goal reached')
        expect(readout).toContain('100% funded')
        expect(readout).toMatch(/Backers\s*31/)
        expect(await page.locator('.goals li.yes').textContent()).toContain('The button in a second colour')
        expect(await page.getByRole('article', { name: 'One keypad' }).textContent()).toContain('1 of 30 left')

        // Browse counts the visitor's Pledges too, after a full reload.
        await page.goto(url('/t/tinkerfund/qa/discover'), { waitUntil: 'hydration' })
        const card = page.locator('.grid article').filter({ has: page.getByRole('link', { name: 'One-Button Keypad' }) })
        await expect.poll(() => card.locator('.tiles').textContent()).toMatch(/Pledged\s*€1,002.50\s*Funded\s*100%/)
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

    // prod's offsets are relative to real time, so its derived states are fixed:
    // the Mug is the Live Campaign furthest past its goal, the Keyboard ends
    // within 48h, and the Umbrella's Promotion ends soonest (story #1381).
    it('renders Home’s sections in order, the featured Campaign first', async () => {
      const html = main(await $fetch('/t/tinkerfund/prod'))
      expect(html).toMatch(/id="tf-featured"[^>]*>Counterclockwise Mug</)
      expect(html).toMatch(/340<small[^>]*>% funded/)
      const order = ['tf-featured', 'tf-ending', '15% off the Rain-Aware Umbrella', 'tf-categories-h', 'tf-popular', 'tf-launched']
      const at = order.map((marker) => html.indexOf(marker))
      expect(at.every((i) => i > 0), `missing: ${order.filter((_, i) => at[i]! < 0).join(', ')}`).toBe(true)
      expect(at).toEqual([...at].sort((a, b) => a - b))
      const ending = html.slice(at[1], at[2])
      expect(ending).toContain('One-Key Keyboard')
      expect(ending).not.toContain('Counterclockwise Mug')
      const popular = html.slice(at[4], at[5])
      expect(popular).toMatch(/TF-0001[\s\S]*TF-0006[\s\S]*TF-0003[\s\S]*TF-0004/)
      expect(popular).not.toContain('TF-0005')
    })

    it('filters the index table by category', async () => {
      const page = await createPage()
      try {
        await page.goto(url('/t/tinkerfund/prod'), { waitUntil: 'hydration' })
        const table = page.locator('.index')
        await table.getByRole('button', { name: 'Kitchen' }).click()
        expect(await table.locator('tbody .inv a').allTextContents()).toEqual(['Counterclockwise Mug'])
        expect(await table.getByRole('button', { name: 'Kitchen' }).getAttribute('aria-pressed')).toBe('true')
      } finally {
        await page.close()
      }
    })

    it('renders Discover straight from its URL query', async () => {
      const html = main(await $fetch('/t/tinkerfund/qa/discover?category=workshop&state=live'))
      expect(html).toContain('1 Campaign<')
      expect(html).toContain('The Self-Assembling Workbench')
      expect(html).not.toContain('Unhurried Kettle')
    })

    it('filters, sorts and keeps both in the URL, then opens a Campaign', async () => {
      const page = await createPage()
      try {
        await page.setViewportSize({ width: 1280, height: 900 })
        await page.goto(url('/t/tinkerfund/qa/discover'), { waitUntil: 'hydration' })
        const side = page.locator('.side')
        const titles = () => page.locator('.grid h3').allTextContents()
        expect(await titles()).toHaveLength(7)

        await side.getByLabel('Ending soon').check()
        await expect.poll(() => new URL(page.url()).search).toBe('?soon=1')
        expect(await titles()).toEqual(['Last-Minute Lamp'])

        await side.getByLabel('Ending soon').uncheck()
        await side.getByLabel('Live', { exact: true }).check()
        await page.getByLabel('Sort').selectOption('newest')
        await expect.poll(() => new URL(page.url()).search).toBe('?state=live&sort=newest')
        const live = ['The Self-Assembling Workbench That Has Been Assembling Itself Since the Previous Financial Year', 'Goal-Exact Stapler', 'Last-Minute Lamp', 'One-Button Keypad']
        expect(await titles()).toEqual(live)

        await page.goto(page.url(), { waitUntil: 'hydration' })
        expect(await side.getByLabel('Live', { exact: true }).isChecked()).toBe(true)
        expect(await page.getByLabel('Sort').inputValue()).toBe('newest')
        expect(await titles()).toEqual(live)

        await page.locator('.grid').getByRole('link', { name: 'Goal-Exact Stapler' }).click()
        await expect.poll(() => new URL(page.url()).pathname).toBe('/t/tinkerfund/qa/campaigns/goal-exact-stapler')
      } finally {
        await page.close()
      }
    })

    it('opens the filters in a drawer on a phone', async () => {
      const page = await createPage()
      try {
        await page.setViewportSize({ width: 390, height: 844 })
        await page.goto(url('/t/tinkerfund/qa/discover'), { waitUntil: 'hydration' })
        expect(await page.locator('.side').isVisible()).toBe(false)
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
        await page.getByRole('button', { name: 'Filters' }).click()
        const drawer = page.getByRole('dialog', { name: 'Filters' })
        await drawer.getByLabel('On Deal').check()
        await expect.poll(() => new URL(page.url()).search).toBe('?deal=1')
        await drawer.getByRole('button', { name: 'Show 1 Campaign' }).click()
        await expect.poll(() => drawer.isVisible()).toBe(false)
        expect(await page.locator('.grid h3').allTextContents()).toEqual(['Goal-Exact Stapler'])
      } finally {
        await page.close()
      }
    })

    // The index table is wider than a phone; it must scroll inside its own frame.
    for (const route of ['/t/tinkerfund/prod', '/t/tinkerfund/qa']) {
      it(`fits ${route} on a phone without sideways scrolling`, async () => {
        const page = await createPage()
        try {
          await page.setViewportSize({ width: 390, height: 844 })
          await page.goto(url(route), { waitUntil: 'hydration' })
          expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390)
        } finally {
          await page.close()
        }
      })
    }

    it('shows the empty state when nothing matches', async () => {
      const html = await $fetch('/t/tinkerfund/qa/category/empty-shelf')
      expect(html).toMatch(/<h1[^>]*>Empty Shelf<\/h1>/)
      expect(html).toContain('No Campaign is filed here.')
      expect(html).toContain('No Campaigns match these filters')
    })

    it('answers an unknown category with the branded 404', async () => {
      const res = await fetch('/t/tinkerfund/qa/category/no-such-category', { headers: { accept: 'text/html' } })
      expect(res.status).toBe(404)
      expect(await res.text()).toContain('This page isn’t in the catalog')
    })

    it('lists Active Deals with their Campaign and Scheduled ones as starting soon', async () => {
      const html = main(await $fetch('/t/tinkerfund/qa/deals'))
      expect(html).toMatch(/A tenth off the stapler \(active, automatic\)[\s\S]*Applied automatically\.[\s\S]*Goal-Exact Stapler/)
      expect(html).toMatch(/Starting soon[\s\S]*Lamp week \(scheduled\)[\s\S]*Starts in 2 days 0 hours/)
      expect(html).not.toContain('EXPIRED5')
    })

    for (const route of ['/t/tinkerfund/qa/discover?sort=funded', '/t/tinkerfund/qa/deals', '/t/tinkerfund/prod']) {
      it(`hydrates ${route} cleanly`, async () => {
        await expectCleanHydration(route)
      })
    }

    it('shows the browse components in the gallery', async () => {
      const html = await $fetch('/t/tinkerfund/qa')
      for (const name of ['TinkerfundCampaignCard', 'TinkerfundIndexTable', 'TinkerfundBrowseFilters', 'TinkerfundDealBanner']) {
        expect(html).toMatch(new RegExp(`<code[^>]*>${name}</code>`))
      }
    })
  })
}
