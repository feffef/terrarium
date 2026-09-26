// Search (story #1382): a `LIKE` over the current Space's Campaigns, run by
// the browser like the Commons' Search (issue #1370).

/** The query builder has no `ESCAPE` clause, so `%` and `_` go; Nuxt Content
 *  refuses any query holding `--` or `/*`, even inside a string. */
export function tinkerfundSearchTerm(raw: string): string {
  return raw.replace(/[%_*]/g, '').replace(/-+/g, '-').replace(/\s+/g, ' ').trim()
}

export interface TinkerfundHit {
  path: string
  title: string
  description?: string
}

function rank(title: string, term: string): number {
  const t = title.toLowerCase()
  if (t.startsWith(term)) return 0
  if (t.split(/[\s-]+/).some((word) => word.startsWith(term))) return 1
  return t.includes(term) ? 2 : 3
}

/** Title matches first, best first; the rest matched on description or
 *  Inventor. Ties go alphabetically. */
export function rankTinkerfundHits<T extends TinkerfundHit>(hits: T[], term: string): T[] {
  const needle = term.toLowerCase()
  return hits
    .map((hit) => ({ hit, rank: rank(hit.title, needle) }))
    .sort((a, b) => a.rank - b.rank || a.hit.title.localeCompare(b.hit.title))
    .map(({ hit }) => hit)
}
