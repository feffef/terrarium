// The dependabot-sweep pre-filter: one plain REST listing, so a run with
// nothing to do stops at once (#1889).
//
// Usage:  tsx .agents/skills/dependabot-sweep/scripts/list-dependabot-prs.ts
//   Prints the open Dependabot PRs as JSON:
//   [{ number, title, ecosystem, headSha, htmlUrl }]. `[]` means nothing to do.
import { listAll, resolveAccess } from '../../../../scripts/lib/github-client.ts'
import { DEPENDABOT_LOGIN } from '../../../../scripts/github/merge-pr.ts'
import { root, runIfMain } from '../../../../scripts/lib/cli.ts'

export interface RawPullRecord {
  number: number
  title: string
  html_url: string
  user: { login: string }
  head: { ref: string; sha: string }
}

export interface DependabotPr {
  number: number
  title: string
  /** Dependabot's branch segment: `npm_and_yarn` or `github_actions`. */
  ecosystem: string
  headSha: string
  htmlUrl: string
}

export function dependabotPrs(pulls: RawPullRecord[]): DependabotPr[] {
  return pulls
    .filter((p) => p.user.login === DEPENDABOT_LOGIN)
    .map((p) => ({
      number: p.number,
      title: p.title,
      ecosystem: p.head.ref.split('/')[1] ?? '',
      headSha: p.head.sha,
      htmlUrl: p.html_url,
    }))
}

runIfMain(import.meta.url, () => {
  const pulls = listAll<RawPullRecord>(resolveAccess(root), 'pulls', { state: 'open' })
  process.stdout.write(JSON.stringify(dependabotPrs(pulls)) + '\n')
})
