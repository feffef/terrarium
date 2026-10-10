// A hint, not a guard (issue #1610): when a lease push is rejected as "stale
// info", the remote branch was usually auto-deleted when its PR merged, and
// agents misread the rejection as a concurrent write and retry. This adds the
// fix to the same tool result. It never blocks or rewrites a command, and fails
// open: any error writes nothing (ADR-0027: a hook warns and exits 0).
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

function field(obj: unknown, key: string): unknown {
  return obj !== null && typeof obj === 'object' ? (obj as Record<string, unknown>)[key] : undefined
}

/** The hint for a Bash `git push` rejected as stale info, else `null`. Never
 *  throws. */
export function staleInfoHint(payload: unknown): string | null {
  const command = field(field(payload, 'tool_input'), 'command')
  if (field(payload, 'tool_name') !== 'Bash') return null
  if (typeof command !== 'string' || !GIT_PUSH.test(command)) return null
  // PostToolUse carries `tool_response`; PostToolUseFailure carries `error`.
  const response = field(payload, 'tool_response')
  const output = [field(response, 'stdout'), field(response, 'stderr'), field(payload, 'error')]
  return output.some((s) => typeof s === 'string' && STALE_REJECTION.test(s)) ? HINT : null
}

function main(): void {
  const result = readHookPayload()
  if (result.kind !== 'ok') return
  const hint = staleInfoHint(result.payload)
  if (!hint) return
  const event = field(result.payload, 'hook_event_name')
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
