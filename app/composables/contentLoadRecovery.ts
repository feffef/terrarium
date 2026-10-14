// The one shared mechanism every Space page's failed content load goes through,
// wired in once at ContentLoadErrorDialog rather than repeated at each page
// (issue #236). Only a failed chunk or database download auto-recovers; every
// other failure keeps the dialog, because a reload loop is worse than a modal
// (ADR-0019).
import { RELOAD_GUARD_KEY, shouldAutoReload } from '../utils/chunkRecovery'

/**
 * Reload the app when a content load failed in a way a reload fixes, at most
 * once per path per `reloadNuxtApp` TTL. Returns whether the caller should
 * stand down (a reload is under way) or surface the error dialog instead.
 */
export function recoverFromContentLoadError(error: unknown): boolean {
  if (!import.meta.client) return false

  const path = window.location.pathname
  let guard: string | null = null
  try {
    guard = window.sessionStorage.getItem(RELOAD_GUARD_KEY)
  } catch {
    /* storage can be unavailable; treat it as "not yet attempted" */
  }
  if (!shouldAutoReload(error, guard, path, Date.now())) return false

  // No explicit `path`: reloadNuxtApp then reloads the current URL in place,
  // keeping the query string a path-only reload would drop.
  reloadNuxtApp({ persistState: true })
  return true
}
