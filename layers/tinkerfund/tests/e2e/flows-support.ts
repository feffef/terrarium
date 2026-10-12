// The `flow()` harness shared by the tinkerfund-flows*.spec.ts files. Not a spec
// itself (no `.spec.ts` suffix), so vitest never collects it.
import type { Page } from 'playwright-core'
import { expect, it } from 'vitest'
import { createPage, url } from '@nuxt/test-utils/e2e'
import { collectUnknownElementTags } from '../../../../tests/support/e2e.ts'

export interface Flow {
  page: Page
  /** A full load of a qa path, so it hydrates. */
  visit: (path: string) => Promise<void>
  reload: () => Promise<void>
  h1: () => Promise<string | null>
}

// Errors are collected for the whole flow, so every full load in it doubles as
// a clean-hydration check (tests/support/e2e.ts' expectCleanHydration).
export function flow(name: string, run: (flow: Flow) => Promise<void>): void {
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

export const scrollWidth = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth)
