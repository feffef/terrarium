// L2 e2e for the Tinkerfund Tenant: browser flows (Cart and checkout, account).
// See tinkerfund-flows.spec.ts for why they are few, wide and split.
import { describe, expect } from 'vitest'
import { url } from '@nuxt/test-utils/e2e'
import { setupL2 } from '../../../../tests/support/e2e.ts'
import { flow } from './flows-support.ts'

describe('tinkerfund Tenant', async () => {
  await setupL2()

  describe('browser flows in qa', () => {
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
      await page.getByLabel('Discount code').fill('nope')
      await page.getByRole('button', { name: 'Apply' }).click()
      await expect.poll(() => summary.getByRole('alert').textContent()).toBe('That code isn’t valid')
      await page.getByLabel('Discount code').fill('tinker10')
      await page.getByRole('button', { name: 'Apply' }).click()
      await expect.poll(() => summary.textContent()).toMatch(/Subtotal\s*€45\s*Discount\s*−€4.50\s*Shipping to Europe\s*€9\s*Total\s*€49.50[\s\S]*Code TINKER10 applied/)

      await page.goBack()
      await expect.poll(h1).toBe('Shipping')
      expect(await page.getByLabel('Europe').isChecked()).toBe(true)
      await page.goForward()
      await expect.poll(h1).toBe('Payment')
      expect(await page.getByLabel('Promissory handshake').isChecked()).toBe(true)
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
