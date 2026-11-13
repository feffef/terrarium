// Lists every PR closed without a merge since a date, for the survey's
// closed-unmerged source.
//
// Stop rule: pages come newest-`updated_at` first and `closed_at <= updated_at`,
// so once a page's last record was updated before `--since`, every later PR
// closed before the window. A PR closed before the window but updated inside it
// is fetched and dropped by the `closed_at` filter.
//
// Usage:  tsx .agents/skills/midden-survey/scripts/closed-unmerged-prs.ts --since YYYY-MM-DD
//   Prints JSON { number, title, headRef, createdAt, closedAt }, newest-closed first.
import { fail, flagValue, root, runIfMain } from '../../../../scripts/lib/cli.ts'
import { decodeHtmlEntities, listAll, resolveAccess, type Access } from '../../../../scripts/lib/github-client.ts'

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

export function validSince(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s
}

// Deduped by number: paging an updated-sorted list can return a PR twice when it is updated mid-walk.
export function closedUnmerged(records: RawPull[], since: string): ClosedPr[] {
  const from = Date.parse(since)
  const byNumber = new Map<number, ClosedPr>()
  for (const r of records) {
    if (r.merged_at !== null || r.closed_at === null || Date.parse(r.closed_at) < from) continue
    byNumber.set(r.number, {
      number: r.number,
      title: decodeHtmlEntities(r.title),
      headRef: r.head.ref,
      createdAt: r.created_at,
      closedAt: r.closed_at,
    })
  }
  return [...byNumber.values()]
    .sort((a, b) => Date.parse(b.closedAt) - Date.parse(a.closedAt))
}

export function pastWindow(page: RawPull[], since: string): boolean {
  const last = page.at(-1)
  return last !== undefined && Date.parse(last.updated_at) < Date.parse(since)
}

function main(): void {
  const since = flagValue(process.argv.slice(2), '--since')
  if (!since || !validSince(since)) fail(USAGE)
  let access: Access
  try {
    access = resolveAccess(root)
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err))
  }
  const records = listAll<RawPull>(
    access,
    'pulls',
    { state: 'closed', sort: 'updated', direction: 'desc' },
    { until: (page) => pastWindow(page, since), hint: ' Do not use a partial list as the survey window.' },
  )
  process.stdout.write(JSON.stringify(closedUnmerged(records, since), null, 2) + '\n')
}

runIfMain(import.meta.url, main)
