// Curator prose cites issues and pull requests as `#N`; link them at render
// time so authored Sites and Artifacts stay untouched (issue #2719). GitHub
// redirects an issue URL to the pull request of the same number.
import { REPO_URL } from '../../../../app/utils/repo'

export type MiddenIssueRefPart = string | { ref: string; href: string }

export function middenIssueRefParts(text: string): MiddenIssueRefPart[] {
  return text
    .split(/(?<![\w/&#])#(\d+)(?!\w)/)
    .map((s, i) => (i % 2 ? { ref: `#${s}`, href: `${REPO_URL}/issues/${s}` } : s))
    .filter((p) => p !== '')
}
