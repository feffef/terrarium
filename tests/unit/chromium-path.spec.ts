// Playwright names the Linux Chromium dir by version: `chrome-linux64` now, `chrome-linux` before.
import { chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { findPreinstalledChromium } from '../../scripts/chromium-path.ts'

describe('findPreinstalledChromium()', () => {
  const saved = process.env.PLAYWRIGHT_BROWSERS_PATH
  let dir: string

  const install = (...parts: string[]) => {
    const path = join(dir, ...parts)
    mkdirSync(join(path, '..'), { recursive: true })
    writeFileSync(path, '')
    chmodSync(path, 0o755)
    return path
  }

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'chromium-path-'))
    process.env.PLAYWRIGHT_BROWSERS_PATH = dir
  })

  afterEach(() => {
    if (saved === undefined) delete process.env.PLAYWRIGHT_BROWSERS_PATH
    else process.env.PLAYWRIGHT_BROWSERS_PATH = saved
    rmSync(dir, { recursive: true, force: true })
  })

  it('finds the chrome-linux64 layout', () => {
    expect(findPreinstalledChromium()).toBeUndefined()
    const chrome = install('chromium-1200', 'chrome-linux64', 'chrome')
    expect(findPreinstalledChromium()).toBe(chrome)
  })

  it('finds the chrome-linux layout', () => {
    const chrome = install('chromium-1194', 'chrome-linux', 'chrome')
    expect(findPreinstalledChromium()).toBe(chrome)
  })

  it('prefers the newest version directory', () => {
    install('chromium-1194', 'chrome-linux', 'chrome')
    const newest = install('chromium-1200', 'chrome-linux64', 'chrome')
    expect(findPreinstalledChromium()).toBe(newest)
  })
})
