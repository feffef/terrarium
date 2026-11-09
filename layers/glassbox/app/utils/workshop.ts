/** `2026-11-06T1530` (a run entry's filename) → `2026-11-06 15:30 UTC`. One home
 *  for the date: the entry's shape has no field for it. */
export function glassboxRunStart(stem: string) {
  const [date, time = ''] = stem.split('T')
  return `${date} ${time.slice(0, 2)}:${time.slice(2)} UTC`
}

export type GlassboxRunChange =
  | { raw: string }
  | { page: string, what: string, why: string }

/** A run entry's `changes` string, "page | what changed | why", split for display.
 *  A string that does not split into three parts shows as written. */
export function glassboxRunChange(entry: string): GlassboxRunChange {
  const [page, what, ...why] = entry.split(' | ')
  if (!page || !what || !why.length) return { raw: entry }
  return { page, what, why: why.join(' | ') }
}

/** glassbox-update's checks, oldest first, ties by page. */
export function glassboxCheckRows(checks: Array<{ page: string, checked: string }>) {
  return [...checks].sort((a, b) => a.checked.localeCompare(b.checked) || a.page.localeCompare(b.page))
}

/** A guide page's site path from its stem (`git-github/60.attribution`): Nuxt Content drops the
 *  two-digit prefixes and `index`, as `contentRoute` in page-checks.ts does for files. */
export function glassboxGuidePath(stem: string) {
  const route = stem.split('/').map((s) => s.replace(/^\d+\./, '')).join('/').replace(/(^|\/)index$/, '')
  return route ? `/t/glassbox/guide/${route}` : '/t/glassbox/guide'
}
