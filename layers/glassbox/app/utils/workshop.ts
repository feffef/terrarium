/** `2026-11-06T1530` (a run entry's filename) → `2026-11-06 15:30 UTC`. One home
 *  for the date: the entry's shape has no field for it. */
export function glassboxRunStart(stem: string) {
  const [date, time = ''] = stem.split('T')
  return `${date} ${time.slice(0, 2)}:${time.slice(2)} UTC`
}

interface GlassboxPageTarget {
  path: string
  title: string
}

export type GlassboxRunChange =
  | { raw: string }
  | { page: string, to?: string, what: string, why: string }

/** A run entry's `changes` string, "page | what changed | why", split for display.
 *  The page links when `pages` (by stem) knows it; a string that does not split
 *  into three parts shows as written. */
export function glassboxRunChange(entry: string, pages: Record<string, GlassboxPageTarget>): GlassboxRunChange {
  const [page, what, ...why] = entry.split(' | ')
  if (!page || !what || !why.length) return { raw: entry }
  const to = pages[page]?.path
  return { page, ...(to && { to }), what, why: why.join(' | ') }
}

/** The pages glassbox-update checks, in its queue order: never checked first,
 *  then oldest check first, ties by path. A check for a page that is gone is dropped. */
export function glassboxCheckRows(
  pages: Array<GlassboxPageTarget & { stem: string }>,
  checks: Array<{ page: string, checked: string }>,
) {
  const checked = new Map(checks.map((check) => [check.page, check.checked]))
  return pages
    .map((page) => ({ ...page, checked: checked.get(page.stem) }))
    .sort((a, b) => (a.checked ?? '').localeCompare(b.checked ?? '') || a.path.localeCompare(b.path))
}
