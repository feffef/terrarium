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
  const link = (to: (typeof chain)[number] | undefined, label: (other?: string) => string): GlassboxSurroundLink | null =>
    to ? { path: to.path, title: to.title, label: label(to.subject === here.subject ? undefined : to.subject) } : null
  return {
    prev: link(chain[i - 1], (other) => (other ? `← Leaving ${here.subject} · ${other}` : `← ${here.subject}`)),
    next: link(chain[i + 1], (other) => (other ? `Leaving ${here.subject} → ${other}` : `${here.subject} →`)),
  }
}

type MinimarkNode = string | unknown[]
const holdsH2 = (node: MinimarkNode): boolean =>
  Array.isArray(node) && (node[0] === 'h2' || node.slice(2).some((child) => holdsH2(child as MinimarkNode)))
const isDiagram = (node: MinimarkNode) => Array.isArray(node) && node[0] === 'pre' && (node[1] as { language?: string }).language === 'mermaid'

/** A minimark body cut before its first section or diagram, so the table of
 *  contents sits between the lede and either (design 1b). */
export function glassboxSplitAtFirstSection<T extends MinimarkNode>(nodes: T[]): [T[], T[]] {
  const i = nodes.findIndex((node) => holdsH2(node) || isDiagram(node))
  return i < 0 ? [nodes, []] : [nodes.slice(0, i), nodes.slice(i)]
}

/** Each top-level diagram in a pane of its own, so the pane holds still while a
 *  diagram too wide to read scaled down scrolls inside it (theme.css). */
export function glassboxFrameDiagrams<T extends MinimarkNode>(nodes: T[]): T[] {
  return nodes.map((node) => (isDiagram(node) ? ['div', { class: 'gb-diagram' }, node] as T : node))
}

/** The heading being read: the last one whose top has passed `line`, or the
 *  last of all once the page is scrolled to its end. */
export function currentGlassboxHeading(headings: { id: string; top: number }[], line: number, atEnd: boolean): string | undefined {
  if (atEnd) return headings.at(-1)?.id
  return headings.findLast((heading) => heading.top <= line)?.id
}
