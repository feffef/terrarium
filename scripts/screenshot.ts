// Committed screenshot recipe (issue #34): screenshots a URL using the
// pre-installed Chromium — no new npm dependency, no browser download.
//
// Usage:
//   pnpm exec tsx scripts/screenshot.ts <url> <out.png> [WxH]
//
// The optional third argument sets the capture size (e.g. `1280x1600` to
// reach below-the-fold content); it defaults to `1280x800`.
// Both capture paths drive the pre-installed Chromium through playwright-core
// (a resolvable devDependency, added for the L2 browser-tier e2e gate — see
// `package.json` / commit d7bf21f) and set the page's viewport directly via
// `newPage({ viewport })`, rather than relying on a `--window-size` launch
// arg: sizing the viewport through the driver is what the requested `WxH`
// actually lands on pixel-for-pixel — a `--window-size` launch arg alone left
// a Chromium chrome/viewport offset uncompensated, shipping a captured image
// shorter than requested (issue #575). The binary is resolved via
// `PLAYWRIGHT_BROWSERS_PATH` (falling back to the conventional
// `/opt/pw-browsers` default some environments set) — never a hardcoded
// absolute path baked into the script.
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium, type Page } from 'playwright-core'
import { resolveChromiumPath } from './chromium-path'

// A fixed pre-capture wait so client-only/async content (a dynamically-imported
// mermaid diagram, a chart) has rendered before the shutter fires — a bare
// screenshot grabbed the pre-render frame and shipped a blank gap (issue
// #364). Callers that can name the element they're waiting for should prefer
// `captureScreenshotWaitingFor` over guessing a duration.
const DEFAULT_WAIT_MS = 2000

const USAGE =
  'Usage: pnpm exec tsx scripts/screenshot.ts <url> <out.png> [WxH]\n' +
  '  [WxH]  optional capture size, two positive integers (e.g. 1280x1600); ' +
  'defaults to 1280x800.'

/** Parse an optional `WxH` size argument into `W,H`. */
function parseSize(size: string): string | undefined {
  const match = /^(\d+)x(\d+)$/.exec(size)
  if (!match) return undefined
  const [width, height] = [Number(match[1]), Number(match[2])]
  if (width <= 0 || height <= 0) return undefined
  return `${width},${height}`
}

/** Split an already-parsed `W,H` string (e.g. `1280,800`) into numbers. */
function parseWindowSize(windowSize: string): [width: number, height: number] {
  const [width = 1280, height = 800] = windowSize.split(',').map(Number)
  return [width, height]
}

/**
 * Launch the pre-installed Chromium via playwright-core, open a page sized to
 * `width`x`height` (the direct-viewport fix for issue #575), run `fn` against
 * it, then always close the browser — shared by both capture paths below so
 * the launch args and viewport handling stay single-homed.
 */
async function withPage<T>(width: number, height: number, fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({
    executablePath: resolveChromiumPath(),
    // --hide-scrollbars: the raw-binary invocation this replaced always
    // passed it (issue #575); keep captures scrollbar-free by default.
    args: ['--no-sandbox', '--disable-gpu', '--hide-scrollbars'],
  })
  try {
    const page = await browser.newPage({ viewport: { width, height } })
    return await fn(page)
  }
  finally {
    await browser.close()
  }
}

/**
 * Capture a screenshot of `url` to `out` at `windowSize` (an already-parsed
 * `W,H` string, e.g. `1280,800`). Waits `waitMs` (default
 * {@link DEFAULT_WAIT_MS}) after navigation for the page to render before
 * capturing — pass `0` to capture immediately. Throws on failure (Chromium
 * missing, launch error, navigation error). Exported so `scripts/preview.ts`
 * can reuse the exact same capture path instead of re-deriving it (issue
 * #240).
 */
export async function captureScreenshot(url: string, out: string, windowSize = '1280,800', waitMs = DEFAULT_WAIT_MS): Promise<void> {
  const [width, height] = parseWindowSize(windowSize)
  await withPage(width, height, async (page) => {
    await page.goto(url)
    if (waitMs > 0) await page.waitForTimeout(waitMs)
    await page.screenshot({ path: out })
  })
}

/**
 * Like {@link captureScreenshot}, but waits until `selector` attaches to the DOM
 * before capturing, rather than a fixed duration. Use it when a fixed wait is
 * too fragile and you can name the element you're waiting for (e.g. an
 * async-rendered `.mermaid-diagram svg`, issue #364). Throws if the selector
 * never appears within `timeoutMs`.
 */
export async function captureScreenshotWaitingFor(
  url: string,
  out: string,
  selector: string,
  windowSize = '1280,800',
  timeoutMs = 15_000,
): Promise<void> {
  const [width, height] = parseWindowSize(windowSize)
  await withPage(width, height, async (page) => {
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.locator(selector).first().waitFor({ state: 'attached', timeout: timeoutMs })
    await page.screenshot({ path: out })
  })
}

async function main(): Promise<void> {
  const [url, out, size] = process.argv.slice(2)
  if (!url || !out) {
    console.error(USAGE)
    process.exit(1)
  }

  const windowSize = size === undefined ? '1280,800' : parseSize(size)
  if (!windowSize) {
    console.error(`Invalid size "${size}" — expected <width>x<height>, e.g. 1280x1600.`)
    console.error(USAGE)
    process.exit(1)
  }

  try {
    await captureScreenshot(url, out, windowSize)
  } catch (err) {
    console.error(err instanceof Error ? err.message : String(err))
    process.exit(1)
  }
}

// Only run the CLI when this file is invoked directly, not when another script
// (e.g. `scripts/preview.ts`) imports `captureScreenshot` — otherwise this
// `main()` would run on import and consume the importer's argv (issue #240).
function invokedDirectly(): boolean {
  const entry = process.argv[1]
  if (!entry) return false
  try {
    return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (invokedDirectly()) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.stack ?? err.message : String(err))
    process.exit(1)
  })
}
