// SessionStart hook: unshallow before any session can read truncated history,
// removing the "check first" precondition four rounds of prose failed to hold
// (issue #772).
import { isShallowRepository, unshallow, UNSHALLOW_TIMEOUT_MS } from './git-helpers.ts'

try {
  // Quiet: git's per-remote-branch fetch output is noise at session start (#930).
  if (isShallowRepository(process.cwd())) unshallow(process.cwd(), UNSHALLOW_TIMEOUT_MS, true)
} catch {
  // Best-effort: a probe/fetch failure must never block session start.
}
