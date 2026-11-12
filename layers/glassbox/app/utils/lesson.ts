import type { MinimarkElement, MinimarkNode } from '@nuxt/content'
import { glassboxSubjectOf, glassboxWalkthroughOf } from './subjects'

// Design 1b frames a Lesson's sections without new syntax for writers (#2015):
// the frames are added here, at render, keyed on the section ids. The section
// contract writers follow is the Lesson entry in layers/glassbox/GLOSSARY.md.
export const glassboxLessonIds = {
  concept: 'the-concept',
  inTerrarium: 'in-terrarium',
  why: 'why-its-built-this-way',
  watch: 'what-to-watch-for',
  tryIt: 'try-it-in-your-project',
  whereNext: 'where-next',
} as const

export const glassboxLessonLabels = {
  concept: 'Outside the box · General',
  inside: 'Looking inside',
  fullReference: 'Full reference',
  lesson: 'Lesson',
  walkthrough: 'Walkthrough',
  journal: 'Journal',
  page: 'Page',
} as const

const ids = glassboxLessonIds
const labels = glassboxLessonLabels

/** The rows of a Lesson's hand-written Where next list. */
function nextRows(nodes: MinimarkNode[]): MinimarkNode[] {
  const at = nodes.findIndex((node) => typeof node !== 'string' && node[0] === 'h2' && node[1].id === ids.whereNext)
  const list = at < 0 ? undefined : nodes.slice(at + 1).find((node) => typeof node !== 'string' && node[0] === 'ul')
  return list ? (list as MinimarkElement).slice(2) as MinimarkNode[] : []
}

const rowLink = (row: MinimarkElement) => row.slice(2).find((child) => Array.isArray(child) && child[0] === 'a') as MinimarkElement | undefined

/** The Lesson a Where next row links, as its path in the Space, or '' for any other target. */
function rowLesson(row: MinimarkNode, base: string) {
  if (typeof row === 'string') return ''
  const link = rowLink(row)
  const path = spacePath(String(link?.[1].href ?? ''), base)
  return glassboxSubjectOf(path) ? path : ''
}

/** The Lessons a Where next list links, in the order the writer gave them. */
export function glassboxNextLessons(nodes: MinimarkNode[], base: string) {
  return nextRows(nodes).map((row) => rowLesson(row, base)).filter(Boolean)
}

/** Whether every Where next row links a Lesson the visitor has read, so the section can go. */
export function glassboxNextAllRead(nodes: MinimarkNode[], base: string, read: string[]) {
  const rows = nextRows(nodes)
  return rows.length > 0 && rows.every((row) => read.includes(rowLesson(row, base)))
}

/** The table of contents without its Where next entry once that section is gone. */
export function glassboxLessonToc<T extends { id: string }>(links: T[], nodes: MinimarkNode[], base: string, read: string[]): T[] {
  return glassboxNextAllRead(nodes, base, read) ? links.filter((link) => link.id !== ids.whereNext) : links
}

/** A Lesson body with design 1b's section frames added; other nodes unchanged.
 *  Where next drops the links in `read` (a visitor's own state) and, once all are read, its heading. */
export function glassboxLessonSections(nodes: MinimarkNode[], base: string, titles: GlassboxTitles = {}, read: string[] = []): MinimarkNode[] {
  const out: MinimarkNode[] = []
  const allRead = glassboxNextAllRead(nodes, base, read)
  let section = ''
  let box: MinimarkElement | undefined
  let cards: MinimarkElement | undefined
  for (const node of nodes) {
    const [tag, props] = typeof node === 'string' ? [] : node
    const id = String(props?.id)
    if (tag === 'h2') {
      section = id
      box = cards = undefined
      if (id === ids.inTerrarium) out.push(['div', { class: 'gb-divider' }, labels.inside])
      if (id === ids.concept) out.push(box = ['div', { class: 'gb-concept' }, ['p', { class: 'gb-kicker' }, labels.concept]])
      if (id === ids.tryIt) out.push(box = ['div', { class: 'gb-try' }])
    } else if (tag === 'h3' && (id === ids.why || id === ids.watch)) {
      if (!cards) out.push(cards = ['div', { class: 'gb-cards' }])
      cards.push(box = ['div', { class: 'gb-card' }])
    } else if (tag === 'h3' && cards) {
      box = cards = undefined
    }
    const inConcept = section === ids.concept
    const isNextList = section === ids.whereNext && tag === 'ul'
    if (allRead && (isNextList || id === ids.whereNext && tag === 'h2')) continue
    ;(box ?? out).push(inConcept ? fullReference(node) : isNextList ? glassboxNextList(node, base, titles, read) : skipLine(node))
  }
  return out
}

// "Full reference: [Docs](https://…)" closes The concept as 1b's button.
function fullReference(node: MinimarkNode): MinimarkNode {
  if (typeof node === 'string' || node[0] !== 'p') return node
  const [, , first, ...rest] = node
  if (typeof first !== 'string' || !first.startsWith(labels.fullReference)) return node
  const after = first.slice(labels.fullReference.length).replace(/^:?\s*/, '')
  return ['p', { class: 'gb-ref' }, ['span', {}, labels.fullReference], ...(after ? [after] : []), ...rest]
}

function skipLine(node: MinimarkNode): MinimarkNode {
  if (typeof node === 'string' || node[0] !== 'p') return node
  const [, props, ...children] = node
  const skips = children.some((child) => typeof child !== 'string' && child[0] === 'a' && child[1].href === `#${ids.inTerrarium}`)
  return skips ? ['p', { ...props, class: 'gb-skip' }, ...children] : node
}

/** Page titles of the current Space by path within it; they already travel in the page payload (ADR-0028). */
export type GlassboxTitles = Record<string, string>

const spacePath = (href: string, base: string) => href.startsWith(`${base}/`) ? href.slice(base.length) : ''

/** What a link leads to, for the label on its Where next row. */
export function glassboxLinkLabel(href: string, base: string) {
  const path = spacePath(href, base)
  if (glassboxSubjectOf(path)) return labels.lesson
  if (glassboxWalkthroughOf(path)) return labels.walkthrough
  return href.startsWith('/t/journal/') ? labels.journal : labels.page
}

/** A Where next list drawn as rows, each labelled by what its link leads to;
 *  a bare link `[](/…)` to a page in this Space shows that page's current title.
 *  Rows whose Lesson is in `read` are left out; the Lessons already read section shows them. */
export function glassboxNextList(node: MinimarkNode, base: string, titles: GlassboxTitles = {}, read: string[] = []): MinimarkNode {
  if (typeof node === 'string') return node
  const [, props, ...items] = node
  return ['ul', { ...props, class: 'gb-next' }, ...(items as MinimarkNode[]).filter((item) => !read.includes(rowLesson(item, base))).map((item) => {
    if (typeof item === 'string') return item
    const link = rowLink(item)
    const href = String(link?.[1].href ?? '')
    const isBare = link?.length === 2
    const title = isBare ? titles[spacePath(href, base)] : undefined
    const filled = title ? [...link!, title] : link
    return [item[0], item[1], ['span', {}, glassboxLinkLabel(href, base)], ...item.slice(2).map((child) => child === link ? filled : child)] as MinimarkNode
  })]
}
