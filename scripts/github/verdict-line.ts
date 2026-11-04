// Prints the step-4 verdict line (docs/agents/pr-workflow.md) so the SHA is
// pasted, not typed: `merge-pr.ts` refuses a verdict whose `Reviewed:` SHA
// isn't the PR head (#2833).
//   pnpm exec tsx scripts/github/verdict-line.ts [<pr-number>]
// With a PR number, warns on stderr when HEAD isn't the PR's head.
import { fail, root, runIfMain } from '../lib/cli.ts'
import { git } from '../lib/git.ts'
import { getJson, resolveAccess } from '../lib/github-client.ts'

export function verdictLine(sha: string): string {
  return `Reviewed: ${sha}`
}

export function headMismatchWarning(head: string, prHead: string, prNumber: number): string | null {
  if (head.toLowerCase() === prHead.toLowerCase()) return null
  return `warning: HEAD ${head} is not PR #${prNumber}'s head ${prHead}; the verdict would not cover it.`
}

function main(): void {
  const arg = process.argv[2]
  const prNumber = arg === undefined ? null : Number(arg)
  if (prNumber !== null && !Number.isInteger(prNumber)) fail('usage: verdict-line.ts [<pr-number>]')
  const head = git(['rev-parse', 'HEAD'], process.cwd()).trim()
  if (prNumber !== null) {
    const pr = getJson<{ head: { sha: string } }>(resolveAccess(root), `pulls/${prNumber}`)
    const warning = headMismatchWarning(head, pr.head.sha, prNumber)
    if (warning) console.error(warning)
  }
  console.log(verdictLine(head))
}

runIfMain(import.meta.url, main)
