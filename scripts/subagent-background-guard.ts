// Mechanical backstop for issue #694: a dispatched subagent's own backgrounded
// Bash command can never wake it, so `run_in_background: true` is denied in
// subagent context — and per issue #964, so is a trailing `&`/`nohup … &` in
// the command text, and a `Monitor` call, the two bypass shapes the original
// deny message already warned about but never mechanized. Rationale,
// detection contract, and residual fail-opens are single-homed in
// docs/agents/subagent-background-guard.md — this header does not restate
// them. Pure core is kept separate from the stdin I/O and exercised by
// --dry-run, mirroring the sibling guards (ADR-0004's unattended-hook
// reviewability bar).
//
// Usage:
//   sh scripts/subagent-background-guard.sh          # the installed hook entry
//   tsx scripts/subagent-background-guard.ts         # payload on stdin
//   tsx scripts/subagent-background-guard.ts --dry-run --tool Bash \
//       [--context subagent|main|undeterminable] [--payload '<json>'] [--input '<json>']
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

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

/** Scans `command` for `&` characters that act as a shell job-control
 *  operator — i.e. NOT `&&` (AND-chaining), NOT `&>`/`>&`/`<&` (redirection,
 *  including the common `2>&1`), and NOT inside a single- or double-quoted
 *  string or backslash-escaped. Returns their indices, left to right.
 *
 *  Not a full shell parser (issue #964 accepts this trade-off explicitly):
 *  it does not resolve command substitution (`$(...)`/backticks), here-docs,
 *  or ANSI-C quoting (`$'...'`), so a `&` inside one of those can still
 *  false-positive or false-negative. See
 *  docs/agents/subagent-background-guard.md for the residual list. */
function findUnquotedAmpersands(command: string): number[] {
  const positions: number[] = []
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < command.length; i++) {
    const c = command[i]
    if (inSingle) {
      if (c === "'") inSingle = false
      continue
    }
    if (inDouble) {
      if (c === '\\') { i++; continue } // escaped char inside double quotes
      if (c === '"') inDouble = false
      continue
    }
    if (c === '\\') { i++; continue } // escaped char outside quotes
    if (c === "'") { inSingle = true; continue }
    if (c === '"') { inDouble = true; continue }
    if (c === '&') {
      if (command[i + 1] === '&') { i++; continue } // `&&` — chaining, not backgrounding
      if (command[i + 1] === '>') continue // `&>` — redirect stdout+stderr
      if (command[i - 1] === '>' || command[i - 1] === '<') continue // `>&`/`<&`/`2>&1` — fd dup
      positions.push(i)
    }
  }
  return positions
}

/** True if `command`'s last non-whitespace character is a bare `&` job-
 *  control operator — e.g. `pnpm gate:scoped &`, `long-cmd arg1 arg2   &`. */
function endsWithBackgroundOperator(command: string): boolean {
  const trimmed = command.replace(/\s+$/, '')
  if (!trimmed.endsWith('&')) return false
  const amps = findUnquotedAmpersands(command)
  return amps[amps.length - 1] === trimmed.length - 1
}

/** True if `command` invokes `nohup` as a command word (start of string, or
 *  after a `;`/`&`/`|`/`(` separator) AND contains a bare `&` job-control
 *  operator somewhere after it — nohup's standard backgrounding idiom, even
 *  when the `&` isn't the very last character (e.g. `nohup long & echo hi`). */
function hasNohupBackground(command: string): boolean {
  if (!/(^|[;&|(])\s*nohup\b/.test(command)) return false
  return findUnquotedAmpersands(command).length > 0
}

/** Denies a `Bash` call outside a positively established main session when
 *  either: `run_in_background: true` is set, or the command text itself
 *  backgrounds via a trailing `&` or a `nohup … &` idiom (issue #964 — both
 *  are text-level bypasses of the `run_in_background` flag). Never throws; a
 *  non-object `toolInput` simply carries no `run_in_background`/`command`. */
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
  if (command !== '' && (endsWithBackgroundOperator(command) || hasNohupBackground(command))) {
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
    `  • A preview/dev server needs no backgrounding: \`scripts/preview.ts start\` daemonizes itself ` +
    `from a foreground call and returns.\n\n` +
    `This guard also blocks a trailing \`&\` or a \`nohup … &\` idiom in the command text itself, and a ` +
    `\`Monitor\` call — do not try to route around \`run_in_background: true\` with any of those; they ` +
    `detach or strand the process the same way and add the silent-drop pitfalls CLAUDE.md records. If ` +
    `you believe this genuinely IS the main session, that is a gap in the guard's context detection — ` +
    `report it on issue #694 rather than routing around it.`
  )
}

/** `null` when nothing should be blocked, so `main` writes nothing and the
 *  call proceeds untouched. */
export function denyOutputFor(finding: BackgroundFinding | null): { hookSpecificOutput: Record<string, string> } | null {
  if (!finding) return null
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: formatGuardMessage(finding),
    },
  }
}

interface PreToolUsePayload {
  tool_name?: string
  tool_input?: unknown
}

/** Fail-closed's edge, bounded: the pre-filter only forwards
 *  backgrounded-looking calls, so this can never wedge foreground tool use. */
function denyUninspectable(detail: string): void {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `Blocked by the subagent background guard (issue #694): ${detail}, so this call could not be ` +
          `checked. The guard fails CLOSED. This is a guard fault, not an authoring mistake — report ` +
          `it rather than working around it.`,
      },
    }),
  )
}

/** Always exits 0 — the deny travels in stdout, not the exit code. */
export function main(): void {
  let raw: string
  try {
    raw = readFileSync(0, 'utf8')
  } catch {
    return // not invoked as a hook (no stdin at all) — nothing was requested
  }
  if (!raw.trim()) return // a bare manual run, not a tool call to police

  let payload: PreToolUsePayload
  try {
    payload = JSON.parse(raw)
  } catch {
    return denyUninspectable('the hook payload was not valid JSON')
  }
  if (typeof payload.tool_name !== 'string') {
    return denyUninspectable('the hook payload named no tool')
  }

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
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(name)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const tool = flag('--tool')
  if (!tool) {
    console.error('usage: --dry-run --tool <name> [--context subagent|main|undeterminable] [--payload <json>] [--input <json>]')
    process.exit(1)
  }
  const parse = (name: string): unknown => {
    const rawValue = flag(name)
    if (rawValue === undefined) return undefined
    try {
      return JSON.parse(rawValue)
    } catch {
      console.error(`${name} must be valid JSON`)
      process.exit(1)
    }
  }
  const forced = flag('--context') as AgentContext | undefined
  const context = forced ?? detectAgentContext(parse('--payload') ?? null)
  const input = parse('--input') ?? {}
  const finding = checkBackgroundedBash(tool, input, context) ?? checkMonitorCall(tool, context)
  console.log(
    JSON.stringify(
      { tool, context, decision: finding ? 'deny' : 'allow', reason: finding ? formatGuardMessage(finding) : undefined },
      null,
      2,
    ),
  )
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2)
  try {
    if (argv.includes('--dry-run')) dryRun(argv)
    else main()
  } catch (err) {
    // Fail closed: a crash in the guard is a reason to stop, not to wave the
    // call through — matching the sibling guards.
    denyUninspectable(`the guard itself crashed (${err instanceof Error ? err.message : String(err)})`)
  }
}
