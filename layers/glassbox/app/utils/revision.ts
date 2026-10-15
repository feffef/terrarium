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

// Built by hand, not with toLocaleDateString: server and browser can format a
// locale differently and break hydration (as in layers/midden/app/utils/find.ts).
const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** `2026-10-14` → `14 Oct 2026`. */
export function formatGlassboxDate(date: string) {
  const [year, month, day] = date.split('-')
  return `${Number(day)} ${months[Number(month) - 1]} ${year}`
}
