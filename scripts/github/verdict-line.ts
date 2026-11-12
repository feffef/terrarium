// Prints the step-4 verdict line (docs/agents/pr-workflow.md) so the SHA is
// pasted, not typed: `merge-pr.ts` refuses a verdict whose `Reviewed:` SHA
// isn't the PR head (#2833).
//   pnpm exec tsx scripts/github/verdict-line.ts [<pr-number>] [--sha <sha>]
// --sha replaces HEAD (no checkout needed); a short one expands to the PR head.
// With a PR number, warns on stderr when the SHA isn't the PR's head.
import { extractFlag, fail, root, runIfMain } from '../lib/cli.ts'
import { git } from '../lib/git.ts'
import { getJson, resolveAccess } from '../lib/github-client.ts'

export function verdictLine(sha: string): string {
  return `Reviewed: ${sha}`
}

export function headMismatchWarning(head: string, prHead: string, prNumber: number): string | null {
  if (head.toLowerCase() === prHead.toLowerCase()) return null
  return `warning: HEAD ${head} is not PR #${prNumber}'s head ${prHead}; the verdict would not cover it.`
}

export function isHexSha(s: string): boolean {
  return /^[0-9a-f]{7,40}$/i.test(s)
}

/** A prefix of the PR head expands to the full head; anything else is kept and warned about. */
export function resolveSha(sha: string, prHead: string | null, prNumber: number): { sha: string; warning: string | null } {
  if (prHead === null) return { sha, warning: null }
  if (prHead.toLowerCase().startsWith(sha.toLowerCase())) return { sha: prHead, warning: null }
  return { sha, warning: headMismatchWarning(sha, prHead, prNumber) }
}

function main(): void {
  const { value: shaFlag, rest } = extractFlag(process.argv.slice(2), '--sha')
  const usage = 'usage: verdict-line.ts [<pr-number>] [--sha <sha>]'
  const arg = rest[0]
  const prNumber = arg === undefined ? null : Number(arg)
  if (prNumber !== null && !Number.isInteger(prNumber)) fail(usage)
  if (process.argv.includes('--sha') && (shaFlag === undefined || !isHexSha(shaFlag))) fail(`--sha needs 7 to 40 hex digits. ${usage}`)
  const given = shaFlag ?? git(['rev-parse', 'HEAD'], process.cwd()).trim()
  let sha = given
  if (prNumber !== null) {
    const pr = getJson<{ head: { sha: string } }>(resolveAccess(root), `pulls/${prNumber}`)
    const r = resolveSha(given, pr.head.sha, prNumber)
    sha = r.sha
    if (r.warning) console.error(r.warning)
  }
  console.log(verdictLine(sha))
}

runIfMain(import.meta.url, main)
