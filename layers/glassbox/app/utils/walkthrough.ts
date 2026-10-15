import type { MinimarkElement, MinimarkNode } from '@nuxt/content'
import { glassboxLessonIds, glassboxLessonLabels } from './lesson'
import { glassboxSubjectOf, glassboxWalkthroughs, type GlassboxPageLink } from './subjects'

// Design 1b's stops, keyed on the headings writers already write (#1993). The
// contract writers follow is the Walkthrough entry in layers/glassbox/GLOSSARY.md.
const realCase = 'a-real-case'

/** A stop heading's number and title (`1. Title`), or undefined for any other heading. */
export function glassboxStopNumber(text: string) {
  const m = text.match(/^(\d+)\.\s+/)
  return m ? { n: m[1]!, title: text.slice(m[0].length) } : undefined
}

export interface GlassboxWalkthroughPart {
  stop?: string
  id?: string
  nodes: MinimarkNode[]
}

/** A Walkthrough body cut into parts: each stop (`## 1. Title` up to the next
 *  h2) on its own, its number moved out of the heading and its `::stop-links`
 *  drawn as chips; whatever lies between stops in plain parts, with A real case
 *  framed and Where next drawn as rows. */
export function glassboxWalkthroughParts(nodes: MinimarkNode[], base: string): GlassboxWalkthroughPart[] {
  const parts: GlassboxWalkthroughPart[] = []
  let section = ''
  let box: MinimarkElement | undefined
  for (const node of nodes) {
    const [tag, props, first, ...rest] = typeof node === 'string' ? [] : node
    if (tag === 'h2') {
      section = String(props!.id)
      box = undefined
      const stop = typeof first === 'string' ? glassboxStopNumber(first) : undefined
      if (stop) {
        parts.push({ stop: stop.n, id: section, nodes: [['h2', props!, stop.title, ...rest] as MinimarkNode] })
        continue
      }
      if (!parts.length || parts.at(-1)!.stop) parts.push({ nodes: [] })
      if (section === realCase) parts.at(-1)!.nodes.push(box = ['div', { class: 'gb-case' }])
    }
    if (!parts.length) parts.push({ nodes: [] })
    const part = parts.at(-1)!
    const isNextList = section === glassboxLessonIds.whereNext && tag === 'ul'
    ;(box ?? part.nodes).push(part.stop ? stopLinks(node, base) : isNextList ? nextRows(node, base) : node)
  }
  return parts
}

// Each row is labelled by what its link leads to.
function nextRows(node: MinimarkNode, base: string): MinimarkNode {
  if (typeof node === 'string') return node
  const [, props, ...items] = node
  return ['ul', { ...props, class: 'gb-next' }, ...(items as MinimarkNode[]).map((item) => {
    if (typeof item === 'string') return item
    const link = item.slice(2).find((child) => Array.isArray(child) && child[0] === 'a') as MinimarkElement | undefined
    const label = link && isLesson(String(link[1].href), base) ? glassboxLessonLabels.lesson : glassboxLessonLabels.walkthrough
    return [item[0], item[1], ['span', {}, label], ...item.slice(2)] as MinimarkNode
  })]
}

// Chips are the block's inline content, cut at each `·`.
function stopLinks(node: MinimarkNode, base: string): MinimarkNode {
  if (typeof node === 'string' || node[0] !== 'stop-links') return node
  const inline = (node.slice(2) as MinimarkNode[]).flatMap((child) => typeof child !== 'string' && child[0] === 'p' ? child.slice(2) as MinimarkNode[] : [child])
  const chips: MinimarkNode[][] = [[]]
  for (const child of inline) {
    if (typeof child !== 'string') {
      if (child[0] === 'a' && isLesson(String(child[1].href), base)) chips.at(-1)!.push(['span', {}, glassboxLessonLabels.lesson])
      chips.at(-1)!.push(child)
      continue
    }
    child.split('·').forEach((text, i) => {
      if (i) chips.push([])
      if (text.trim()) chips.at(-1)!.push(text)
    })
  }
  return ['ul', { class: 'gb-stop-links' }, ...chips.filter((chip) => chip.length).map((chip) => ['li', {}, ...chip] as MinimarkNode)]
}

const isLesson = (href: string, base: string) => href.startsWith(`${base}/`) && !!glassboxSubjectOf(href.slice(base.length))

const target = (href: unknown) => String(href).replace(/[?#].*$/, '').replace(/\/$/, '')
const linksTo = (nodes: MinimarkNode[], url: string): boolean => nodes.some((node) =>
  typeof node !== 'string' && ((node[0] === 'a' && target(node[1].href) === url) || linksTo(node.slice(2) as MinimarkNode[], url)))

/** The Walkthroughs whose body links the Lesson at `lessonUrl`, each once,
 *  titles and paths only (ADR-0028). */
export function glassboxWalkthroughsThrough(walkthroughs: (GlassboxPageLink & { body: { value: MinimarkNode[] } })[], lessonUrl: string): GlassboxPageLink[] {
  return glassboxWalkthroughs(walkthroughs.filter((page) => linksTo(page.body.value, lessonUrl)).map(({ path, title }) => ({ path, title })))
}
