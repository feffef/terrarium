// Prints the step-4 verdict line (docs/agents/pr-workflow.md) so the SHA is
// pasted, not typed: `merge-pr.ts` refuses a verdict whose `Reviewed:` SHA
// isn't the PR head (#2833).
//   pnpm exec tsx scripts/github/verdict-line.ts [<pr-number>] [--sha <sha>] [--own-read | --review-call]
// --own-read prints `Own-read: <sha>` for a simple diff you read yourself, not
// a `Reviewed:` line, which claims a code-review run (#3395). --review-call
// prints the code-review call whose args carry the sha merge-pr.ts looks for
// (#3483).
// --sha replaces HEAD (no checkout needed); a short one expands to the PR head.
// With a PR number, warns on stderr when the SHA isn't the PR's head.
import { extractFlag, extractSwitch, fail, root, runIfMain } from '../lib/cli.ts'
import { git } from '../lib/git.ts'
import { getJson, resolveAccess } from '../lib/github-client.ts'

export function verdictLine(sha: string, ownRead = false): string {
  return `${ownRead ? 'Own-read' : 'Reviewed'}: ${sha}`
}

/** The args that make a `code-review` call count as a review of `sha`:
 *  `merge-pr.ts` finds the sha in this session's transcript (#3483). */
export const reviewCallArgs = (sha: string): string => `origin/main (reviewing head ${sha})`

/** The review call to paste, so the sha is not typed. */
export const reviewCall = (sha: string): string => `Skill code-review, args: ${reviewCallArgs(sha)}`

/** `sha` may be an abbreviation: a case-insensitive prefix of the PR head matches. */
export function headMismatchWarning(sha: string, prHead: string, prNumber: number): string | null {
  if (prHead.toLowerCase().startsWith(sha.toLowerCase())) return null
  return `warning: ${sha} is not PR #${prNumber}'s head ${prHead}; the verdict would not cover it.`
}

export function isHexSha(s: string): boolean {
  return /^[0-9a-f]{7,40}$/i.test(s)
}

function main(): void {
  const { value: shaFlag, rest: afterSha } = extractFlag(process.argv.slice(2), '--sha')
  const { on: call, rest: afterCall } = extractSwitch(afterSha, '--review-call')
  const { on: ownRead, rest } = extractSwitch(afterCall, '--own-read')
  const usage = 'usage: verdict-line.ts [<pr-number>] [--sha <sha>] [--own-read | --review-call]'
  const arg = rest[0]
  const prNumber = arg === undefined ? null : Number(arg)
  if (prNumber !== null && !Number.isInteger(prNumber)) fail(usage)
  // extractFlag yields undefined for a trailing `--sha`; don't fall back to HEAD silently.
  if (process.argv.includes('--sha') && (shaFlag === undefined || !isHexSha(shaFlag))) fail(`--sha needs 7 to 40 hex digits. ${usage}`)
  let sha = shaFlag ?? git(['rev-parse', 'HEAD'], process.cwd()).trim()
  if (prNumber !== null) {
    const prHead = getJson<{ head: { sha: string } }>(resolveAccess(root), `pulls/${prNumber}`).head.sha
    const warning = headMismatchWarning(sha, prHead, prNumber)
    if (warning) console.error(warning)
    else sha = prHead
  }
  console.log(call ? reviewCall(sha) : verdictLine(sha, ownRead))
}

runIfMain(import.meta.url, main)
