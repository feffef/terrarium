// L2 e2e for the Tinkerfund Tenant: browser flows. Serves the gate's build via
// `setupL2()` and never builds (tests/README.md). Browser flows run only in qa,
// whose pinned now keeps every countdown and funded state still, and each
// browser test costs the gate serial time, so they are few and wide (issue
// #1360). The server-rendered checks are in tinkerfund.spec.ts, so the two run
// in parallel.
import type { Page } from 'playwright-core'
import { describe, expect, it } from 'vitest'
import { createPage, url, type NuxtPage } from '@nuxt/test-utils/e2e'
import { collectUnknownElementTags, setupL2 } from '../../../../tests/support/e2e.ts'

interface Flow {
  page: NuxtPage
  /** A full load of a qa path, so it hydrates. */
  visit: (path: string) => Promise<void>
  reload: () => Promise<void>
  h1: () => Promise<string | null>
}

// Errors are collected for the whole flow, so every full load in it doubles as
// a clean-hydration check (tests/support/e2e.ts' expectCleanHydration).
function flow(name: string, run: (flow: Flow) => Promise<void>): void {
  it(name, async () => {
    const page = await createPage()
    const errors: string[] = []
    // A full navigation aborts what the page it leaves is still fetching (the
    // content database, Nuxt's app manifest), and that page logs the abort; the
    // next document's DOMContentLoaded ends the gap (same-document navigations
    // of the old page can still fire in between).
    let leaving = false
    page.on('request', (req) => { if (req.isNavigationRequest() && req.frame() === page.mainFrame()) leaving = true })
    page.on('domcontentloaded', () => { leaving = false })
    const report = (error: string) => { if (!leaving) errors.push(`${page.url()} ${error}`) }
    page.on('console', (msg) => { if (msg.type() === 'error') report(`console.error: ${msg.text()}`) })
    page.on('pageerror', (err) => { report(`pageerror: ${err.message}`) })
    const load = async (to: string) => {
      leaving = true
      await page.goto(to, { waitUntil: 'hydration' })
      expect(await page.locator('h1').count(), to).toBeGreaterThan(0)
      expect(await collectUnknownElementTags(page), to).toEqual([])
    }
    try {
      await run({ page, visit: (path) => load(url(`/t/tinkerfund/qa${path}`)), reload: () => load(page.url()), h1: () => page.locator('h1').textContent() })
      expect(errors).toEqual([])
    } finally {
      await page.close()
    }
  })
}

const scrollWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth)

describe('tinkerfund Tenant', async () => {
  await setupL2()

  describe('browser flows in qa', () => {
    flow('shell: themes, the search placeholder, the theme switch, and Reset demo keeping the theme', async ({ page, visit }) => {
      const specimen = () => page.locator('.specimen').first().evaluate((el) => {
        const s = getComputedStyle(el)
        return { surface: s.backgroundColor, ink: s.color }
      })
      await page.emulateMedia({ colorScheme: 'light' })
      await visit('/gallery/status')
      await expect.poll(specimen).toEqual({ surface: 'rgb(255, 255, 255)', ink: 'rgb(17, 23, 27)' })
      await page.emulateMedia({ colorScheme: 'dark' })
      await expect.poll(specimen).toEqual({ surface: 'rgb(19, 25, 29)', ink: 'rgb(225, 231, 234)' })

      // The index table is wider than a phone; it must scroll inside its own frame.
      await visit('/gallery/index-table')
      await page.setViewportSize({ width: 390, height: 844 })
      expect(await scrollWidth(page)).toBeLessThanOrEqual(390)
      await page.setViewportSize({ width: 1280, height: 800 })

      // Chromium's default placeholder grey misses 4.5:1 on --tf-bg, and the
      // placeholder is the field's only visible label.
      await visit('/how-it-works')
      const placeholder = await page.locator('.head input[name="q"]').first().evaluate((el) => {
        const s = getComputedStyle(el, '::placeholder')
        return { color: s.color, opacity: s.opacity }
      })
      expect(placeholder).toEqual({ color: 'rgb(143, 156, 164)', opacity: '1' })

      // WCAG 1.4.11: the ring must sit on the surface, not over the checked option's ink fill.
      // Reset demo stays away until the visitor has changed something (checked below).
      expect(await page.getByRole('button', { name: 'Reset demo' }).count()).toBe(0)
      await page.locator('.foot').getByRole('link', { name: 'Deals' }).focus()
      await page.keyboard.press('Tab')
      expect(await page.getByLabel('System').evaluate((el) => el === document.activeElement)).toBe(true)
      const ring = await page.locator('.theme .options').evaluate((el) => {
        const s = getComputedStyle(el)
        return { style: s.outlineStyle, color: s.outlineColor, offset: s.outlineOffset }
      })
      expect(ring).toEqual({ style: 'solid', color: 'rgb(138, 180, 255)', offset: '2px' })
      expect(await page.locator('.theme input:checked + span').evaluate((el) => getComputedStyle(el).outlineStyle)).toBe('none')

      await page.emulateMedia({ colorScheme: 'light' })
      const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)
      const light = 'rgb(242, 244, 243)'
      const dark = 'rgb(12, 16, 19)'
      await page.getByLabel('Light').check()
      expect(await bg()).toBe(light)
      await page.getByLabel('Dark').check()
      expect(await bg()).toBe(dark)
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe('dark')

      await visit('/how-it-works')
      expect(await page.evaluate(() => document.documentElement.dataset.tfTheme)).toBe('dark')
      expect(await page.getByLabel('Dark').isChecked()).toBe(true)
      // A theme pick is a preference, not demo state: it doesn't reveal Reset demo.
      expect(await page.getByRole('button', { name: 'Reset demo' }).count()).toBe(0)

      // Reset clears the demo Backer's actions but no other Tenant's keys, and not the theme.
      await visit('/campaigns/goal-exact-stapler')
      await page.evaluate(() => sessionStorage.setItem('journal:keep', '1'))
      expect(await page.getByRole('button', { name: 'Reset demo' }).count()).toBe(0)
      await page.getByRole('article', { name: 'One stapler' }).getByRole('button', { name: 'Add to cart' }).click()
      await page.getByRole('dialog', { name: 'Added to your Cart' }).getByRole('button', { name: 'Close' }).click()
      expect(await page.evaluate(() => sessionStorage.getItem('tinkerfund:qa:actions'))).toContain('stapler')
      await expect.poll(() => page.getByRole('button', { name: 'Reset demo' }).count()).toBe(2)
      await Promise.all([
        page.waitForEvent('load'),
        page.locator('.foot').getByRole('button', { name: 'Reset demo' }).click(),
      ])
      expect(await page.evaluate(() => sessionStorage.getItem('tinkerfund:qa:actions'))).toBeNull()
      expect(await page.evaluate(() => sessionStorage.getItem('journal:keep'))).toBe('1')
      expect(await page.locator('.head .cart .count').textContent()).toBe('0')
      expect(await page.evaluate(() => document.documentElement.dataset.tfTheme)).toBe('dark')
    })

    flow('Campaign page: focus stays clear of sticky bars, the phone back bar and section nav, figures, an Upcoming reminder, a linked Update', async ({ page, visit }) => {
      const sections = page.locator('nav[aria-label="Sections"]')
      const current = () => sections.locator('[aria-current]').textContent()
      await page.setViewportSize({ width: 390, height: 844 })

      // WCAG 2.2 SC 2.4.11: a focused control must not sit wholly under the back bar…
      await visit('/campaigns/last-minute-lamp')
      const checked: string[] = []
      for (let i = 0; i < 200; i++) {
        await page.keyboard.press('Tab')
        const focus = await page.evaluate(() => {
          const el = document.activeElement!
          if (!el.closest('#rewards')) return undefined
          return { name: el.textContent?.trim() || el.getAttribute('aria-label') || el.tagName, bottom: el.getBoundingClientRect().bottom, barTop: document.querySelector('.tf-backbar')!.getBoundingClientRect().top }
        })
        if (!focus) {
          if (checked.length) break
          continue
        }
        expect(focus.bottom, focus.name).toBeLessThanOrEqual(focus.barTop)
        checked.push(focus.name)
      }
      expect(checked).toContain('Add to cart')

      // …nor under the sticky header and section nav, at either width.
      const shiftTabUp = async () => {
        await page.locator('#updates summary').first().focus()
        const seen = new Set<string>()
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
          seen.add(focus.section)
        }
        expect([...seen]).toEqual(['rewards', 'story'])
      }
      await shiftTabUp()
      await page.setViewportSize({ width: 1280, height: 800 })
      await shiftTabUp()
      // With Recently backed under it, a sticky Readout would slide over the list (story #1386).
      await page.evaluate(() => window.scrollTo(0, 400))
      const gap = await page.evaluate(() =>
        document.querySelector('.recent')!.getBoundingClientRect().top - document.querySelector('.readout')!.getBoundingClientRect().bottom)
      expect(gap).toBeGreaterThanOrEqual(0)

      await page.setViewportSize({ width: 390, height: 844 })
      await visit('/campaigns/last-minute-lamp')
      // The recommendation rows bleed into the page gutter (story #1387).
      expect(await scrollWidth(page)).toBeLessThanOrEqual(390)
      expect(await current()).toContain('Story')
      const bar = page.locator('.tf-backbar')
      const box = (await bar.boundingBox())!
      expect(box.y + box.height).toBeCloseTo(844, -1)
      await bar.getByRole('link', { name: 'Back this Campaign' }).click()
      await expect.poll(current).toContain('Rewards')

      const lamp = page.getByRole('article', { name: 'One lamp' })
      await lamp.getByText('White').click()
      expect(await lamp.getByLabel('White').isChecked()).toBe(true)
      expect(await lamp.getByRole('button', { name: 'More' }).count()).toBe(0)
      expect(await lamp.getByRole('button', { name: 'Add to cart' }).isEnabled()).toBe(true)

      await sections.getByRole('link', { name: /Comments/ }).click()
      await expect.poll(current).toContain('Comments')

      await page.setViewportSize({ width: 1280, height: 800 })
      await visit('/campaigns/unhurried-kettle')
      // The exact launch time is the visitor's own, so only the browser fills it in.
      await expect.poll(() => page.locator('.readout time').first().getAttribute('title')).toMatch(/2026/)
      expect(await page.locator('.readout .date').textContent()).toMatch(/Launches .*2026/)
      // On desktop the Rewards tab points at the sticky column, already in view (#1380).
      const rewardsTab = sections.locator('a[href="#rewards"]')
      await rewardsTab.click()
      expect(await rewardsTab.getAttribute('aria-current')).toBe('location')
      expect(await page.evaluate(() => document.activeElement?.id)).toBe('rewards')
      await page.getByRole('button', { name: /^Figure 2:/ }).click()
      expect(await page.locator('.hero .frame .cap').first().textContent()).toBe('FIG. 2 · TF-9003')
      const notify = page.locator('.readout button[aria-pressed]')
      expect(await notify.getAttribute('aria-pressed')).toBe('false')
      await notify.click()
      expect(await notify.getAttribute('aria-pressed')).toBe('true')
      expect(await notify.textContent()).toContain('Notify me')
      expect(await page.locator('.readout [role="status"]').textContent()).toBe('We will tell you when it launches.')
      expect(await page.getByRole('button', { name: 'Opens at launch' }).isDisabled()).toBe(true)

      // A link to an older, closed Update opens it and brings it into view.
      await visit('/campaigns/last-minute-lamp#update-1')
      const linked = page.locator('#update-1')
      await expect.poll(() => linked.evaluate((el: HTMLDetailsElement) => el.open)).toBe(true)
      await expect.poll(() => linked.evaluate((el) => el.getBoundingClientRect().top >= 0 && el.getBoundingClientRect().top < innerHeight)).toBe(true)
      // The demo Backer's own Pledge shows on the Campaign it backs.
      await expect.poll(() => page.locator('div.readout .backed').textContent()).toMatch(/You backed this Campaign · Pledge TF-P-9001/)
      expect(await page.locator('div.readout .backed a').getAttribute('href')).toMatch(/\/qa\/account\/pledges\/TF-P-9001$/)
    })

    flow('browse: the index table, Discover’s filters and sort in the URL, the phone drawer, Deals, into a Campaign', async ({ page, visit, reload }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await visit('/gallery/index-table')
      const table = page.locator('.index')
      const workshop = table.getByRole('button', { name: /^Workshop/ })
      await workshop.click()
      expect((await table.locator('tbody .inv a').allTextContents()).sort()).toEqual([
        'Indoor Hammock',
        'The Self-Assembling Workbench That Has Been Assembling Itself Since the Previous Financial Year',
        'Unhurried Kettle',
      ])
      expect(await workshop.getAttribute('aria-pressed')).toBe('true')

      await visit('/deals')
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
      const copy = page.getByRole('button', { name: 'Copy code TINKER10' })
      await copy.click()
      await expect.poll(() => page.getByRole('status').filter({ hasText: 'copied' }).count()).toBe(1)
      expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('TINKER10')

      await visit('/discover')
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

      await reload()
      expect(await side.getByLabel('Live', { exact: true }).isChecked()).toBe(true)
      expect(await page.getByLabel('Sort').inputValue()).toBe('newest')
      expect(await titles()).toEqual(live)

      await page.locator('.grid').getByRole('link', { name: 'Goal-Exact Stapler' }).click()
      await expect.poll(() => new URL(page.url()).pathname).toBe('/t/tinkerfund/qa/campaigns/goal-exact-stapler')

      await page.setViewportSize({ width: 390, height: 844 })
      await visit('/discover')
      expect(await side.isVisible()).toBe(false)
      expect(await scrollWidth(page)).toBeLessThanOrEqual(390)
      await page.getByRole('button', { name: 'Filters' }).click()
      const drawer = page.getByRole('dialog', { name: 'Filters' })
      await drawer.getByLabel('On Deal').check()
      await expect.poll(() => new URL(page.url()).search).toBe('?deal=1')
      // The Stapler's own Promotion, and the qa bundle that lists it and the Lamp (issue #1389).
      await drawer.getByRole('button', { name: 'Show 2 Campaigns' }).click()
      await expect.poll(() => drawer.isVisible()).toBe(false)
      expect((await titles()).sort()).toEqual(['Goal-Exact Stapler', 'Last-Minute Lamp'])
    })

    // Story #1382's bar again: qa's header never suggests prod content.
    flow('search: header suggestions stay in qa and open a Campaign; the phone’s search page lists results', async ({ page, visit, reload }) => {
      await page.setViewportSize({ width: 1280, height: 800 })
      await visit('/how-it-works')
      const field = page.locator('.head').getByRole('combobox', { name: 'Search Campaigns' })
      const suggestions = page.locator('.head').getByRole('listbox', { name: 'Suggestions' })
      const typeIn = async (q: string) => {
        await field.fill('')
        await field.pressSequentially(q)
      }

      await typeIn('one')
      await suggestions.waitFor()
      const links = await suggestions.getByRole('option').evaluateAll((els) => els.map((el) => el.getAttribute('href') ?? ''))
      expect(links.length).toBeGreaterThan(1)
      for (const href of links) expect(href).toMatch(/^\/t\/tinkerfund\/qa\//)
      for (const q of ['mug', 'Rock', 'Sundial', 'Henrik']) {
        await typeIn(q)
        await expect.poll(() => page.locator('.head .field [role="status"]').textContent()).toBe(`No Campaign matches “${q}”.`)
      }

      await typeIn('lamp')
      await suggestions.waitFor()
      expect(await suggestions.locator('.title').allTextContents()).toEqual(['Last-Minute Lamp', 'All results for “lamp”'])
      expect(await field.getAttribute('aria-expanded')).toBe('true')
      await field.press('ArrowDown')
      expect(await suggestions.getByRole('option', { selected: true }).textContent()).toContain('Last-Minute Lamp')
      await field.press('Enter')
      await expect.poll(() => new URL(page.url()).pathname).toBe('/t/tinkerfund/qa/campaigns/last-minute-lamp')

      await page.setViewportSize({ width: 390, height: 844 })
      await visit('')
      await page.locator('.head').getByRole('link', { name: 'Search' }).click()
      await expect.poll(() => new URL(page.url()).pathname).toBe('/t/tinkerfund/qa/search')
      const pageField = page.locator('main').getByRole('combobox', { name: 'Search Campaigns' })
      await expect.poll(() => pageField.evaluate((el) => el === document.activeElement)).toBe(true)
      await pageField.pressSequentially('test inventor')
      await pageField.press('Enter')
      await expect.poll(() => new URL(page.url()).search).toBe('?q=test+inventor')
      await expect.poll(() => page.locator('main .grid h3').count()).toBe(5)
      expect(await scrollWidth(page)).toBeLessThanOrEqual(390)

      await reload()
      expect(await page.locator('main .grid h3').count()).toBe(5)
      await pageField.fill('kettle')
      await page.locator('main').getByRole('option', { name: /Unhurried Kettle/ }).click()
      await expect.poll(() => new URL(page.url()).pathname).toBe('/t/tinkerfund/qa/campaigns/unhurried-kettle')
    })

    // The One-Button Keypad is €38 short of its goal; one keypad at TINKER10's
    // 10% off (€40.50) tips it over and past its €1,001 Stretch goal.
    flow('Cart and checkout: a code tips a Campaign over its goal; the Cart spans Campaigns, counting existing Pledges', async ({ page, visit, reload, h1 }) => {
      const count = page.locator('.head .cart .count')
      const drawer = page.getByRole('dialog', { name: 'Added to your Cart' })

      await visit('/cart')
      expect(await page.locator('.tf-empty').textContent()).toContain('Your Cart is empty')
      expect(await count.textContent()).toBe('0')
      expect(await page.locator('.recommendations').count()).toBe(0)
      await visit('/checkout')

      await visit('/campaigns/one-button-keypad')
      expect(await page.locator('.readout .big').textContent()).toBe('€962')
      await page.getByRole('article', { name: 'One keypad' }).getByRole('button', { name: 'Add to cart' }).click()
      await drawer.getByRole('link', { name: 'Checkout' }).click()

      await page.waitForURL('**/qa/checkout')
      await expect.poll(h1).toBe('Shipping')
      await reload()
      const summary = page.locator('.summary')
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

      await expect.poll(h1).toBe('Payment')
      expect(await page.locator('[aria-current="step"]').textContent()).toContain('Payment')
      expect(await page.locator('.step input:not([type="radio"])').count()).toBe(0)
      await page.getByLabel('Promissory handshake').check()
      // The code's own replace spreads route.query, so it would drop a `pay` not yet in it (#2076).
      await expect.poll(() => page.url()).toContain('pay=handshake')
      await page.getByLabel('Discount code').fill('nope')
      await page.getByRole('button', { name: 'Apply' }).click()
      await expect.poll(() => summary.getByRole('alert').textContent()).toBe('That code isn’t valid')
      await page.getByLabel('Discount code').fill('tinker10')
      await page.getByRole('button', { name: 'Apply' }).click()
      await expect.poll(() => summary.textContent()).toMatch(/Subtotal\s*€45\s*Discount\s*−€4.50\s*Shipping to Europe\s*€9\s*Total\s*€49.50[\s\S]*Code TINKER10 applied/)

      await page.goBack()
      await expect.poll(h1).toBe('Shipping')
      await expect.poll(() => page.getByLabel('Europe').isChecked()).toBe(true)
      await page.goForward()
      await expect.poll(h1).toBe('Payment')
      await expect.poll(() => page.getByLabel('Promissory handshake').isChecked()).toBe(true)
      await page.getByRole('link', { name: 'Review your Pledges' }).click()

      await expect.poll(h1).toBe('Review')
      expect(await page.locator('.choices-made').textContent()).toMatch(/Ship to\s*Europe[\s\S]*Pay with\s*Promissory handshake/)
      await page.getByRole('button', { name: 'Confirm Pledge' }).click()

      await page.waitForURL('**/qa/checkout/done?refs=TF-P-9004')
      await expect.poll(h1).toBe('Your Pledge is in')
      const receipt = await page.locator('.pledge').textContent()
      expect(receipt).toMatch(/Pledge TF-P-9004[\s\S]*One-Button Keypad[\s\S]*1 × One keypad\s*€45[\s\S]*Discount\s*−€4.50\s*Shipping to Europe\s*€9\s*Total\s*€49.50/)
      expect(receipt).toMatch(/You’ll only be charged if this Campaign is funded, when it ends on .*2026/)
      expect(await count.textContent()).toBe('0')

      await page.getByRole('link', { name: 'See One-Button Keypad' }).click()
      await page.waitForURL('**/qa/campaigns/one-button-keypad')
      await expect.poll(() => page.locator('.readout .big').textContent()).toBe('€1,002.50')
      const readout = await page.locator('.readout.tf-panel').textContent()
      expect(readout).toContain('Goal reached')
      expect(readout).toContain('100% funded')
      expect(readout).toMatch(/Backers\s*31/)
      expect(await page.locator('.goals li.yes').textContent()).toContain('The button in a second colour')
      expect(await page.getByRole('article', { name: 'One keypad' }).textContent()).toContain('1 of 30 left')
      // The keypad names no Backers, so the list appears with the visitor alone (story #1386).
      expect(await page.locator('.recent li').allTextContents()).toEqual([expect.stringMatching(/^\s*You · just now\s*$/)])

      // Browse counts the visitor's Pledges too, after a full reload.
      await visit('/discover')
      const card = page.locator('.grid article').filter({ has: page.getByRole('link', { name: 'One-Button Keypad' }) })
      await expect.poll(() => card.locator('.tiles').textContent()).toMatch(/Pledged\s*€1,002.50\s*Funded\s*100%/)

      await visit('/campaigns/goal-exact-stapler')
      const pledged = () => page.locator('.readout .big').textContent()
      const before = await pledged()
      expect(await count.textContent()).toBe('0')
      expect(await page.getByRole('button', { name: 'Add One more staple to cart' }).isDisabled()).toBe(true)
      const stapler = page.getByRole('article', { name: 'One stapler' })
      await stapler.getByRole('button', { name: 'More' }).click()
      await stapler.getByRole('button', { name: 'Add to cart' }).click()
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

      // qa's bundle lists the Stapler and the Lamp (issue #1389): the Cart nudges until both are in it.
      await visit('/cart')
      await expect.poll(() => page.locator('.summary .nudge').textContent()).toMatch(/^\s*Add a Reward from 1 more Campaign to save 5%: see the Campaigns in this Deal\s*$/)

      await visit('/campaigns/last-minute-lamp')
      expect(await page.locator('.readout .deals').textContent()).toContain('5% off when backed with 1 more Campaign in this Deal')
      // The demo Backer's baked Pledge already holds the one lamp they may have.
      const lamp = page.getByRole('article', { name: 'One lamp' })
      await lamp.getByRole('button', { name: 'Add to cart' }).click()
      expect(await lamp.getByRole('alert').textContent()).toBe('Max 1 per Backer: your Pledge already holds 1')
      await page.getByRole('article', { name: 'The manual (PDF)' }).getByRole('button', { name: 'Add to cart' }).click()
      await drawer.getByRole('button', { name: 'Close' }).click()

      await page.locator('.head .cart').click()
      await page.waitForURL('**/qa/cart')
      await expect.poll(h1).toMatch(/Your Cart\s*4 items/)
      expect(await page.locator('.group h2').allTextContents()).toEqual(['Goal-Exact Stapler', 'Last-Minute Lamp'])
      // Story #1387: the Lamp's hand-picked Campaigns; the Stapler has none.
      expect(await page.getByRole('list', { name: 'Backers also backed' }).locator('h3').allTextContents()).toEqual(['Unhurried Kettle', 'Indoor Hammock'])
      await page.getByRole('button', { name: 'More One stapler' }).click()
      // The Lamp's Pledge already pays for domestic shipping, so only the Stapler adds any.
      await expect.poll(() => page.locator('.summary').textContent()).toMatch(/Subtotal\s*€86\s*Shipping to Domestic\s*€4\s*Estimated total\s*€90/)
      expect(await page.locator('.summary .nudge').count()).toBe(0)
      await page.getByLabel('Estimate shipping to').selectOption('europe')
      await expect.poll(() => page.locator('.group', { hasText: 'Last-Minute Lamp' }).textContent())
        .toContain('Your Pledge already holds One lamp, which doesn’t ship to Europe')

      await reload()
      await expect.poll(() => count.textContent()).toBe('5')
      // The Backer's actions are keyed by the Space they happened in (unit-tested in backer.spec.ts).
      expect(await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('tinkerfund:')))).toEqual(['tinkerfund:qa:actions'])

      // The Shipping step flags the existing Pledge too, not only the Cart.
      await page.locator('main').getByRole('link', { name: 'Checkout' }).click()
      await expect.poll(h1).toBe('Shipping')
      // The bundle's 5% adds to the Stapler's own 10%: 15% of €76. The Lamp's Pledge earns it
      // by the €5 top-up, and like any term a Pledge holds it covers all its goods: 5% of €32.
      await expect.poll(() => page.locator('.summary').textContent()).toMatch(/Subtotal\s*€86\s*Discount\s*−€13\s*Shipping to Domestic\s*€4\s*Total\s*€77/)
      expect(await page.locator('.summary .deals li').allTextContents()).toEqual(['A tenth off the stapler (active, automatic)', 'Stapler and lamp together (active bundle)'])
      await page.getByLabel('Europe').check()
      await expect.poll(() => page.locator('.pledge', { hasText: 'Last-Minute Lamp' }).textContent())
        .toContain('Your Pledge already holds One lamp, which doesn’t ship to Europe')

      // None of it reaches prod's Cart (issue #1383).
      await page.goto(url('/t/tinkerfund/prod/cart'), { waitUntil: 'hydration' })
      await expect.poll(() => page.locator('.tf-empty').textContent()).toContain('Your Cart is empty')
      expect(await count.textContent()).toBe('0')
      expect(await page.evaluate(() => Object.keys(sessionStorage).filter((k) => k.startsWith('tinkerfund:prod:')))).toEqual([])
    })

    // The One-Button Keypad again: one keypad (€45) tips it over its €1,000
    // goal; a change grows the Pledge; the cancel pulls it back below.
    flow('account: pledge, change and cancel with the Campaign’s totals following; a locked receipt prints bare', async ({ page, visit, reload, h1 }) => {
      const readout = () => page.locator('.readout.tf-panel').textContent()
      await visit('/campaigns/one-button-keypad')
      await page.getByRole('article', { name: 'One keypad' }).getByRole('button', { name: 'Add to cart' }).click()
      await page.getByRole('dialog', { name: 'Added to your Cart' }).getByRole('link', { name: 'Checkout' }).click()
      await page.getByRole('link', { name: 'Continue to payment' }).click()
      await page.getByRole('link', { name: 'Review your Pledges' }).click()
      await page.getByRole('button', { name: 'Confirm Pledge' }).click()
      await page.waitForURL('**/qa/checkout/done?refs=TF-P-9004')
      await reload()
      await expect.poll(h1).toBe('Your Pledge is in')

      await page.locator('.head').getByRole('link', { name: 'Your account' }).click()
      await page.waitForURL('**/qa/account')
      await reload()
      const rows = page.locator('.list > li')
      await expect.poll(() => rows.count()).toBe(4)
      expect(await rows.allTextContents()).toEqual([
        expect.stringMatching(/TF-P-9004\s*One-Button Keypad\s*Pending\s*Placed.*€49\s*$/),
        expect.stringMatching(/TF-P-9001\s*Last-Minute Lamp\s*Pending\s*Placed.*€35\s*$/),
        expect.stringMatching(/TF-P-9003\s*Indoor Hammock\s*Not charged\s*Placed.*€57\s*$/),
        expect.stringMatching(/TF-P-9002\s*Retired Ruler\s*Delivered\s*Placed.*€66\s*$/),
      ])
      expect(await page.locator('address').textContent()).toContain('1 Test Way')

      await page.getByRole('link', { name: 'One-Button Keypad' }).click()
      await page.waitForURL('**/qa/account/pledges/TF-P-9004')
      await reload()
      await page.getByRole('button', { name: 'Change Pledge' }).click()
      await expect.poll(h1).toBe('Change your Pledge')
      await page.getByLabel('Quantity of Spare keycap').fill('2')
      await page.getByLabel('Amount (EUR), whole euros').fill('5')
      await page.getByRole('button', { name: 'Review changes' }).click()
      await expect.poll(h1).toBe('Review changes')
      expect(await page.locator('.difference').textContent()).toMatch(/Was\s*€49\s*Now\s*€60\s*Difference\s*\+€11/)
      await page.getByRole('button', { name: 'Confirm changes' }).click()
      await expect.poll(() => page.locator('.done').textContent()).toBe('Your Pledge is changed.')
      expect(await page.locator('.pledge').textContent()).toMatch(/2 × Spare keycap\s*€6[\s\S]*Bonus support\s*€5[\s\S]*Total\s*€60/)

      await page.getByRole('link', { name: 'One-Button Keypad' }).click()
      await page.waitForURL('**/qa/campaigns/one-button-keypad')
      await expect.poll(() => page.locator('.readout .big').textContent()).toBe('€1,018')
      expect(await readout()).toMatch(/Goal reached[\s\S]*Backers\s*31/)
      expect(await page.locator('.goals li.yes').textContent()).toContain('The button in a second colour')

      await page.goBack()
      await page.waitForURL('**/qa/account/pledges/TF-P-9004')
      await page.getByRole('button', { name: 'Cancel Pledge' }).click()
      const dialog = page.getByRole('dialog', { name: 'Cancel Pledge TF-P-9004?' })
      await dialog.getByRole('button', { name: 'Keep Pledge' }).click()
      await expect.poll(() => dialog.isVisible()).toBe(false)
      await page.getByRole('button', { name: 'Cancel Pledge' }).click()
      // The status region is already in place, so its new text is announced (#1401 review).
      const status = page.locator('.pledge-page [role="status"]')
      expect(await status.textContent()).toBe('')
      await dialog.getByRole('button', { name: 'Yes, cancel it' }).click()
      await expect.poll(() => page.locator('.intro .tf-chip').textContent()).toBe('Cancelled')
      expect(await status.textContent()).toBe('Your Pledge is cancelled. Nothing will be charged.')
      await expect.poll(() => page.evaluate(() => document.activeElement?.textContent)).toBe('Receipt')
      expect(await page.getByRole('button', { name: 'Change Pledge' }).count()).toBe(0)

      await visit('/campaigns/one-button-keypad')
      await expect.poll(() => page.locator('.readout .big').textContent()).toBe('€962')
      expect(await readout()).not.toContain('Goal reached')
      expect(await readout()).toMatch(/Backers\s*30/)
      expect(await page.locator('.goals li.yes').count()).toBe(0)

      await visit('/account/pledges/TF-P-9002')
      await expect.poll(h1).toBe('Receipt')
      expect(await page.locator('.pledge').textContent()).toMatch(/Pledge TF-P-9002[\s\S]*2 × One ruler\s*€60[\s\S]*Shipping to Europe\s*€6\s*Total\s*€66/)
      expect(await page.getByText('Locked: its Campaign has ended.').isVisible()).toBe(true)
      expect(await page.getByRole('button', { name: 'Change Pledge' }).count()).toBe(0)
      await page.emulateMedia({ media: 'print', colorScheme: 'dark' })
      for (const hidden of ['.demo', '.head', '.foot', '.actions', '.back']) {
        expect(await page.locator(hidden).first().isVisible(), hidden).toBe(false)
      }
      expect(await page.locator('.pledge').isVisible()).toBe(true)
      expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe('rgb(17, 23, 27)')
    })
  })
})
