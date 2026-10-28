// Guard for issue #814 (the misuse history lives there): `ScheduleWakeup` is
// valid only inside a `/loop` session; elsewhere a fired wakeup delivers a
// spurious turn that can re-run the session's whole prompt. Doc-only fixes
// (#241, #425) failed, so the deny message is the rule's only home.
//
// Pure core (`detectSessionMode`, `checkLoopOnlyToolCall`) is kept separate from
// the shared stdin/`--dry-run`/bootstrap plumbing (`hook-io.ts`, issue #1080);
// `--dry-run` exercises the same core by hand, so the decision is inspectable
// without a live tool call (an unattended hook is human-only to merge,
// ADR-0004; `--dry-run` keeps that review tractable).
//
// Usage:
//   tsx scripts/hooks/loop-only-tool-guard.ts                      # hook: payload on stdin
//   tsx scripts/hooks/loop-only-tool-guard.ts --dry-run --tool ScheduleWakeup \
//       [--mode loop|non-loop|undeterminable] [--transcript <p>] [--input '<json>']
import {
  denyUninspectable,
  buildDenyOutput,
  printDryRunResult,
  readHookPayload,
  readTranscript,
  requireToolFlag,
  resolveDryRunInput,
  runGuard,
  type DenyOutput,
} from './hook-io.ts'
import { flagValue } from '../lib/cli.ts'
import { commandSkillNames } from '../session/transcript-trace.ts'

const LABEL = '/loop-only tool guard'
const REF = 'issue #814'

/** The only mode `LOOP_ONLY_TOOLS` may be called in, as the harness names it. */
const LOOP_SKILL = 'loop'

/** What the guard could establish about this session. `undeterminable` is a
 *  denial, not a pass — see `checkLoopOnlyToolCall`. */
export type SessionMode = 'loop' | 'non-loop' | 'undeterminable'

/** One tool that is only ever valid inside `/loop`. Data-driven so a
 *  newly-observed variant of the trap is a row here, never a logic change. */
export interface LoopOnlyTool {
  tool: string
  /** What to reach for instead, one line per situation the tool gets misused
   *  in. Quoted verbatim in the deny message, which is the rule's whole
   *  teaching surface for an agent that has opened no doc. */
  instead: readonly string[]
  /** Argument shapes that stay legal in EVERY mode. Optional, and deliberately
   *  narrow: an exemption is a hole in a fail-closed guard. */
  exempt?: (input: Record<string, unknown>) => boolean
  /** Human-readable note about `exempt`, appended to the deny message so the
   *  carve-out is discoverable at the moment it matters. */
  exemptNote?: string
}

export const LOOP_ONLY_TOOLS: readonly LoopOnlyTool[] = [
  {
    tool: 'ScheduleWakeup',
    instead: [
      'Waiting on a dispatched Agent-tool subagent → no wait/poll tool at all. It self-notifies on completion (#425).',
      'Waiting on a backgrounded Bash command → end the turn. The harness delivers a task notification when it exits.',
      'Polling non-webhook-delivered external state (CI/gate completion) → `mcp__Claude_Code_Remote__send_later` to schedule your own check-in (#241).',
    ],
    // A cancel only removes a pending wakeup; denying it would strand a spurious one.
    exempt: (input) => input.stop === true,
    exemptNote: 'Cancelling an already-scheduled wakeup (`stop: true`) is allowed in any mode.',
  },
]

export interface LoopToolFinding {
  tool: string
  /** Never `loop` — that is the allowed case, which yields no finding. */
  mode: Exclude<SessionMode, 'loop'>
  instead: readonly string[]
  exemptNote?: string
}

/** Skill names a record invokes, whether as a slash-command expansion in a user
 *  turn or as a `Skill` tool_use. `commandSkillNames` is reused rather than
 *  re-derived, and it reads only a turn's own text — a `/loop` quoted inside a
 *  tool_result (a session reading a log about this very trap) is correctly not
 *  evidence that a loop is running. */
function skillsInvokedBy(rec: Record<string, unknown>): string[] {
  const msg = rec.message as { content?: unknown } | undefined
  const names = rec.type === 'user' ? commandSkillNames(msg?.content) : []
  const content = msg?.content
  if (Array.isArray(content)) {
    for (const block of content) {
      if (!block || typeof block !== 'object') continue
      const b = block as { type?: string; name?: string; input?: Record<string, unknown> }
      if (b.type !== 'tool_use' || b.name !== 'Skill') continue
      const skill = (b.input?.skill ?? b.input?.command) as string | undefined
      if (skill) names.push(skill.trim().replace(/^\//, ''))
    }
  }
  return names
}

/** The pure, unit-testable mode reader: `records → SessionMode`. `null` (no
 *  readable transcript) and an empty transcript are both `undeterminable` —
 *  a real session always has turns, so nothing can be established from neither.
 *
 *  Any `/loop` invocation reads as `loop`, whatever its pacing. A
 *  fixed-interval loop is paced by the harness and would not call the tool
 *  anyway, so counting it too only avoids false denials; excluding it would need
 *  the command's arguments, which the transcript does not reliably carry. */
export function detectSessionMode(records: Record<string, unknown>[] | null | undefined): SessionMode {
  if (!records || records.length === 0) return 'undeterminable'
  for (const rec of records) {
    if (skillsInvokedBy(rec).includes(LOOP_SKILL)) return 'loop'
  }
  return 'non-loop'
}

/** The pure, unit-testable predicate: `(tool, input, mode) → deny finding | null`.
 *  Returns `null` only for a tool outside the registry, an exempt argument
 *  shape, or a genuine `loop` session. Everything else — including an
 *  undeterminable mode — is a denial: this guard fails CLOSED (#814). Never
 *  throws; a non-object `toolInput` simply matches no exemption. */
export function checkLoopOnlyToolCall(
  toolName: string,
  toolInput: unknown,
  mode: SessionMode,
  registry: readonly LoopOnlyTool[] = LOOP_ONLY_TOOLS,
): LoopToolFinding | null {
  const entry = registry.find((r) => r.tool === toolName)
  if (!entry) return null
  if (mode === 'loop') return null
  const input = toolInput !== null && typeof toolInput === 'object' ? (toolInput as Record<string, unknown>) : {}
  if (entry.exempt?.(input)) return null
  return { tool: entry.tool, mode, instead: entry.instead, exemptNote: entry.exemptNote }
}

/** The corrective message shown to the agent when the guard blocks. Written to
 *  work for a reader who has opened no doc — that is what every recorded
 *  recurrence was — so it states the constraint, the real consequence, and the
 *  concrete alternative rather than pointing at a file. */
export function formatGuardMessage(f: LoopToolFinding): string {
  const why =
    f.mode === 'non-loop'
      ? `this session is not a \`/loop\` session (no \`/loop\` invocation appears in its transcript)`
      : `this session's mode could not be determined (no readable transcript), and the guard fails CLOSED`
  return (
    `Blocked by the /loop-only tool guard (issue #814): \`${f.tool}\` is valid only inside a \`/loop\` ` +
    `session — and ${why}.\n\n` +
    `Outside \`/loop\` this is not a harmless no-op: a fired wakeup delivers a spurious turn that can ` +
    `re-run this session's whole prompt (two recorded cases — an unwanted "autonomous loop tick" that had ` +
    `to be diagnosed and stopped, and a wakeup that would have re-sent \`/audit-docs\` mid-PR-review).\n\n` +
    `Use instead:\n${f.instead.map((line) => `  • ${line}`).join('\n')}\n\n` +
    (f.exemptNote ? `${f.exemptNote}\n\n` : '') +
    `Do not work around this by re-shaping the call. If you believe this genuinely IS a \`/loop\` session, ` +
    `that is a gap in the guard's mode detection — report it on issue #814 rather than routing around it.`
  )
}

/** The `PreToolUse` "deny" control object a hook writes to stdout to block a
 *  call (Claude Code hooks reference). `null` when nothing should be blocked, so
 *  `main` writes nothing and the call proceeds untouched. */
export function denyOutputFor(finding: LoopToolFinding | null): DenyOutput | null {
  return finding ? buildDenyOutput(formatGuardMessage(finding)) : null
}

/** `--dry-run`: print the decision the hook would reach, and exit. Runs no tool
 *  and emits no control object, so a reviewer (or a future session) can exercise
 *  every branch by hand — including with an explicit `--mode`, which is the only
 *  way to reach the `loop` branch without a real `/loop` transcript. */
function dryRun(argv: string[]): void {
  const tool = requireToolFlag(
    argv,
    'usage: --dry-run --tool <name> [--mode loop|non-loop|undeterminable] [--transcript <path>] [--input <json>]',
  )
  const forced = flagValue(argv, '--mode') as SessionMode | undefined
  const mode = forced ?? detectSessionMode(readTranscript(flagValue(argv, '--transcript')))
  const input = resolveDryRunInput(argv)
  const finding = checkLoopOnlyToolCall(tool, input, mode)
  printDryRunResult({ tool, mode, decision: finding ? 'deny' : 'allow', reason: finding ? formatGuardMessage(finding) : undefined })
}

/** Reads the hook JSON on stdin, resolves the session's mode from its
 *  transcript, runs the pure predicate, and writes a deny control object for any
 *  finding. Always exits 0 — the deny travels in stdout, not the exit code. */
export function main(): void {
  const result = readHookPayload()
  if (result.kind === 'none') return
  if (result.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  if (result.kind === 'no-tool') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')
  const { payload } = result

  // Cheap exit for every tool this guard has nothing to say about, BEFORE
  // paying to read a transcript that can be megabytes late in a session.
  if (!LOOP_ONLY_TOOLS.some((t) => t.tool === payload.tool_name)) return

  const mode = detectSessionMode(readTranscript(payload.transcript_path))
  const output = denyOutputFor(checkLoopOnlyToolCall(payload.tool_name, payload.tool_input, mode))
  if (output) process.stdout.write(JSON.stringify(output))
}

runGuard(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
