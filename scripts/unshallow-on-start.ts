// SessionStart hook: unshallow before any session can read truncated history,
// removing the "check first" precondition four rounds of prose failed to hold
// (issue #772).
import { isShallowRepository, unshallow } from './git-helpers.ts'

try {
  if (isShallowRepository(process.cwd())) unshallow(process.cwd())
} catch {
  // Best-effort: a probe/fetch failure must never block session start.
}
