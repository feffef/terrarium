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

/** Nuxt Content's route for a content stem (`git-github/60.attribution` → `git-github/attribution`):
 *  two-digit prefixes and `index` dropped. One home, shared with page-checks.ts. */
export function glassboxStemRoute(stem: string) {
  return stem.split('/').map((s) => s.replace(/^\d+\./, '')).join('/').replace(/(^|\/)index$/, '')
}

/** A guide page's site path from its stem. */
export function glassboxGuidePath(stem: string) {
  const route = glassboxStemRoute(stem)
  return route ? `/t/glassbox/guide/${route}` : '/t/glassbox/guide'
}

/** The newest changes across curate runs (given newest first), for the workshop's "Lately" list.
 *  A run entry that only records a page was checked and left alone ("No change") is not a change. */
export function glassboxLatelyChanges(runs: Array<{ stem: string, changes: GlassboxRunChange[] }>, limit = 5) {
  return runs
    .flatMap((run) => run.changes.flatMap((change) =>
      'page' in change && !/^no change/i.test(change.what) ? [{ stem: run.stem, page: change.page, what: change.what }] : []))
    .slice(0, limit)
}

/** The most words the workshop memory page may hold (`workshop.spec.ts`; glassbox-curate's orientation prints the count). */
export const glassboxWorkshopWordCap = 2500

/** The memory page's words, component lines (`::…`) not counted. */
export const glassboxWorkshopWords = (body: string) => body.split('\n').filter((line) => !line.startsWith('::')).join(' ').split(/\s+/).filter(Boolean).length
