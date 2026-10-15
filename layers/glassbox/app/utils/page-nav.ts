import { glassboxDirectory, type GlassboxPageLink } from './subjects'

export interface GlassboxSurroundLink extends GlassboxPageLink {
  label: string
}

/** The Lessons before and after `path`, in Subject-map then file order, or null
 *  off the chain (Walkthroughs, the landing page). Issue #1990. */
export function glassboxSurround(pages: GlassboxPageLink[], path: string) {
  const chain = glassboxDirectory(pages).flatMap((subject) => subject.lessons.map((lesson) => ({ ...lesson, subject: subject.name })))
  const i = chain.findIndex((lesson) => lesson.path === path)
  if (i < 0) return null
  const here = chain[i]!
  const link = (to: (typeof chain)[number] | undefined, label: string): GlassboxSurroundLink | null =>
    to ? { path: to.path, title: to.title, label: to.subject === here.subject ? label : `Leaving ${here.subject} → ${to.subject}` } : null
  return { prev: link(chain[i - 1], `← ${here.subject}`), next: link(chain[i + 1], `${here.subject} →`) }
}

type MinimarkNode = string | unknown[]
const holdsH2 = (node: MinimarkNode): boolean =>
  Array.isArray(node) && (node[0] === 'h2' || node.slice(2).some((child) => holdsH2(child as MinimarkNode)))

/** A minimark body cut before its first section, so the table of contents can
 *  sit between the lede and the first h2 (design 1b). */
export function glassboxSplitAtFirstSection<T extends MinimarkNode>(nodes: T[]): [T[], T[]] {
  const i = nodes.findIndex(holdsH2)
  return i < 0 ? [nodes, []] : [nodes.slice(0, i), nodes.slice(i)]
}

/** "14 Oct 2026" from a `revisionDate`. */
export function formatGlassboxDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

/** The heading being read: the last one whose top has passed `line`, or the
 *  last of all once the page is scrolled to its end. */
export function currentGlassboxHeading(headings: { id: string; top: number }[], line: number, atEnd: boolean): string | undefined {
  if (atEnd) return headings.at(-1)?.id
  return headings.findLast((heading) => heading.top <= line)?.id
}
