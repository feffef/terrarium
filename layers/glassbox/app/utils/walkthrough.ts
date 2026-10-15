import type { MinimarkNode } from '@nuxt/content'
import { glassboxSubjectOf, glassboxWalkthroughs, type GlassboxPageLink } from './subjects'

// Design 1b's stops, keyed on the headings writers already write (#1993). The
// contract writers follow is the Walkthrough entry in layers/glassbox/GLOSSARY.md.
const stopNumber = /^(\d+)\.\s+/

export interface GlassboxWalkthroughPart {
  stop?: string
  id?: string
  nodes: MinimarkNode[]
}

/** A Walkthrough body cut into parts: each stop (`## 1. Title` up to the next
 *  h2) on its own, its number moved out of the heading and its `::stop-links`
 *  drawn as chips; whatever lies between stops in plain parts. */
export function glassboxWalkthroughParts(nodes: MinimarkNode[], base: string): GlassboxWalkthroughPart[] {
  const parts: GlassboxWalkthroughPart[] = []
  for (const node of nodes) {
    if (typeof node !== 'string' && node[0] === 'h2') {
      const [, props, first, ...rest] = node
      const m = typeof first === 'string' ? first.match(stopNumber) : null
      if (m) {
        parts.push({ stop: m[1], id: String(props.id), nodes: [['h2', props, first!.slice(m[0].length), ...rest] as MinimarkNode] })
        continue
      }
      if (parts.at(-1)?.stop) parts.push({ nodes: [] })
    }
    if (!parts.length) parts.push({ nodes: [] })
    const part = parts.at(-1)!
    part.nodes.push(part.stop ? stopLinks(node, base) : node)
  }
  return parts
}

// Chips are the block's inline content, cut at each `·`.
function stopLinks(node: MinimarkNode, base: string): MinimarkNode {
  if (typeof node === 'string' || node[0] !== 'stop-links') return node
  const inline = node.slice(2).flatMap((child) => typeof child !== 'string' && child[0] === 'p' ? child.slice(2) : [child]) as MinimarkNode[]
  const chips: MinimarkNode[][] = [[]]
  for (const child of inline) {
    if (typeof child !== 'string') {
      if (child[0] === 'a' && isLesson(String(child[1].href), base)) chips.at(-1)!.push(['span', {}, 'Lesson'])
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
