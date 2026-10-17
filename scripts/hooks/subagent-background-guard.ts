// A dispatched subagent's own backgrounded Bash command can never wake it, so
// `run_in_background: true`, a bare `&` anywhere in the command text (`nohup … &`
// included) and a `Monitor` call are denied in subagent context (issues #694,
// #964, #995). Detection contract, residual fail-opens and shared conventions:
// docs/agents/guards.md.
//
// Usage:
//   sh scripts/hooks/subagent-background-guard.sh          # the installed Bash hook entry
//   tsx scripts/hooks/subagent-background-guard.ts         # payload on stdin (Bash and Monitor alike)
//   tsx scripts/hooks/subagent-background-guard.ts --dry-run --tool Bash \
//       [--context subagent|main|undeterminable] [--payload '<json>'] [--input '<json>']
import { buildDenyOutput, denyUninspectable, printDryRunResult, readHookPayload, requireToolFlag, resolveDryRunInput, runGuard, type DenyOutput } from './hook-io.ts'
import { flagValue } from '../lib/cli.ts'

const LABEL = 'subagent background guard'
const REF = 'issue #694'

/** `undeterminable` is a denial, not a pass — see `checkBackgroundedBash`. */
export type AgentContext = 'subagent' | 'main' | 'undeterminable'

/** PreToolUse payload → who is calling. Either agent field suffices — deny
 *  scope must not hinge on both surviving a harness change. */
export function detectAgentContext(payload: unknown): AgentContext {
  if (payload === null || typeof payload !== 'object') return 'undeterminable'
  const p = payload as Record<string, unknown>
  if (typeof p.agent_id === 'string' || typeof p.agent_type === 'string') return 'subagent'
  if (typeof p.session_id === 'string' || typeof p.transcript_path === 'string') return 'main'
  return 'undeterminable'
}

export interface BackgroundFinding {
  /** Never `main` — that is the allowed caller, which yields no finding. */
  context: Exclude<AgentContext, 'main'>
  /** Which bypass shape tripped the guard — informational only (e.g. for
   *  `--dry-run` output); every signal shares the same deny message. */
  signal: 'run_in_background' | 'command-text' | 'monitor'
}

/** True if `command` has a bare `&` job-control operator anywhere, not just
 *  trailing. Strips quoted/escaped spans, `&&` and `&>`/`>&`/`<&` redirection
 *  first. Not a full shell parser (issue #964): command substitution, here-docs
 *  and `$'...'` aren't resolved; see docs/agents/guards.md for the residual list. */
export function hasBackgroundOperator(command: string): boolean {
  const unquoted = command.replace(/'[^']*'|"(?:[^"\\]|\\.)*"|\\./g, '')
  const withoutOperators = unquoted.replace(/&&|[<>]&|&>/g, '')
  return withoutOperators.includes('&')
}

/** Denies a `Bash` call outside a positively established main session when
 *  either: `run_in_background: true` is set, or the command text itself
 *  backgrounds via any bare `&` job-control operator, trailing or not — the
 *  `nohup … &` idiom included, since it's just this same operator with a
 *  `nohup` prefix (issue #964 — both are text-level bypasses of the
 *  `run_in_background` flag). Never throws; a non-object `toolInput` simply
 *  carries no `run_in_background`/`command`. */
export function checkBackgroundedBash(
  toolName: string,
  toolInput: unknown,
  context: AgentContext,
): BackgroundFinding | null {
  if (toolName !== 'Bash') return null
  if (context === 'main') return null
  const input = toolInput !== null && typeof toolInput === 'object' ? (toolInput as Record<string, unknown>) : {}
  if (input.run_in_background === true) return { context, signal: 'run_in_background' }
  const command = typeof input.command === 'string' ? input.command : ''
  if (command !== '' && hasBackgroundOperator(command)) {
    return { context, signal: 'command-text' }
  }
  return null
}

/** Denies a `Monitor` call outside a positively established main session
 *  (issue #964): a dispatched subagent has no wake mechanism a `Monitor`
 *  notification could ever resume, so the call can only strand it "waiting"
 *  the same way a backgrounded Bash command does. */
export function checkMonitorCall(toolName: string, context: AgentContext): BackgroundFinding | null {
  if (toolName !== 'Monitor') return null
  if (context === 'main') return null
  return { context, signal: 'monitor' }
}

/** Self-contained by design: every recorded recurrence had "foreground" prose
 *  available and skipped — the deny message is the rule's teaching surface. */
export function formatGuardMessage(f: BackgroundFinding): string {
  const why =
    f.context === 'subagent'
      ? `this session is a dispatched subagent (the hook payload carries an agent id)`
      : `this session's context could not be positively established, and the guard fails CLOSED`
  return (
    `Blocked by the subagent background guard (issues #694, #964): a dispatched subagent may not ` +
    `background a command, or call \`Monitor\` to wait on one — and ${why}.\n\n` +
    `A subagent's own backgrounded command can NEVER wake it: the task-notification wake exists only ` +
    `for the main session, and \`Monitor\` notifications do not resume a stopped subagent either — only ` +
    `an orchestrator's \`SendMessage\` does. Four recorded impl agents backgrounded \`pnpm gate:scoped\`, ` +
    `ended their turn "waiting", and stalled until manually resumed.\n\n` +
    `Do instead:\n` +
    `  • Run the command in the FOREGROUND and wait: pass an explicit \`timeout\` (up to 600000 ms).\n` +
    `  • If it cannot finish inside 10 minutes, split it into separate foreground calls ` +
    `(e.g. \`pnpm test\`, then \`pnpm build\`, then \`pnpm test:e2e\`).\n` +
    `  • A preview/dev server needs no backgrounding: \`scripts/ui/preview.ts start\` daemonizes itself ` +
    `from a foreground call and returns.\n\n` +
    `This guard also blocks a bare \`&\` anywhere in the command text (trailing or not — \`nohup … &\` ` +
    `included), and a \`Monitor\` call — do not try to route around \`run_in_background: true\` with any ` +
    `of those; they detach or strand the process the same way. If ` +
    `you believe this genuinely IS the main session, that is a gap in the guard's context detection — ` +
    `report it on issue #694 rather than routing around it.`
  )
}

/** `null` when nothing should be blocked, so `main` writes nothing and the
 *  call proceeds untouched. */
export function denyOutputFor(finding: BackgroundFinding | null): DenyOutput | null {
  return finding ? buildDenyOutput(formatGuardMessage(finding)) : null
}

/** Always exits 0 — the deny travels in stdout, not the exit code. The
 *  pre-filter only forwards backgrounded-looking calls, so failing closed on an
 *  unreadable payload can never wedge foreground tool use. */
export function main(): void {
  const read = readHookPayload()
  if (read.kind === 'none') return
  if (read.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  if (read.kind === 'no-tool') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')
  const { payload } = read

  const context = detectAgentContext(payload)
  const finding =
    checkBackgroundedBash(payload.tool_name, payload.tool_input, context) ??
    checkMonitorCall(payload.tool_name, context)
  const output = denyOutputFor(finding)
  if (output) process.stdout.write(JSON.stringify(output))
}

/** Print the decision the hook would reach, running nothing. `--payload`
 *  derives the context exactly as the hook would; `--context` forces it. */
function dryRun(argv: string[]): void {
  const tool = requireToolFlag(
    argv,
    'usage: --dry-run --tool <name> [--context subagent|main|undeterminable] [--payload <json>] [--input <json>]',
  )
  const rawPayload = flagValue(argv, '--payload')
  let payload: unknown = null
  if (rawPayload !== undefined) {
    try {
      payload = JSON.parse(rawPayload)
    } catch {
      console.error('--payload must be valid JSON')
      process.exit(1)
    }
  }
  const context = (flagValue(argv, '--context') as AgentContext | undefined) ?? detectAgentContext(payload)
  const finding = checkBackgroundedBash(tool, resolveDryRunInput(argv), context) ?? checkMonitorCall(tool, context)
  printDryRunResult({ tool, context, decision: finding ? 'deny' : 'allow', reason: finding ? formatGuardMessage(finding) : undefined })
}

runGuard(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
