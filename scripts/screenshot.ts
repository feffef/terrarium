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
// this script still deliberately spawns the pre-installed Chromium binary
// directly with its built-in headless screenshot flags rather than driving it
// through a full Playwright browser instance — there's no need to spin up a
// Playwright driver just for a plain, no-interaction capture. The binary is
// resolved via `PLAYWRIGHT_BROWSERS_PATH` (falling back to the conventional
// `/opt/pw-browsers` default some environments set) — never a hardcoded
// absolute path baked into the script.
import { spawnSync } from 'node:child_process'
import { accessSync, constants, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

/** Find the Chromium executable under a Playwright browsers cache dir. */
function findChromium(browsersDir: string): string | undefined {
  // The conventional convenience symlink Playwright installs.
  const convenience = join(browsersDir, 'chromium')
  if (existsAndExecutable(convenience)) return convenience

  // Fall back to scanning for a versioned `chromium-*/chrome-linux/chrome`.
  let entries: string[]
  try {
    entries = readdirSync(browsersDir)
  } catch {
    return undefined
  }
  const versioned = entries
    .filter((name) => name.startsWith('chromium-') && !name.includes('headless_shell'))
    .sort()
    .reverse() // prefer the newest-looking version directory
  for (const dir of versioned) {
    const candidate = join(browsersDir, dir, 'chrome-linux', 'chrome')
    if (existsAndExecutable(candidate)) return candidate
  }
  return undefined
}

function existsAndExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK)
    return statSync(path).isFile() || statSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

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

  const browsersDir = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers'
  const chromium = findChromium(browsersDir)
  if (!chromium) {
    console.error(
      `Could not find a pre-installed Chromium under "${browsersDir}" ` +
        '(checked for a `chromium` convenience symlink and a versioned ' +
        '`chromium-*/chrome-linux/chrome`). Set PLAYWRIGHT_BROWSERS_PATH to ' +
        'the directory containing the pre-installed browser.',
    )
    process.exit(1)
  }

  const result = spawnSync(
    chromium,
    [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--hide-scrollbars',
      `--window-size=${windowSize}`,
      `--screenshot=${out}`,
      url,
    ],
    { stdio: ['inherit', 'inherit', 'pipe'], encoding: 'utf8' },
  )

  if (result.stderr) emitFilteredStderr(result.stderr)

  if (result.error) {
    console.error(`Failed to launch Chromium at "${chromium}":`, result.error.message)
    process.exit(1)
  }
  if (result.status !== 0) {
    console.error(`Chromium exited with status ${result.status}`)
    process.exit(result.status ?? 1)
  }
}

main()
