// Mechanical backstop for issue #3190: a `create_session` call without
// `source_url` starts a session with no repository checked out, so it has no
// repo Skills or files and can't run a Skill (a Glass Box curate hand-over hit
// this; the create_session cause is inferred, not tested). The deny message is
// the rule's home.
//
// Blocks a missing, non-string or blank `source_url`. Fails closed on an
// unparseable payload (docs/agents/guards.md).
//
// Usage:
//   tsx scripts/hooks/create-session-repo-guard.ts            # hook: payload on stdin
//   tsx scripts/hooks/create-session-repo-guard.ts --dry-run --tool mcp__claude-code-remote__create_session --input '<json>'
import {
  buildDenyOutput,
  denyUninspectable,
  printDryRunResult,
  prop,
  readHookPayload,
  requireToolFlag,
  resolveDryRunInput,
  runGuard,
  type DenyOutput,
} from './hook-io.ts'

const LABEL = 'create_session repo guard'
const REF = 'issue #3190'
const CREATE_SESSION_TOOL = 'mcp__claude-code-remote__create_session'

/** True when the call must be denied: `create_session` with no usable `source_url`. Never throws. */
export function checkCreateSessionRepo(toolName: string, toolInput: unknown): boolean {
  if (toolName !== CREATE_SESSION_TOOL) return false
  const url = prop(toolInput, 'source_url')
  return typeof url !== 'string' || url.trim() === ''
}

export function formatGuardMessage(tool: string): string {
  return (
    `Blocked by the ${LABEL} (${REF}): \`${tool}\` was called without \`source_url\`. A session created ` +
    `without it has no repository checked out, so no repo Skills or files.\n\n` +
    `Do instead: pass \`source_url\` (a git repository URL), e.g. this repository's. If this guard is wrong, ` +
    `say so on ${REF} rather than routing around it.`
  )
}

/** `null` when nothing should be blocked, so the call proceeds untouched. */
export function denyOutputFor(tool: string, toolInput: unknown): DenyOutput | null {
  return checkCreateSessionRepo(tool, toolInput) ? buildDenyOutput(formatGuardMessage(tool)) : null
}

/** Always exits 0: the deny travels in stdout, not the exit code. */
export function main(): void {
  const result = readHookPayload()
  if (result.kind === 'none') return
  if (result.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  if (result.kind === 'no-tool') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')
  const output = denyOutputFor(result.payload.tool_name, result.payload.tool_input)
  if (output) process.stdout.write(JSON.stringify(output))
}

function dryRun(argv: string[]): void {
  const tool = requireToolFlag(argv, 'usage: --dry-run --tool <name> [--input <json> | --input-file <path>]')
  const input = resolveDryRunInput(argv)
  const deny = checkCreateSessionRepo(tool, input)
  printDryRunResult({ tool, decision: deny ? 'deny' : 'allow', reason: deny ? formatGuardMessage(tool) : undefined })
}

runGuard(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
