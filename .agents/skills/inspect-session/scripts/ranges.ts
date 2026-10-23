// Ranges: split a full read's cursor walk so parallel fetchers can share it (#2300).
//
// Usage: pnpm exec tsx .agents/skills/inspect-session/scripts/ranges.ts <cursors file> --fetchers <N> --out <dir>
// The cursors file has one walked page's first_id per line, newest first.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractFlag, fail, runIfMain } from '../../../../scripts/lib/cli.ts'

/** One page to fetch: the `before_id` to pass (`none` for the newest page) and the `first_id` it must return. */
export interface PageCursor {
  beforeId: string
  firstId: string
}

export function pageCursors(walk: string): PageCursor[] {
  // A wrong page the walker kept would ask for a cursor no call can return.
  const firstIds = [...new Set(walk.split('\n').map((l) => l.trim().split(/\s+/)[0]).filter((id): id is string => !!id))]
  return firstIds.map((firstId, i) => ({ beforeId: i ? firstIds[i - 1]! : 'none', firstId }))
}

/** Contiguous ranges as even as possible, so no fetcher holds up the rest. */
export function splitEvenly<T>(items: T[], n: number): T[][] {
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
  const { value: fetchers, rest: args } = extractFlag(process.argv.slice(2), '--fetchers')
  const { value: out, rest } = extractFlag(args, '--out')
  const [cursorsFile] = rest
  const n = Number(fetchers)
  if (!cursorsFile || !out || !(n > 0)) fail('usage: ranges.ts <cursors file> --fetchers <N> --out <dir>')
  const pages = pageCursors(readFileSync(cursorsFile, 'utf8'))
  if (!pages.length) fail(`${cursorsFile} holds no cursors`)
  mkdirSync(out, { recursive: true })
  let first = 1
  splitEvenly(pages, n).forEach((range, k) => {
    const file = join(out, `range-${k + 1}.txt`)
    writeFileSync(file, range.map((p) => `${p.beforeId} ${p.firstId}`).join('\n') + '\n')
    console.log(`RANGE ${k + 1}: ${file} (pages ${first}–${first + range.length - 1} of ${pages.length})`)
    first += range.length
  })
})
