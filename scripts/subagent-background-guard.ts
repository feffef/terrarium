// Mechanical backstop for issue #694: a dispatched subagent's own backgrounded
// Bash command can never wake it, so `run_in_background: true` is denied in
// subagent context. Rationale, detection contract, and residual fail-opens are
// single-homed in docs/agents/subagent-background-guard.md — this header does
// not restate them. Pure core is kept separate from the stdin I/O and
// exercised by --dry-run, mirroring the sibling guards (ADR-0004's
// unattended-hook reviewability bar).
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
}

/** Denies exactly a `Bash` call with `run_in_background: true` outside a
 *  positively established main session. Never throws; a non-object
 *  `toolInput` simply carries no `run_in_background`. */
export function checkBackgroundedBash(
  toolName: string,
  toolInput: unknown,
  context: AgentContext,
): BackgroundFinding | null {
  if (toolName !== 'Bash') return null
  if (context === 'main') return null
  const input = toolInput !== null && typeof toolInput === 'object' ? (toolInput as Record<string, unknown>) : {}
  if (input.run_in_background !== true) return null
  return { context }
}

/** Self-contained by design: every recorded recurrence had "foreground" prose
 *  available and skipped — the deny message is the rule's teaching surface. */
export function formatGuardMessage(f: BackgroundFinding): string {
  const why =
    f.context === 'subagent'
      ? `this session is a dispatched subagent (the hook payload carries an agent id)`
      : `this session's context could not be positively established, and the guard fails CLOSED`
  return (
    `Blocked by the subagent background guard (issue #694): \`run_in_background: true\` is not usable ` +
    `from a dispatched subagent — and ${why}.\n\n` +
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
    `Do not work around this with a trailing \`&\` — that detaches the process the same way and adds ` +
    `the silent-drop pitfalls CLAUDE.md records. If you believe this genuinely IS the main session, ` +
    `that is a gap in the guard's context detection — report it on issue #694 rather than routing ` +
    `around it.`
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
  const output = denyOutputFor(checkBackgroundedBash(payload.tool_name, payload.tool_input, context))
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
  const finding = checkBackgroundedBash(tool, input, context)
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
