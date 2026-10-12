// L2 e2e for the Tinkerfund Tenant: browser flows (browse, search). See
// tinkerfund-flows.spec.ts for why they are few, wide and split.
import { describe, expect } from 'vitest'
import { setupL2 } from '../../../../tests/support/e2e.ts'
import { flow, scrollWidth } from './flows-support.ts'

describe('tinkerfund Tenant', async () => {
  await setupL2()

  describe('browser flows in qa', () => {
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
  })
})
