// Mechanical backstop for issue #1018: PR #1000's doc-only fix for issue #999
// (don't call the `Skill` tool on a Skill whose body a `<command-name>` block
// already pasted inline) never reaches a scheduled, command-only session —
// none of the recorded recurrences had procedural occasion to open the
// doc it lives in. Same failure shape as #814 (`loop-only-tool-guard.ts`),
// same fix: a `PreToolUse` guard replaces the prose.
//
// Runs unattended, so it is human-only to merge (ADR-0004, 2026-07-30). Pure
// core (below) split from the shared stdin/`--dry-run`/bootstrap plumbing
// (`guard-io.ts`, issue #1080).
//
// Usage:
//   tsx scripts/skill-inline-guard.ts                        # hook: payload on stdin
//   tsx scripts/skill-inline-guard.ts --dry-run --tool Skill \
//       [--transcript <p>] [--input '<json>']
import {
  denyUninspectable,
  buildDenyOutput,
  flagValue,
  printDryRunResult,
  readHookPayload,
  readTranscript,
  requireToolFlag,
  resolveDryRunInput,
  runIfMain,
  type DenyOutput,
} from './guard-io.ts'
import { commandSkillNames } from './session-trace.ts'

const LABEL = 'Skill-inline guard'
const REF = 'issue #1018'

export interface SkillInlineFinding {
  name: string
  /** `true` only when the transcript could not be read — see `formatGuardMessage`. */
  undeterminable: boolean
}

/** The pure, unit-testable predicate: `(toolInput, records) → deny finding | null`.
 *  `records: null` means the transcript could not be read — fails CLOSED, per
 *  the roster convention (`docs/agents/guards.md`). A call naming no skill at
 *  all matches nothing and is never a finding: there is nothing to compare.
 *  Never throws; a non-object `toolInput` simply names no skill.
 *
 *  Scope is the whole session, not one turn: an inlined body stays inlined for
 *  every later turn, and a tool_result record is a `user` record too, so
 *  "the current turn" cannot be read off the transcript. `commandSkillNames` is
 *  reused exactly as `loop-only-tool-guard.ts`'s own `skillsInvokedBy` does for
 *  the identical signal, so the two guards can't drift on what "inlined" means. */
export function checkSkillInlineCall(
  toolInput: unknown,
  records: Record<string, unknown>[] | null,
): SkillInlineFinding | null {
  const input = toolInput !== null && typeof toolInput === 'object' ? (toolInput as Record<string, unknown>) : {}
  const raw = (input.skill ?? input.command) as string | undefined
  const name = raw?.trim().replace(/^\//, '')
  if (!name) return null
  if (!records) return { name, undeterminable: true }
  const inlined = records
    .filter((r) => r.type === 'user')
    .flatMap((r) => commandSkillNames((r.message as { content?: unknown } | undefined)?.content))
  return inlined.includes(name) ? { name, undeterminable: false } : null
}

/** Written for a reader who has opened no doc — that is what every recorded
 *  recurrence was — so it states the constraint and the concrete fix rather
 *  than pointing at a file. */
export function formatGuardMessage(f: SkillInlineFinding): string {
  if (f.undeterminable) {
    return (
      `Blocked by the ${LABEL} (${REF}): this session's transcript could not be read, so whether ` +
      `"${f.name}" was already delivered inline could not be checked. The guard fails CLOSED. If this is an ` +
      `ordinary interactive Skill call, that is a guard fault — report it on ${REF} rather than working around it.`
    )
  }
  return (
    `Blocked by the ${LABEL} (${REF}): this session's \`<command-name>\` block already pasted "${f.name}"'s ` +
    `full body inline, so calling \`Skill\` on it again is redundant at best, and a hard error at worst for a ` +
    `\`disable-model-invocation\` Skill.\n\n` +
    `Follow the already-inlined body instead.`
  )
}

/** `null` when nothing should be blocked, so an ordinary Skill call proceeds
 *  untouched. */
export function denyOutputFor(finding: SkillInlineFinding | null): DenyOutput | null {
  return finding ? buildDenyOutput(formatGuardMessage(finding)) : null
}

/** `--dry-run`: print the decision the hook would reach, and exit. */
function dryRun(argv: string[]): void {
  const tool = requireToolFlag(argv, 'usage: --dry-run --tool Skill [--transcript <path>] [--input <json>]')
  const records = readTranscript(flagValue(argv, '--transcript'))
  const input = resolveDryRunInput(argv)
  const finding = checkSkillInlineCall(input, records)
  printDryRunResult({ tool, decision: finding ? 'deny' : 'allow', reason: finding ? formatGuardMessage(finding) : undefined })
}

/** Always exits 0 — the deny travels in stdout, not the exit code. Same
 *  residual fail-open as every guard on this plumbing: the hook is invoked
 *  `|| true`, so a missing `tsx`/`pnpm` dies before this file runs at all. */
export function main(): void {
  const result = readHookPayload()
  if (result.kind === 'none') return
  if (result.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  if (result.kind === 'no-tool') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')

  const { payload } = result
  const output = denyOutputFor(checkSkillInlineCall(payload.tool_input, readTranscript(payload.transcript_path)))
  if (output) process.stdout.write(JSON.stringify(output))
}

runIfMain(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
