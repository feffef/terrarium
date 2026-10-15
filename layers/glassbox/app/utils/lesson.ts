import type { MinimarkElement, MinimarkNode } from '@nuxt/content'

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
} as const

const ids = glassboxLessonIds
const labels = glassboxLessonLabels

/** A Lesson body with design 1b's section frames added; other nodes unchanged. */
export function glassboxLessonSections(nodes: MinimarkNode[]): MinimarkNode[] {
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
    ;(box ?? out).push(inConcept ? fullReference(node) : isNextList ? nextList(node) : skipLine(node))
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

function nextList(node: MinimarkNode): MinimarkNode {
  if (typeof node === 'string') return node
  const [, props, ...items] = node
  return ['ul', { ...props, class: 'gb-next' }, ...items.map((item) =>
    typeof item === 'string' ? item : [item[0], item[1], ['span', {}, labels.lesson], ...item.slice(2)] as MinimarkNode)]
}
