// L2 e2e for the Tinkerfund Tenant: browser flows (shell, Campaign page). Serves
// the gate's build via `setupL2()` and never builds (tests/README.md). Browser
// flows run only in qa, whose pinned now keeps every countdown and funded state
// still, and each browser test costs the gate serial time, so they are few and
// wide (issue #1360). The flows are split over three files
// (tinkerfund-flows*.spec.ts, harness in flows-support.ts) and the
// server-rendered checks are in tinkerfund.spec.ts, so all of them run in
// parallel.
import { describe, expect } from 'vitest'
import { setupL2 } from '../../../../tests/support/e2e.ts'
import { flow, scrollWidth } from './flows-support.ts'

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
      await page.locator('.foot').getByRole('button', { name: 'Reset demo' }).focus()
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
      await Promise.all([
        page.waitForEvent('load'),
        page.locator('.demo').getByRole('button', { name: 'Reset demo' }).click(),
      ])
      expect(await page.evaluate(() => document.documentElement.dataset.tfTheme)).toBe('dark')
      expect(await page.evaluate(() => sessionStorage.getItem('tinkerfund-theme'))).toBe('dark')
      expect(await bg()).toBe(dark)

      // Reset clears the demo Backer's actions but no other Tenant's keys, and not the theme.
      await visit('/campaigns/goal-exact-stapler')
      await page.evaluate(() => sessionStorage.setItem('journal:keep', '1'))
      await page.getByRole('article', { name: 'One stapler' }).getByRole('button', { name: 'Add to cart' }).click()
      await page.getByRole('dialog', { name: 'Added to your Cart' }).getByRole('button', { name: 'Close' }).click()
      expect(await page.evaluate(() => sessionStorage.getItem('tinkerfund:qa:actions'))).toContain('stapler')
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
  })
})
