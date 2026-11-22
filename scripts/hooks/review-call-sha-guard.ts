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
} from './hook-io.ts'
import { reviewCallShas } from '../session/review-proof.ts'

const LABEL = 'Review-call sha guard'
const REF = 'issue #3580'

export const GUARD_MESSAGE =
  `Blocked by the ${LABEL} (${REF}): this \`code-review\` call's args name no head sha, so \`merge-pr.ts\` ` +
  `would refuse the verdict and the review would have to rerun.\n\n` +
  `Run \`pnpm exec tsx scripts/github/verdict-line.ts --review-call\` and paste the printed args whole, ` +
  `sha included, as this call's \`args\`.`

/** The pure predicate: `true` for a `code-review` call with no sha in its args,
 *  judged by merge-pr's own scan (`reviewCallShas`). Never throws. */
export function lacksReviewSha(toolInput: unknown): boolean {
  const input = toolInput !== null && typeof toolInput === 'object' ? (toolInput as Record<string, unknown>) : {}
  return reviewCallShas(input)?.length === 0
}

function dryRun(argv: string[]): void {
  const tool = requireToolFlag(argv, 'usage: --dry-run --tool Skill [--input <json>]')
  const deny = lacksReviewSha(resolveDryRunInput(argv))
  printDryRunResult({ tool, decision: deny ? 'deny' : 'allow', reason: deny ? GUARD_MESSAGE : undefined })
}

/** Always exits 0 — the deny travels in stdout, not the exit code. */
export function main(): void {
  const result = readHookPayload()
  if (result.kind === 'none') return
  if (result.kind === 'invalid') return denyUninspectable(LABEL, REF, 'the hook payload was not valid JSON')
  if (result.kind === 'no-tool') return denyUninspectable(LABEL, REF, 'the hook payload named no tool')

  if (lacksReviewSha(result.payload.tool_input)) process.stdout.write(JSON.stringify(buildDenyOutput(GUARD_MESSAGE)))
}

runGuard(import.meta.url, { main, dryRun, label: LABEL, ref: REF })
