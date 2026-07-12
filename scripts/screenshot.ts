// Committed screenshot recipe (issue #34): screenshots a URL using the
// pre-installed Chromium — no new npm dependency, no browser download.
//
// Usage:
//   pnpm exec tsx scripts/screenshot.ts <url> <out.png> [WxH]
//
// The optional third argument sets the capture window size (e.g. `1280x1600`
// to reach below-the-fold content); it defaults to `1280x800`.
// Why this shape: `playwright-core` IS a resolvable devDependency today (added
// for the L2 browser-tier e2e gate, see `package.json` / commit d7bf21f), but
// the plain capture path still deliberately spawns the pre-installed Chromium
// binary directly with its built-in headless screenshot flags rather than
// driving it through a full Playwright browser instance — there's no need to
// spin up a Playwright driver just for a fixed-wait capture. The selector-wait
// path (`captureScreenshotWaitingFor`) is the one exception that DOES need the
// driver, because the bare `--screenshot` flag can't wait for a DOM condition.
// The binary is resolved via `PLAYWRIGHT_BROWSERS_PATH` (falling back to the
// conventional `/opt/pw-browsers` default some environments set) — never a
// hardcoded absolute path baked into the script.
import { spawnSync } from 'node:child_process'
import { realpathSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'
import { resolveChromiumPath } from './chromium-path'

// A fixed pre-capture wait so client-only/async content (a dynamically-imported
// mermaid diagram, a chart) has rendered before the shutter fires — a bare
// `--screenshot` grabbed the pre-render frame and shipped a blank gap (issue
// #364). Callers that can name the element they're waiting for should prefer
// `captureScreenshotWaitingFor` over guessing a duration.
const DEFAULT_WAIT_MS = 2000

const USAGE =
  'Usage: pnpm exec tsx scripts/screenshot.ts <url> <out.png> [WxH]\n' +
  '  [WxH]  optional window size, two positive integers (e.g. 1280x1600); ' +
  'defaults to 1280x800.\n' +
  'Note: headless Chromium prints harmless dbus "Failed to connect to the bus" ' +
  'ERRORs in containers — expected noise, not a failure.'

/** Parse an optional `WxH` size argument into `W,H` for `--window-size`. */
function parseSize(size: string): string | undefined {
  const match = /^(\d+)x(\d+)$/.exec(size)
  if (!match) return undefined
  const [width, height] = [Number(match[1]), Number(match[2])]
  if (width <= 0 || height <= 0) return undefined
  return `${width},${height}`
}

// Headless Chromium in a container reliably prints harmless dbus ERROR lines
// to stderr — see the USAGE note above (issue #101). Observed variants include
// "Failed to connect to the bus" (dbus/bus.cc) and "Failed to call method: ...
// org.freedesktop.DBus..." (dbus/object_proxy.cc); both come from Chromium's
// `dbus/` source directory, hence the `ERROR:dbus/` half of the pattern. It's
// noise, not a failure signal, but it must not swallow a *genuine* Chromium
// error, so we filter by line rather than dropping stderr wholesale.
const DBUS_NOISE_PATTERN = /Failed to connect to the bus|ERROR:dbus\//

/** Re-emit captured stderr lines, dropping known-harmless dbus noise. */
function emitFilteredStderr(stderr: string): void {
  const lines = stderr.split('\n').filter((line) => line.length > 0)
  const real = lines.filter((line) => !DBUS_NOISE_PATTERN.test(line))
  for (const line of real) {
    process.stderr.write(`${line}\n`)
  }
}

/**
 * Capture a screenshot of `url` to `out` at `windowSize` (a already-parsed
 * `W,H` string, e.g. `1280,800`), driving the pre-installed Chromium directly.
 * Waits `waitMs` (default {@link DEFAULT_WAIT_MS}) for the page to render before
 * capturing, via Chromium's `--virtual-time-budget` — the headless-native way
 * to "advance the page's timers up to N ms, then fire the shutter." Pass `0` to
 * capture immediately. Throws on failure (Chromium missing, launch error, or
 * non-zero exit) — the caller decides how to report it. Exported so
 * `scripts/preview.ts` can reuse the exact same Chromium invocation instead of
 * re-deriving these flags (issue #240): the screenshot flags and dbus-noise
 * filtering stay single-homed here.
 */
export function captureScreenshot(url: string, out: string, windowSize = '1280,800', waitMs = DEFAULT_WAIT_MS): void {
  const chromium = resolveChromiumPath()

  const result = spawnSync(
    chromium,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--window-size=${windowSize}`,
      `--virtual-time-budget=${waitMs}`,
      `--screenshot=${out}`,
      url,
    ],
    { stdio: ['inherit', 'inherit', 'pipe'], encoding: 'utf8' },
  )

  if (result.stderr) emitFilteredStderr(result.stderr)

  if (result.error) {
    throw new Error(`Failed to launch Chromium at "${chromium}": ${result.error.message}`)
  }
  if (result.status !== 0) {
    throw new Error(`Chromium exited with status ${result.status}`)
  }
}

/**
 * Like {@link captureScreenshot}, but waits until `selector` attaches to the DOM
 * before capturing, rather than a fixed duration. The bare `--screenshot` flag
 * can't wait for a DOM condition, so this path drives the same pre-installed
 * Chromium through playwright-core (a resolvable devDependency) — the one place
 * the driver earns its keep (issue #364). Use it when a fixed wait is too
 * fragile and you can name the element you're waiting for (e.g. an async-rendered
 * `.mermaid-diagram svg`). Throws if the selector never appears within `timeoutMs`.
 */
export async function captureScreenshotWaitingFor(
  url: string,
  out: string,
  selector: string,
  windowSize = '1280,800',
  timeoutMs = 15_000,
): Promise<void> {
  const [width = 1280, height = 800] = windowSize.split(',').map(Number)
  const browser = await chromium.launch({
    executablePath: resolveChromiumPath(),
    args: ['--no-sandbox', '--disable-gpu'],
  })
  try {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto(url, { waitUntil: 'networkidle' })
    await page.locator(selector).first().waitFor({ state: 'attached', timeout: timeoutMs })
    await page.screenshot({ path: out })
  }
  finally {
    await browser.close()
  }
}

function main(): void {
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
    captureScreenshot(url, out, windowSize)
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

if (invokedDirectly()) main()
