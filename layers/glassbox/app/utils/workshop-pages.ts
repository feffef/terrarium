import { documentUrl, resolveSpaceRoute } from '#shared/routing'

/** Titles and routes of one of Glass Box's reading Spaces, for the workshop page
 *  to link to. A cross-Space read that ADR-0006 does not list as an exception;
 *  it goes through the resolver, as the Journal's Friction Ledger does. */
export async function queryGlassboxPages(space: 'guide' | 'drafts') {
  const resolved = resolveSpaceRoute('glassbox', space, undefined)
  if (!resolved) return []
  const rows = await queryCollection(resolved.pagesKey).select('stem', 'path', 'title').all()
  return rows.map(({ stem, path, title }) => ({ stem, path: documentUrl('glassbox', space, path), title }))
}
