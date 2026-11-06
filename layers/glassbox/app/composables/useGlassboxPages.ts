import { documentUrl, resolveSpaceRoute } from '#shared/routing'

/** Titles and routes of one of Glass Box's reading Spaces, for the workshop page
 *  to link to. Same Tenant, so it goes through the one resolver (ADR-0006). */
export async function useGlassboxPages(space: 'guide' | 'drafts') {
  const resolved = resolveSpaceRoute('glassbox', space, undefined)
  if (!resolved) return []
  const rows = await queryCollection(resolved.pagesKey).select('stem', 'path', 'title').all()
  return rows.map(({ stem, path, title }) => ({ stem, path: documentUrl('glassbox', space, path), title }))
}
