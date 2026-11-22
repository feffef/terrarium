// Guard for issue #3580: deny a `code-review` Skill call whose args name no head
// sha. `merge-pr.ts` finds the reviewed sha in the call's args
// (`review-proof.ts`) and refuses a verdict without one, so the session
// otherwise learns of it at merge and reruns the whole review. Presence only:
// a stale sha or a HEAD match is out of scope, as is the `/code-review` command.
//
// Runs unattended, so it is human-only to merge (ADR-0004). Plumbing shared via
// `hook-io.ts` (issue #1080).
//
// Usage:
//   tsx scripts/hooks/review-call-sha-guard.ts                     # hook: payload on stdin
//   tsx scripts/hooks/review-call-sha-guard.ts --dry-run --tool Skill \
//       [--input '<json>']
import {
  denyUninspectable,
  buildDenyOutput,
  printDryRunResult,
  readHookPayload,
  requireToolFlag,
  resolveDryRunInput,
  runGuard,
  type DenyOutput,
} from './hook-io.ts'
import { SHA_RE } from '../session/review-proof.ts'

const LABEL = 'Review-call sha guard'
const REF = 'issue #3580'

/** The pure predicate: `true` for a `code-review` call with no sha in its args.
 *  Reuses `SHA_RE` so this and merge-pr's scan cannot disagree. Never throws. */
export function lacksReviewSha(toolInput: unknown): boolean {
  const input = toolInput !== null && typeof toolInput === 'object' ? (toolInput as Record<string, unknown>) : {}
  const name = typeof input.skill === 'string' ? input.skill.trim().replace(/^\//, '').replace(/^[\w-]+:/, '') : ''
  if (name !== 'code-review') return false
  return !(typeof input.args === 'string' && input.args.match(SHA_RE))
}

export function formatGuardMessage(): string {
  return (
    `Blocked by the ${LABEL} (${REF}): this \`code-review\` call's args name no head sha, so \`merge-pr.ts\` ` +
    `would refuse the verdict and the review would have to rerun.\n\n` +
    `Run \`pnpm exec tsx scripts/github/verdict-line.ts --review-call\` and paste the printed args whole, ` +
    `sha included, as this call's \`args\`.`
  )
}

export function denyOutputFor(deny: boolean): DenyOutput | null {
  return deny ? buildDenyOutput(formatGuardMessage()) : null
}

function dryRun(argv: string[]): void {
  const tool = requireToolFlag(argv, 'usage: --dry-run --tool Skill [--input <json>]')
  const deny = lacksReviewSha(resolveDryRunInput(argv))
  printDryRunResult({ tool, decision: deny ? 'deny' : 'allow', reason: deny ? formatGuardMessage() : undefined })
}

/** Always exits 0 — the deny travels in stdout, not the exit code. */
export function main(): void {
  const result = readHookPayload()
  if (result.kind === 'none') return
  if (result.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  if (result.kind === 'no-tool') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')

  const output = denyOutputFor(lacksReviewSha(result.payload.tool_input))
  if (output) process.stdout.write(JSON.stringify(output))
}

runGuard(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
