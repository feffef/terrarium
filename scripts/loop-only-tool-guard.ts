// Mechanical backstop for issue #814: `ScheduleWakeup` is valid only inside a
// `/loop` session's dynamic (self-paced) mode, and two doc-only fixes (#241,
// #425) failed to stop plain scheduled and interactive sessions reaching for it
// anyway. Both wrote the rule into `docs/agents/github-integration.md`, which
// none of the affected sessions had reason to open. This guard, plus CLAUDE.md
// now carrying the rule in its own right, is the owner's chosen two-layer fix.
//
// Why a call outside `/loop` is not inert: a fired wakeup delivers a spurious
// turn that can re-run the session's whole prompt. Two of the recorded misuses
// had real consequences rather than a harmless no-op — an unwanted "autonomous
// loop tick" that had to be diagnosed and stopped, and a wakeup that would have
// re-sent `/audit-docs` mid-PR-review had it not been cancelled (#814).
//
// Pure core (`detectSessionMode`, `checkLoopOnlyToolCall`) is kept separate from
// the stdin/transcript I/O (`main`), mirroring `deferred-tool-guard.ts` /
// `github-provenance-guard.ts` / `session-id-guard.ts`. `--dry-run` exercises
// the same core by hand, so the decision is inspectable without a live tool call
// (ADR-0004's 2026-07-30 amendment makes an unattended, un-exercisable hook
// human-only to merge; this is what keeps that review tractable).
//
// Usage:
//   tsx scripts/loop-only-tool-guard.ts                      # hook: payload on stdin
//   tsx scripts/loop-only-tool-guard.ts --dry-run --tool ScheduleWakeup \
//       [--mode loop|non-loop|undeterminable] [--transcript <p>] [--input '<json>']
import { readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { commandSkillNames, parseTranscript } from './session-trace.ts'

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
    // Cancelling is the one call that can only ever REMOVE a pending wakeup, and
    // denying it would strand a spurious one with no way to stop it — the exact
    // situation several logged sessions had to dig themselves out of (#814).
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
 *  Deliberately broader than "`/loop` DYNAMIC mode": any `/loop` invocation
 *  reads as `loop`. A fixed-interval loop is paced by the harness and would not
 *  call the tool anyway, so widening here only avoids false denials; narrowing
 *  would need the command's arguments, which the transcript does not reliably
 *  carry. */
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
    `session's dynamic, self-paced mode — and ${why}.\n\n` +
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
export function denyOutputFor(finding: LoopToolFinding | null): { hookSpecificOutput: Record<string, string> } | null {
  if (!finding) return null
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: formatGuardMessage(finding),
    },
  }
}

/** Hook payload shape we rely on — the same subset `github-provenance-guard.ts`
 *  already reads off a live PreToolUse payload. */
interface PreToolUsePayload {
  tool_name?: string
  tool_input?: unknown
  transcript_path?: string
}

/** Deny a call we could not even inspect. Fail-closed's edge: with an unreadable
 *  payload we do not know which tool it is, so the message cannot name one. */
function denyUninspectable(detail: string): void {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `Blocked by the /loop-only tool guard (issue #814): ${detail}, so this call could not be ` +
          `checked. The guard fails CLOSED. This is a guard fault, not an authoring mistake — report ` +
          `it rather than working around it.`,
      },
    }),
  )
}

function readTranscript(path: string | undefined): Record<string, unknown>[] | null {
  if (!path) return null
  try {
    return parseTranscript(readFileSync(path, 'utf8'))
  } catch {
    return null // unreadable — `undeterminable`, which denies
  }
}

/** `--dry-run`: print the decision the hook would reach, and exit. Runs no tool
 *  and emits no control object, so a reviewer (or a future session) can exercise
 *  every branch by hand — including with an explicit `--mode`, which is the only
 *  way to reach the `loop` branch without a real `/loop` transcript. */
function dryRun(argv: string[]): void {
  const flag = (name: string): string | undefined => {
    const i = argv.indexOf(name)
    return i >= 0 ? argv[i + 1] : undefined
  }
  const tool = flag('--tool')
  if (!tool) {
    console.error('usage: --dry-run --tool <name> [--mode loop|non-loop|undeterminable] [--transcript <path>] [--input <json>]')
    process.exit(1)
  }
  const forced = flag('--mode') as SessionMode | undefined
  const mode = forced ?? detectSessionMode(readTranscript(flag('--transcript')))
  let input: unknown = {}
  const rawInput = flag('--input')
  if (rawInput) {
    try {
      input = JSON.parse(rawInput)
    } catch {
      console.error('--input must be valid JSON')
      process.exit(1)
    }
  }
  const finding = checkLoopOnlyToolCall(tool, input, mode)
  console.log(
    JSON.stringify(
      { tool, mode, decision: finding ? 'deny' : 'allow', reason: finding ? formatGuardMessage(finding) : undefined },
      null,
      2,
    ),
  )
}

/** Reads the hook JSON on stdin, resolves the session's mode from its
 *  transcript, runs the pure predicate, and writes a deny control object for any
 *  finding. Always exits 0 — the deny travels in stdout, not the exit code.
 *
 *  **The residual fail-open this cannot close** (identical to
 *  `github-provenance-guard.ts`, recorded there too): the hook is invoked as
 *  `pnpm exec tsx … || true`, so if tsx or pnpm is unavailable the command dies
 *  before this file is evaluated, producing no stdout and therefore no deny.
 *  Closing that needs a change of invocation, not of this script. */
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
  // Cheap exit for every tool this guard has nothing to say about, BEFORE
  // paying to read a transcript that can be megabytes late in a session.
  if (!LOOP_ONLY_TOOLS.some((t) => t.tool === payload.tool_name)) return

  const mode = detectSessionMode(readTranscript(payload.transcript_path))
  const output = denyOutputFor(checkLoopOnlyToolCall(payload.tool_name, payload.tool_input, mode))
  if (output) process.stdout.write(JSON.stringify(output))
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const argv = process.argv.slice(2)
  try {
    if (argv.includes('--dry-run')) dryRun(argv)
    else main()
  } catch (err) {
    // Fail closed: a crash in the guard is a reason to stop, not to wave the
    // call through — matching `github-provenance-guard.ts`.
    denyUninspectable(`the guard itself crashed (${err instanceof Error ? err.message : String(err)})`)
  }
}
