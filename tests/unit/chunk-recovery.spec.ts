// L0 — the pure half of the chunk-load auto-recovery decision (issue #236):
// which failed content loads count as "a build chunk failed to import" (the one
// class a reload fixes), and when `reloadNuxtApp`'s own guard says a reload has
// already been attempted for this path. The Nuxt-facing half (the plugin's
// `app:chunkError` feed, the reload itself) is covered by the blog L2 e2e.
import { describe, expect, it } from 'vitest'
import {
  isChunkLoadError,
  recordChunkLoadError,
  reloadAlreadyAttempted,
} from '../../app/utils/chunkRecovery.ts'

describe('isChunkLoadError', () => {
  it('recognises the failure the production capture recorded', () => {
    expect(
      isChunkLoadError(
        new TypeError('Failed to fetch dynamically imported module: https://terrarium.feffef.de/_nuxt/abc.js'),
      ),
    ).toBe(true)
  })

  it('recognises the other engines’ wording for the same failure', () => {
    expect(isChunkLoadError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isChunkLoadError(new TypeError('Importing a module script failed.'))).toBe(true)
  })

  it('sees through the createError wrapper useAsyncData reports', () => {
    const original = new TypeError('Failed to fetch dynamically imported module: /_nuxt/abc.js')
    const wrapped = new Error('Something went wrong', { cause: original })
    expect(isChunkLoadError(wrapped)).toBe(true)
  })

  it('recognises an error Nuxt itself classified, whatever its message says', () => {
    const opaque = new Error('boom')
    expect(isChunkLoadError(opaque)).toBe(false)
    recordChunkLoadError(opaque)
    expect(isChunkLoadError(opaque)).toBe(true)
    expect(isChunkLoadError(new Error('wrapper', { cause: opaque }))).toBe(true)
  })

  it('leaves every other content-load failure to the error dialog', () => {
    expect(isChunkLoadError(undefined)).toBe(false)
    expect(isChunkLoadError(null)).toBe(false)
    expect(isChunkLoadError('Failed to fetch')).toBe(false)
    expect(isChunkLoadError(new Error('Failed to fetch'))).toBe(false)
    expect(isChunkLoadError(new Error('incorrect header check'))).toBe(false)
    expect(isChunkLoadError(new Error('db.exec failed: no such table'))).toBe(false)
  })

  it('survives a self-referential cause chain', () => {
    const a = new Error('a') as Error & { cause?: unknown }
    const b = new Error('b') as Error & { cause?: unknown }
    a.cause = b
    b.cause = a
    expect(isChunkLoadError(a)).toBe(false)
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
