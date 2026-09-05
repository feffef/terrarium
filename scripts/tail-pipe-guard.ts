// Mechanical backstop for issue #873: two prose fixes (#384, #812) for "never
// pipe a backgrounded/long-running command through a trailing tail/head" did
// not hold — the failure recurred twice more after both landed. Locked design:
// `docs/research/rulebook-migration-table.md` row CM-38. Scoped to the
// backgrounded-or-known-long-runner case only, so `ls | head` stays untouched.
//
// Runs unattended, so it is human-only to merge (ADR-0004, 2026-07-30). Pure
// core split from the shared stdin/`--dry-run`/bootstrap plumbing
// (`guard-io.ts`, issue #1080).
//
// Usage:
//   sh scripts/tail-pipe-guard.sh                     # the installed hook entry
//   tsx scripts/tail-pipe-guard.ts                     # payload on stdin
//   tsx scripts/tail-pipe-guard.ts --dry-run --tool Bash --input '<json>'
import { buildDenyOutput, denyUninspectable, printDryRunResult, readHookPayload, requireToolFlag, resolveDryRunInput, runIfMain } from './guard-io.ts'

const LABEL = 'tail-pipe guard'
const REF = 'issue #873'

const TRAILING_PIPE = /\|\s*(?:tail|head|echo)\b[^|]*$/
const LONG_RUNNER = /\bpnpm\s+(?:gate\b|test\b|build\b|exec\s+(?:vitest|playwright)\b)/

/** `null` unless the command pipes into a trailing `tail`/`head`/`echo` AND
 *  either backgrounds or names a known long-runner. Never throws. */
export function checkTailPipe(toolName: string, toolInput: unknown): 'backgrounded' | 'long-runner' | null {
  if (toolName !== 'Bash') return null
  const input = toolInput !== null && typeof toolInput === 'object' ? (toolInput as Record<string, unknown>) : {}
  const command = input.command
  if (typeof command !== 'string' || !TRAILING_PIPE.test(command)) return null
  if (input.run_in_background === true) return 'backgrounded'
  return LONG_RUNNER.test(command) ? 'long-runner' : null
}

export function formatGuardMessage(): string {
  return (
    `Blocked by the ${LABEL} (${REF}): piping this command into a trailing \`tail\`/\`head\`/\`echo\` loses its ` +
    `real exit status and can truncate its output. Redirect the primary command to a file instead ` +
    `(\`cmd > log 2>&1\`), check \`$?\` directly, then read the file.`
  )
}

function dryRun(argv: string[]): void {
  const tool = requireToolFlag(argv, 'usage: --dry-run --tool Bash [--input <json>]')
  const finding = checkTailPipe(tool, resolveDryRunInput(argv))
  printDryRunResult({ tool, decision: finding ? 'deny' : 'allow', kind: finding ?? undefined, reason: finding ? formatGuardMessage() : undefined })
}

export function main(): void {
  const result = readHookPayload()
  if (result.kind === 'none') return
  if (result.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  if (result.kind === 'no-tool') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')

  if (checkTailPipe(result.payload.tool_name, result.payload.tool_input)) {
    process.stdout.write(JSON.stringify(buildDenyOutput(formatGuardMessage())))
  }
}

runIfMain(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
