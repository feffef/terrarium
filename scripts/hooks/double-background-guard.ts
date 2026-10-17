// Mechanical backstop for issue #1208: a `Bash` call that sets
// `run_in_background: true` AND also backgrounds itself in the command text
// (a bare `&` anywhere, `nohup … &` included) silently lies about
// completion — the outer tool call returns as soon as the text-level `&`
// detaches the process, not when the real command finishes, so "completed"
// stops meaning anything. A prose warning in CLAUDE.md didn't hold
// (recurrences 2026-09-08, 2026-09-09) and has since been cut, so the deny
// message is the rule's only home.
//
// Deliberately caller-agnostic — no `detectAgentContext` gate at all.
// `subagent-background-guard.ts`'s rule is "a subagent may never background
// at all" (`context === 'main'` is explicitly untouched there); this rule is
// about the DOUBLE-background COMBO itself, which is broken the same way
// regardless of who is calling. A subagent hitting this combo is already
// denied by that sibling guard on the `run_in_background: true` signal
// alone, so this guard's practical audience is the main session, which the
// sibling guard does not police (docs/agents/guards.md: "Orchestrators are
// untouched"). Detection reuses `hasBackgroundOperator`, exported from
// `subagent-background-guard.ts` rather than duplicated — issue #964 already
// solved the quote-aware `&` scan; see that file's header for the residual
// fail-opens (command substitution, here-docs, ANSI-C quoting).
//
// Runs unattended, so it is human-only to merge (ADR-0004). Pure
// core split from the shared stdin/`--dry-run`/bootstrap plumbing
// (`hook-io.ts`, issue #1080).
//
// Usage:
//   sh scripts/hooks/double-background-guard.sh             # the installed hook entry
//   tsx scripts/hooks/double-background-guard.ts            # payload on stdin
//   tsx scripts/hooks/double-background-guard.ts --dry-run --tool Bash --input '<json>'
import {
  buildDenyOutput,
  denyUninspectable,
  printDryRunResult,
  readHookPayload,
  requireToolFlag,
  resolveDryRunInput,
  runGuard,
  type DenyOutput,
} from './hook-io.ts'
import { hasBackgroundOperator } from './subagent-background-guard.ts'

const LABEL = 'double-background guard'
const REF = 'issue #1208'

/** True only when BOTH signals fire on the same call: `run_in_background:
 *  true` AND the command text itself also backgrounds. Either alone is fine
 *  and untouched — `run_in_background: true` alone is the ordinary, correct
 *  way to background a command, and a lone trailing `&`/`nohup … &` with no
 *  flag set backgrounds only the shell's own job, which the tool call still
 *  waits out correctly. Never throws; a non-object `toolInput` simply
 *  carries neither signal. */
export function checkDoubleBackground(toolName: string, toolInput: unknown): boolean {
  if (toolName !== 'Bash') return false
  const input = toolInput !== null && typeof toolInput === 'object' ? (toolInput as Record<string, unknown>) : {}
  if (input.run_in_background !== true) return false
  const command = typeof input.command === 'string' ? input.command : ''
  return command !== '' && hasBackgroundOperator(command)
}

/** The nothing-ran line is there because sessions chained edits or commits
 *  into the denied call and noticed late that they never ran (Friction
 *  Ledger entry `double-background`). */
export function formatGuardMessage(): string {
  return (
    `Blocked by the ${LABEL} (${REF}): this Bash call sets \`run_in_background: true\` AND the command text ` +
    `itself also backgrounds (a bare \`&\` anywhere, \`nohup … &\` included) — stacking both means the outer ` +
    `tool call returns as soon as the text-level \`&\` detaches the process, not when the real command ` +
    `finishes, so "completed" stops meaning anything. This is broken the same way for a main session as for a ` +
    `subagent — it is not the subagent-only rule \`subagent-background-guard.ts\` enforces.\n\n` +
    `Nothing in this call ran, including commands chained with \`&&\` or \`;\`; resend them separately.\n\n` +
    `Do instead: pass \`run_in_background: true\` alone, with a plain foreground command — no trailing ` +
    `\`&\`, no \`nohup ... &\`.\n\n` +
    `If you believe this genuinely is a single background operation, that is a gap in this guard — report it ` +
    `on ${REF} rather than routing around it.`
  )
}

/** `null` when nothing should be blocked, so an ordinary call proceeds
 *  untouched. */
export function denyOutputFor(finding: boolean): DenyOutput | null {
  return finding ? buildDenyOutput(formatGuardMessage()) : null
}

/** Always exits 0 — the deny travels in stdout, not the exit code. */
export function main(): void {
  const result = readHookPayload()
  if (result.kind === 'none') return
  if (result.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  if (result.kind === 'no-tool') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')

  const output = denyOutputFor(checkDoubleBackground(result.payload.tool_name, result.payload.tool_input))
  if (output) process.stdout.write(JSON.stringify(output))
}

/** Print the decision the hook would reach, running nothing. */
function dryRun(argv: string[]): void {
  const tool = requireToolFlag(argv, 'usage: --dry-run --tool <name> [--input <json> | --input-file <path>]')
  // `--input-file` exists because a denying `--input` cannot survive the
  // trip inline: that Bash call is itself the one this guard would deny.
  const input = resolveDryRunInput(argv)
  const finding = checkDoubleBackground(tool, input)
  printDryRunResult({ tool, decision: finding ? 'deny' : 'allow', reason: finding ? formatGuardMessage() : undefined })
}

runGuard(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
