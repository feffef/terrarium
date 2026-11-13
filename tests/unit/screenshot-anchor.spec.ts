import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Issue #3070: both capture paths must re-scroll to the URL #anchor.
const scrollIntoViewIfNeeded = vi.fn(async () => {})
const page = {
  goto: vi.fn(async () => {}),
  waitForTimeout: vi.fn(async () => {}),
  waitForFunction: vi.fn(async () => {}),
  locator: vi.fn(() => ({ first: () => ({ waitFor: async () => {} }), scrollIntoViewIfNeeded })),
  screenshot: vi.fn(async () => {}),
}
vi.mock('../../scripts/lib/chromium.ts', () => ({
  launchChromium: async () => ({ newPage: async () => page, close: async () => {} }),
}))

// The unit project sets isolate: false, so an earlier spec in the same worker may have cached the
// real screenshot.ts; reset the registry so it is evaluated against the mock, and again afterwards.
let shots: typeof import('../../scripts/ui/screenshot.ts')
beforeAll(async () => {
  vi.resetModules()
  shots = await import('../../scripts/ui/screenshot.ts')
})
afterAll(() => vi.resetModules())

describe('screenshot anchor scroll', () => {
  it('scrolls to the #anchor after a fixed wait', async () => {
    scrollIntoViewIfNeeded.mockClear()
    await shots.captureScreenshot('http://x/p#sec', 'o.png', { waitMs: 1 })
    expect(page.locator).toHaveBeenCalledWith('#sec')
    expect(scrollIntoViewIfNeeded).toHaveBeenCalledTimes(1)
  })

  it('scrolls to the #anchor after a selector wait', async () => {
    scrollIntoViewIfNeeded.mockClear()
    await shots.captureScreenshotWaitingFor('http://x/p#sec', 'o.png', '.ready')
    expect(scrollIntoViewIfNeeded).toHaveBeenCalledTimes(1)
  })
})

// The hydration wait: Playwright polls this predicate string and enforces the timeout, so the
// stub runs the string against fake windows; a never-hydrating page is the false case plus the
// 60s timeout (waiting that out needs a real browser).
describe('screenshot hydration wait', () => {
  it('waits on a predicate that is true without Nuxt or once hydrated, false while hydrating', async () => {
    page.waitForFunction.mockClear()
    await shots.captureScreenshot('http://x/p', 'o.png', { waitMs: 0 })
    const [predicate, , options] = page.waitForFunction.mock.calls[0] as unknown as [string, unknown, { timeout: number }]
    const ready = (win: object) => new Function('window', `return ${predicate}`)(win)
    expect(ready({})).toBe(true)
    expect(ready({ useNuxtApp: () => ({ isHydrating: true }) })).toBe(false)
    expect(ready({ useNuxtApp: () => ({ isHydrating: false }) })).toBe(true)
    expect(options.timeout).toBe(60_000)
  })
})
