// Mechanical backstop for issue #1860 (why prose did not hold):
// `mcp__github__search_issues` and `search_pull_requests` ignore
// `minimal_output` and return full bodies, labels and reactions unless `fields`
// leaves them out. The deny message is the rule's home.
//
// Any non-empty `fields` passes, `body` included: naming it is an explicit
// opt-in. Fails closed on an unparseable payload (docs/agents/guards.md).
//
// Usage:
//   sh scripts/hooks/guard-wrap.sh github-search-fields-guard -- pnpm exec tsx scripts/hooks/github-search-fields-guard.ts   # the installed hook entry
//   tsx scripts/hooks/github-search-fields-guard.ts            # hook: payload on stdin
//   tsx scripts/hooks/github-search-fields-guard.ts --dry-run --tool mcp__github__search_issues --input '<json>'
import {
  buildDenyOutput,
  denyUninspectable,
  printDryRunResult,
  prop,
  readHookPayload,
  requireToolFlag,
  resolveDryRunInput,
  runIfMain,
  type DenyOutput,
} from './hook-io.ts'

const LABEL = 'GitHub search fields guard'
const REF = 'issue #1860'

export const SEARCH_FIELDS_TOOLS: readonly string[] = [
  'mcp__github__search_issues',
  'mcp__github__search_pull_requests',
]

/** True when the call must be denied: a registered tool with `fields` missing,
 *  not an array, or empty. Never throws. */
export function checkSearchFields(toolName: string, toolInput: unknown): boolean {
  if (!SEARCH_FIELDS_TOOLS.includes(toolName)) return false
  const fields = prop(toolInput, 'fields')
  return !Array.isArray(fields) || fields.length === 0
}

export function formatGuardMessage(tool: string): string {
  return (
    `Blocked by the ${LABEL} (${REF}): \`${tool}\` was called without \`fields\` as a non-empty ` +
    `array. It ignores \`minimal_output\` and returns every result's full body, labels and reactions, which ` +
    `floods your context.\n\n` +
    `Do instead: pass \`fields\` as a non-empty array with only what you need, e.g. \`fields: ["number", "title", "state"]\`, ` +
    `leaving out \`body\`, \`labels\` and \`reactions\`. List \`body\` only when you need it.\n\n` +
    `See docs/agents/github-integration.md ("Overflow and precision traps"). If this guard is wrong, say so on ` +
    `${REF} rather than routing around it.`
  )
}

/** `null` when nothing should be blocked, so the call proceeds untouched. */
export function denyOutputFor(tool: string, toolInput: unknown): DenyOutput | null {
  return checkSearchFields(tool, toolInput) ? buildDenyOutput(formatGuardMessage(tool)) : null
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
  const deny = checkSearchFields(tool, input)
  printDryRunResult({ tool, decision: deny ? 'deny' : 'allow', reason: deny ? formatGuardMessage(tool) : undefined })
}

runIfMain(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
