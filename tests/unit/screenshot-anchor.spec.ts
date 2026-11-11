import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

// Issue #3070: both capture paths must re-scroll to the URL #anchor.
const scrollIntoViewIfNeeded = vi.fn(async () => {})
const page = {
  goto: vi.fn(async () => {}),
  waitForTimeout: vi.fn(async () => {}),
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
