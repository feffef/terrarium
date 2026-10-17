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

/** The nodes under a Lesson's "Try it in your project" heading, up to the next h2; none if it has no such section. */
export function glassboxTryIt(nodes: MinimarkNode[]): MinimarkNode[] {
  const isH2 = (node: MinimarkNode) => typeof node !== 'string' && node[0] === 'h2'
  const start = nodes.findIndex((node) => isH2(node) && (node as MinimarkElement)[1].id === ids.tryIt)
  if (start < 0) return []
  const rest = nodes.slice(start + 1)
  const end = rest.findIndex(isH2)
  return end < 0 ? rest : rest.slice(0, end)
}

/** A Lesson body with design 1b's section frames added; other nodes unchanged. */
export function glassboxLessonSections(nodes: MinimarkNode[], base: string): MinimarkNode[] {
  const out: MinimarkNode[] = []
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
    ;(box ?? out).push(inConcept ? fullReference(node) : isNextList ? glassboxNextList(node, base) : skipLine(node))
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

/** What a link leads to, for the label on its Where next row. */
export function glassboxLinkLabel(href: string, base: string) {
  const path = href.startsWith(`${base}/`) ? href.slice(base.length) : ''
  if (glassboxSubjectOf(path)) return labels.lesson
  if (glassboxWalkthroughOf(path)) return labels.walkthrough
  return href.startsWith('/t/journal/') ? labels.journal : labels.page
}

/** A Where next list drawn as rows, each labelled by what its link leads to. */
export function glassboxNextList(node: MinimarkNode, base: string): MinimarkNode {
  if (typeof node === 'string') return node
  const [, props, ...items] = node
  return ['ul', { ...props, class: 'gb-next' }, ...(items as MinimarkNode[]).map((item) => {
    if (typeof item === 'string') return item
    const link = item.slice(2).find((child) => Array.isArray(child) && child[0] === 'a') as MinimarkElement | undefined
    return [item[0], item[1], ['span', {}, glassboxLinkLabel(String(link?.[1].href ?? ''), base)], ...item.slice(2)] as MinimarkNode
  })]
}
