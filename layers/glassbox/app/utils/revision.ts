import type { ComputedRef, InjectionKey } from 'vue'
import type { LineRange } from '../../page-refs.ts'

interface GlassboxRevision {
  revision: string
  revisionDate: string
}

/** The page's `revision`, which every `:file` and `::excerpt` is pinned to. */
export const glassboxRevisionKey: InjectionKey<ComputedRef<GlassboxRevision | undefined>> = Symbol('glassbox-revision')

export function glassboxFileUrl(path: string, revision: string, lines?: LineRange) {
  const anchor = lines ? `#L${lines.start}-L${lines.end}` : ''
  return `${REPO_URL}/${path.endsWith('/') ? 'tree' : 'blob'}/${revision}/${path}${anchor}`
}

export function formatGlassboxDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}
