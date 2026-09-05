// Mechanical backstop for issue #835: the `Agent` tool ignores
// `run_in_background: false` — every call runs as an async background task
// regardless — and #810/#815's fix landed only in
// `dispatch-subagents/SKILL.md`, which a caller who skips that Skill never
// reads (recorded regression: a scheduled sweep dispatched `Agent` calls
// directly and was still surprised). Same failure shape as #814/#1018, same
// fix: a `PreToolUse` guard replaces the prose.
//
// Runs unattended, so it is human-only to merge (ADR-0004, 2026-07-30). Pure
// core split from the shared stdin/`--dry-run`/bootstrap plumbing
// (`guard-io.ts`, issue #1080). No transcript read: the finding is decidable
// from `tool_input` alone.
//
// Usage:
//   tsx scripts/agent-background-flag-guard.ts                # hook: payload on stdin
//   tsx scripts/agent-background-flag-guard.ts --dry-run --tool Agent \
//       [--input '<json>']
import {
  denyUninspectable,
  buildDenyOutput,
  printDryRunResult,
  readHookPayload,
  requireToolFlag,
  resolveDryRunInput,
  runIfMain,
  type DenyOutput,
} from './guard-io.ts'

const LABEL = 'Agent-background-flag guard'
const REF = 'issue #835'

/** The pure, unit-testable predicate: `toolInput → is a denied call`. Only an
 *  explicit `false` is a finding — omitted or `true` is the tool's real,
 *  harmless behaviour. Never throws; a non-object `toolInput` carries no flag. */
export function checkAgentBackgroundFlag(toolInput: unknown): boolean {
  const input = toolInput !== null && typeof toolInput === 'object' ? (toolInput as Record<string, unknown>) : {}
  return input.run_in_background === false
}

/** Written for a reader who has opened no doc: states the tool's actual
 *  behaviour and the fix, not just the rule. */
export function formatGuardMessage(): string {
  return (
    `Blocked by the ${LABEL} (${REF}): \`run_in_background: false\` is a no-op on the \`Agent\` tool — every ` +
    `Agent call runs as an async background task regardless of this flag.\n\n` +
    `Omit \`run_in_background\`, or pass \`true\`. Wait for the automatic task-notification / result the ` +
    `dispatched subagent delivers, rather than assuming a synchronous inline return.`
  )
}

/** `null` when nothing should be blocked, so an ordinary Agent call proceeds
 *  untouched. */
export function denyOutputFor(finding: boolean): DenyOutput | null {
  return finding ? buildDenyOutput(formatGuardMessage()) : null
}

/** `--dry-run`: print the decision the hook would reach, and exit. */
function dryRun(argv: string[]): void {
  const tool = requireToolFlag(argv, 'usage: --dry-run --tool Agent [--input <json>]')
  const finding = checkAgentBackgroundFlag(resolveDryRunInput(argv))
  printDryRunResult({ tool, decision: finding ? 'deny' : 'allow', reason: finding ? formatGuardMessage() : undefined })
}

/** Always exits 0 — the deny travels in stdout, not the exit code. Same
 *  residual fail-open as every guard on this plumbing: the hook is invoked
 *  `|| true`, so a missing `tsx`/`pnpm` dies before this file runs at all. */
export function main(): void {
  const result = readHookPayload()
  if (result.kind === 'none') return
  if (result.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  if (result.kind === 'no-tool') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')

  const output = denyOutputFor(checkAgentBackgroundFlag(result.payload.tool_input))
  if (output) process.stdout.write(JSON.stringify(output))
}

runIfMain(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
