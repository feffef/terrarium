// Lists every PR closed without a merge since a date, for the survey's
// closed-unmerged source. Pages by number through `listAll` (never `gh api
// --paginate`, which the agent proxy 403s) and throws on a partial read.
//
// Stop rule: pages come newest-`updated_at` first and `closed_at <= updated_at`,
// so once a page's last record was updated before `--since`, every later PR
// closed before the window. A PR closed before the window but updated inside it
// is fetched and dropped by the `closed_at` filter.
//
// Usage:  tsx .agents/skills/midden-survey/scripts/closed-unmerged-prs.ts --since YYYY-MM-DD
//   Prints JSON { number, title, headRef, createdAt, closedAt }, newest-closed first.
import { fail, flagValue, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { decodeHtmlEntities, listAll, resolveAccess } from '../../../../scripts/lib/github-client.ts'

const USAGE = 'usage: closed-unmerged-prs.ts --since YYYY-MM-DD'

export interface RawPull {
  number: number
  title: string
  head: { ref: string }
  created_at: string
  closed_at: string | null
  updated_at: string
  merged_at: string | null
}

export interface ClosedPr {
  number: number
  title: string
  headRef: string
  createdAt: string
  closedAt: string
}

export function closedUnmerged(records: RawPull[], since: string): ClosedPr[] {
  const from = Date.parse(since)
  return records
    .filter((r) => r.merged_at === null && r.closed_at !== null && Date.parse(r.closed_at) >= from)
    .map((r) => ({
      number: r.number,
      title: decodeHtmlEntities(r.title),
      headRef: r.head.ref,
      createdAt: r.created_at,
      closedAt: r.closed_at as string,
    }))
    .sort((a, b) => Date.parse(b.closedAt) - Date.parse(a.closedAt))
}

export function pastWindow(page: RawPull[], since: string): boolean {
  const last = page.at(-1)
  return last !== undefined && Date.parse(last.updated_at) < Date.parse(since)
}

function main(): void {
  const since = flagValue(process.argv.slice(2), '--since')
  if (!since || !/^\d{4}-\d{2}-\d{2}$/.test(since) || Number.isNaN(Date.parse(since))) fail(USAGE)
  // resolveAccess throws NO_ACCESS_MESSAGE when neither gh nor a token works.
  const access = resolveAccess(root)
  const records = listAll<RawPull>(
    access,
    'pulls',
    { state: 'closed', sort: 'updated', direction: 'desc' },
    { until: (page) => pastWindow(page, since), hint: ' Do not use a partial list as the survey window.' },
  )
  process.stdout.write(JSON.stringify(closedUnmerged(records, since), null, 2) + '\n')
}

runIfMain(import.meta.url, main)
