// Ranges: split a full read's cursor walk into N ranges that parallel fetchers
// fetch. Pages come newest-first, so page i is read with page i-1's first_id as
// before_id, and the newest page with no cursor (#2300).
//
// Usage: pnpm exec tsx .agents/skills/inspect-session/scripts/ranges.ts <cursors file> --fetchers <N> --out <dir>
// The cursors file has one walked page per line, newest first: `<first_id> <has_more>`.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractFlag, fail, runIfMain } from '../../../../scripts/lib/cli.ts'

/** One page to fetch: the `before_id` to pass (`none` for the newest page) and the `first_id` it must return. */
export interface PageCursor {
  beforeId: string
  firstId: string
}

export function pageCursors(walk: string): PageCursor[] {
  const firstIds = walk
    .split('\n')
    .map((l) => l.trim().split(/\s+/)[0])
    .filter((id): id is string => !!id)
  return firstIds.map((firstId, i) => ({ beforeId: i ? firstIds[i - 1]! : 'none', firstId }))
}

/** Contiguous ranges as even as possible, so no fetcher holds up the rest. */
export function split<T>(items: T[], n: number): T[][] {
  const count = Math.max(1, Math.min(n, items.length))
  const out: T[][] = []
  let start = 0
  for (let k = 0; k < count; k++) {
    const size = Math.floor(items.length / count) + (k < items.length % count ? 1 : 0)
    out.push(items.slice(start, start + size))
    start += size
  }
  return out
}

runIfMain(import.meta.url, () => {
  const { value: fetchers, rest: a } = extractFlag(process.argv.slice(2), '--fetchers')
  const { value: out, rest } = extractFlag(a, '--out')
  const [cursorsFile] = rest
  if (!cursorsFile || !out || !(Number(fetchers) > 0)) fail('usage: ranges.ts <cursors file> --fetchers <N> --out <dir>')
  const pages = pageCursors(readFileSync(cursorsFile, 'utf8'))
  mkdirSync(out, { recursive: true })
  let first = 1
  split(pages, Number(fetchers)).forEach((range, k) => {
    const file = join(out, `range-${k + 1}.txt`)
    writeFileSync(file, range.map((p) => `${p.beforeId} ${p.firstId}`).join('\n') + '\n')
    console.log(`RANGE ${k + 1}: ${file} (pages ${first}–${first + range.length - 1} of ${pages.length})`)
    first += range.length
  })
})
