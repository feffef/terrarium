// Shared helper for resolving the pre-installed Chromium executable path
// under `PLAYWRIGHT_BROWSERS_PATH` (falling back to the conventional
// `/opt/pw-browsers` default some environments set). Extracted out of
// `scripts/screenshot.ts` (issue #202) so ad-hoc `playwright-core` probes —
// see CLAUDE.md's "Verifying UI changes" section — can import the same
// lookup logic instead of re-deriving it by hand each session.
import { accessSync, constants, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

function existsAndExecutable(path: string): boolean {
  try {
    accessSync(path, constants.X_OK)
    return statSync(path).isFile() || statSync(path).isSymbolicLink()
  } catch {
    return false
  }
}

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

/**
 * Resolve the pre-installed Chromium executable path: checks the `chromium`
 * convenience symlink first, then falls back to scanning for a versioned
 * `chromium-` directory's `chrome-linux/chrome` under the Playwright browsers
 * cache dir (`PLAYWRIGHT_BROWSERS_PATH`, defaulting to `/opt/pw-browsers`).
 *
 * Throws if no pre-installed Chromium can be found.
 */
export function resolveChromiumPath(): string {
  const browsersDir = process.env.PLAYWRIGHT_BROWSERS_PATH ?? '/opt/pw-browsers'
  const chromium = findChromium(browsersDir)
  if (!chromium) {
    throw new Error(
      `Could not find a pre-installed Chromium under "${browsersDir}" ` +
        '(checked for a `chromium` convenience symlink and a versioned ' +
        '`chromium-*/chrome-linux/chrome`). Set PLAYWRIGHT_BROWSERS_PATH to ' +
        'the directory containing the pre-installed browser.',
    )
  }
  return chromium
}
