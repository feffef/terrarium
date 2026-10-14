// L0 — the pure half of the auto-reload decision (issues #236, #1902): which
// failed content loads a reload fixes (a build chunk or the database download
// failed), and when `reloadNuxtApp`'s own guard says a reload has
// already been attempted for this path. The Nuxt-facing half (the plugin's
// `app:chunkError` feed, the reload itself) is covered by the blog L2 e2e.
import { describe, expect, it } from 'vitest'
import {
  isReloadableLoadError,
  recordChunkLoadError,
  reloadAlreadyAttempted,
  shouldAutoReload,
} from '../../app/utils/chunkRecovery.ts'

describe('shouldAutoReload', () => {
  const path = '/t/blog/david'
  const now = 1000
  const liveGuard = JSON.stringify({ path, expires: 2000 })
  // What the page gets from @nuxt/content's failed dump $fetch: h3's createError
  // copies ofetch's FetchError message but keeps only its `cause` (issue #1902).
  const fetchError = (message: string, cause?: unknown) => new Error(message, { cause })
  const dumpDownloadFailed = fetchError(
    '[GET] "/__nuxt_content/blog/sql_dump.txt?v=abc": <no response> Failed to fetch',
    new TypeError('Failed to fetch'),
  )

  it('reloads once when the database download failed', () => {
    expect(shouldAutoReload(dumpDownloadFailed, null, path, now)).toBe(true)
    expect(shouldAutoReload(fetchError('[GET] "/__nuxt_content/blog/sql_dump.txt?v=abc": 503 Service Unavailable'), null, path, now)).toBe(true)
  })

  it('shows the dialog when the download fails again after that reload', () => {
    expect(shouldAutoReload(dumpDownloadFailed, liveGuard, path, now)).toBe(false)
  })

  it('shows the dialog for a corrupt dump or a query error', () => {
    expect(shouldAutoReload(new Error('incorrect header check'), null, path, now)).toBe(false)
    expect(shouldAutoReload(new Error('db.exec failed: no such table'), null, path, now)).toBe(false)
    expect(shouldAutoReload(fetchError('[POST] "/__nuxt_content/blog/query?v=abc": 500 Server Error'), null, path, now)).toBe(false)
    expect(shouldAutoReload(new Error('decompressing /__nuxt_content/blog/sql_dump.txt failed'), null, path, now)).toBe(false)
  })

  it('reloads once for a failed code chunk, as before', () => {
    const chunk = new TypeError('Failed to fetch dynamically imported module: /_nuxt/abc.js')
    expect(shouldAutoReload(chunk, null, path, now)).toBe(true)
    expect(shouldAutoReload(chunk, liveGuard, path, now)).toBe(false)
  })
})

describe('isReloadableLoadError', () => {
  it('recognises the failure the production capture recorded', () => {
    expect(
      isReloadableLoadError(
        new TypeError('Failed to fetch dynamically imported module: https://terrarium.feffef.de/_nuxt/abc.js'),
      ),
    ).toBe(true)
  })

  it('recognises the other engines’ wording for the same failure', () => {
    expect(isReloadableLoadError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isReloadableLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
  })

  it('sees through the createError wrapper useAsyncData reports', () => {
    const original = new TypeError('Failed to fetch dynamically imported module: /_nuxt/abc.js')
    const wrapped = new Error('Something went wrong', { cause: original })
    expect(isReloadableLoadError(wrapped)).toBe(true)
  })

  it('recognises an error Nuxt itself classified, whatever its message says', () => {
    const opaque = new Error('boom')
    expect(isReloadableLoadError(opaque)).toBe(false)
    recordChunkLoadError(opaque)
    expect(isReloadableLoadError(opaque)).toBe(true)
    expect(isReloadableLoadError(new Error('wrapper', { cause: opaque }))).toBe(true)
  })

  it('leaves every other content-load failure to the error dialog', () => {
    expect(isReloadableLoadError(undefined)).toBe(false)
    expect(isReloadableLoadError(null)).toBe(false)
    expect(isReloadableLoadError('Failed to fetch')).toBe(false)
    expect(isReloadableLoadError(new Error('Failed to fetch'))).toBe(false)
    expect(isReloadableLoadError(new Error('incorrect header check'))).toBe(false)
    expect(isReloadableLoadError(new Error('db.exec failed: no such table'))).toBe(false)
  })

  it('survives a self-referential cause chain', () => {
    const a = new Error('a') as Error & { cause?: unknown }
    const b = new Error('b') as Error & { cause?: unknown }
    a.cause = b
    b.cause = a
    expect(isReloadableLoadError(a)).toBe(false)
  })
})

describe('reloadAlreadyAttempted', () => {
  const guard = (path: string, expires: number) => JSON.stringify({ path, expires })

  it('is false when nothing has been reloaded yet', () => {
    expect(reloadAlreadyAttempted(null, '/t/blog/david', 1000)).toBe(false)
  })

  it('is true while this path’s guard entry is still live — the fall-back-to-dialog case', () => {
    expect(reloadAlreadyAttempted(guard('/t/blog/david', 2000), '/t/blog/david', 1000)).toBe(true)
  })

  it('is false once the guard entry has expired, so a later failure may recover again', () => {
    expect(reloadAlreadyAttempted(guard('/t/blog/david', 500), '/t/blog/david', 1000)).toBe(false)
  })

  it('is false for a different path — the guard is per-path, like reloadNuxtApp’s own', () => {
    expect(reloadAlreadyAttempted(guard('/t/blog/karen', 2000), '/t/blog/david', 1000)).toBe(false)
  })

  it('is false for an unparseable or foreign guard entry', () => {
    expect(reloadAlreadyAttempted('not json', '/t/blog/david', 1000)).toBe(false)
    expect(reloadAlreadyAttempted('{"path":"/t/blog/david"}', '/t/blog/david', 1000)).toBe(false)
  })
})
