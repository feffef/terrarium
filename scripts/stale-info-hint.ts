// A hint, not a guard (issue #1610): when a lease push is rejected as "stale
// info", the remote branch was usually auto-deleted when its PR merged, and
// agents misread the rejection as a concurrent write and retry. This adds the
// fix to the same tool result. It never blocks or rewrites a command, and fails
// open: any error writes nothing (ADR-0027: a hook warns and exits 0).
//
// Wired to both PostToolUse (a push chained past a later step that succeeds)
// and PostToolUseFailure (a bare failing push), each on `Bash`, behind the
// `sh` pre-filter `scripts/stale-info-hint.sh`.
//
// Usage:
//   sh scripts/stale-info-hint.sh                 # the installed hook entry
//   tsx scripts/stale-info-hint.ts                # hook payload on stdin
//   tsx scripts/stale-info-hint.ts --dry-run (--input '<payload json>' | --input-file <path>)
import { printDryRunResult, readHookPayload, resolveDryRunInput, runIfMain } from './guard-io.ts'

const HINT =
  'This push was rejected as "stale info" (issue #1610). The remote branch was probably deleted when its PR ' +
  'merged, so your remote-tracking ref is stale; this is not a concurrent write. Run `git remote prune origin` ' +
  'and push again, or push without `--force-with-lease`.'

/** A `git … push` on one line of the command; per line, so a push on one line
 *  and an unrelated `git` on another never combine. */
const GIT_PUSH = /\bgit\b[^\n]*\bpush\b/

/** git's own rejection line. Single-line by construction (`[^\n]`), so prose
 *  that merely mentions "stale info" elsewhere in the output never matches. */
const STALE_REJECTION = /\[rejected\][^\n]*\(stale info\)/

interface HintPayload {
  tool_name?: unknown
  tool_input?: { command?: unknown } | null
  tool_response?: { stdout?: unknown; stderr?: unknown } | null
  error?: unknown
}

/** The output text of a PostToolUse (`tool_response`) or PostToolUseFailure
 *  (`error`) payload. */
function outputOf(p: HintPayload): string {
  const parts = [p.tool_response?.stdout, p.tool_response?.stderr, p.error]
  return parts.filter((s): s is string => typeof s === 'string').join('\n')
}

/** The hint for a Bash `git push` rejected as stale info, else `null`. Never
 *  throws. */
export function staleInfoHint(payload: unknown): string | null {
  if (payload === null || typeof payload !== 'object') return null
  const p = payload as HintPayload
  const command = p.tool_input?.command
  if (p.tool_name !== 'Bash' || typeof command !== 'string' || !GIT_PUSH.test(command)) return null
  return STALE_REJECTION.test(outputOf(p)) ? HINT : null
}

function main(): void {
  const result = readHookPayload()
  if (result.kind !== 'ok') return
  const hint = staleInfoHint(result.payload)
  if (!hint) return
  const event = (result.payload as { hook_event_name?: unknown }).hook_event_name
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: event === 'PostToolUseFailure' ? event : 'PostToolUse',
        additionalContext: hint,
      },
    }),
  )
}

function dryRun(argv: string[]): void {
  printDryRunResult({ hint: staleInfoHint(resolveDryRunInput(argv)) })
}

runIfMain(import.meta.url, { main, dryRun, label: 'stale-info hint', ref: 'issue #1610', failOpen: true })
