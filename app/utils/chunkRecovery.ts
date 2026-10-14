// Deciding whether a failed client-side content load is one a page reload
// fixes: a failed dynamic import of a build chunk (issue #236) or a failed
// download of the Content database dump (issue #1902; ADR-0019).
//
// Framework-free on purpose: the decision is pure so it can be unit-tested
// without a browser, while the Nuxt-facing half (the `app:chunkError` feed and
// `reloadNuxtApp`) stays in the plugin/composable that import this.

const chunkLoadErrors = new WeakSet<object>()

/** Feed from Nuxt's `app:chunkError` hook — see app/plugins/chunk-errors.client.ts. */
export function recordChunkLoadError(error: unknown): void {
  if (error && typeof error === 'object') chunkLoadErrors.add(error)
}

// Fallback for an import failure that never passed through Vite's preload
// helper (so `app:chunkError` never saw the object). Each engine words it
// differently — Chromium "Failed to fetch dynamically imported module",
// Firefox "error loading dynamically imported module", WebKit "Importing a
// module script failed" — so all three are matched rather than one browser's.
const DYNAMIC_IMPORT_FAILURE
  = /failed to fetch dynamically imported module|error loading dynamically imported module|importing a module script failed/i

// ofetch's FetchError message for @nuxt/content's dump download: `[GET] "<url>": `
// then the status. Matched by message because h3's createError, which
// useAsyncData applies, copies the message but drops the FetchError object. A
// corrupt dump fails later, in decompression, with a different message.
const DUMP_DOWNLOAD_FAILURE = /^\[GET\] "[^"]*\/__nuxt_content\/[^/"]+\/sql_dump\.txt[?"]/

// useAsyncData hands the page a `createError()` wrapper whose `cause` is the
// original import failure, and h3 can nest one wrapper deeper still.
const MAX_CAUSE_DEPTH = 5

export function isReloadableLoadError(error: unknown): boolean {
  let current: unknown = error
  for (let depth = 0; current && depth <= MAX_CAUSE_DEPTH; depth++) {
    if (typeof current === 'object' && chunkLoadErrors.has(current as object)) return true
    const message = (current as { message?: unknown }).message
    if (typeof message === 'string' && (DYNAMIC_IMPORT_FAILURE.test(message) || DUMP_DOWNLOAD_FAILURE.test(message))) return true
    current = (current as { cause?: unknown }).cause
  }
  return false
}

/** The sessionStorage key `reloadNuxtApp` writes its own reload-loop guard to. */
export const RELOAD_GUARD_KEY = 'nuxt:reload'

/**
 * Whether `reloadNuxtApp` would refuse to reload `path` again — read from the
 * very guard entry it writes (nuxt/dist/app/composables/chunk.js), mirroring
 * its condition rather than keeping a second attempt counter. Callers need the
 * answer *before* calling, because `reloadNuxtApp` returns nothing when it
 * declines and the caller must then fall back to the error dialog (issue #236).
 */
export function reloadAlreadyAttempted(rawGuard: string | null, path: string, now: number): boolean {
  if (!rawGuard) return false
  try {
    const guard = JSON.parse(rawGuard) as { path?: unknown, expires?: unknown }
    return guard?.path === path && typeof guard.expires === 'number' && guard.expires >= now
  } catch {
    return false
  }
}

/** Whether to reload `path` now rather than show the error dialog. */
export function shouldAutoReload(error: unknown, rawGuard: string | null, path: string, now: number): boolean {
  return isReloadableLoadError(error) && !reloadAlreadyAttempted(rawGuard, path, now)
}
