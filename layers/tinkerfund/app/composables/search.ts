import type { TinkerfundHit } from '../utils/search'

/**
 * Searches this Space's Campaigns by title, description and Inventor name
 * (story #1382). The keys come from the route, so a search never leaves its
 * Space; the query runs in the browser once hydrated (issue #1370).
 */
export function useTinkerfundSearch() {
  const { pagesKey, collections } = useTinkerfundSpace()
  return async (raw: string, limit?: number): Promise<TinkerfundHit[]> => {
    const term = tinkerfundSearchTerm(raw)
    if (!term) return []
    const like = `%${term}%`
    const named = await queryCollection(collections.inventors).where('name', 'LIKE', like).select('stem', 'name').all()
    const inventors = named.filter(({ name }) => startsAWord(name, term))
    const hits = await queryCollection(pagesKey)
      .where('campaign', 'IS NOT NULL')
      .orWhere((q) => {
        q.where('title', 'LIKE', like).where('description', 'LIKE', like)
        // Frontmatter is stored as JSON text, and a stem is a validated slug.
        for (const { stem } of inventors) q.where('campaign', 'LIKE', `%"inventor":"${stem}"%`)
        return q
      })
      .select('path', 'title', 'description', 'campaign')
      .all()
    const byInventor = new Set(inventors.map(({ stem }) => stem))
    const matching = hits.filter((h) => startsAWord(h.title, term) || startsAWord(h.description, term) || byInventor.has(h.campaign?.inventor))
    return rankTinkerfundHits(matching, term).slice(0, limit)
  }
}
