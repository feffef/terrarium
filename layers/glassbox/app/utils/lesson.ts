import type { MinimarkElement, MinimarkNode } from '@nuxt/content'

// Design 1b frames a Lesson's sections (issue #2015). Writers keep plain
// headings: a heading nested two blocks deep drops out of `body.toc`, so the
// frames are added here, at render, keyed on the fixed section ids.
const frames: Record<string, string> = { 'the-concept': 'gb-concept', 'try-it-in-your-project': 'gb-try' }
const cardIds = ['why-its-built-this-way', 'what-to-watch-for']

/** A Lesson body with design 1b's section frames added; other nodes unchanged. */
export function glassboxLessonSections(nodes: MinimarkNode[]): MinimarkNode[] {
  const out: MinimarkNode[] = []
  let box: MinimarkElement | undefined
  let cards: MinimarkElement | undefined
  for (const node of nodes) {
    const [tag, props] = typeof node === 'string' ? [] : node
    const id = String(props?.id)
    if (tag === 'h2') {
      box = cards = undefined
      if (id === 'in-terrarium') out.push(['div', { class: 'gb-divider' }, 'Looking inside'])
      if (frames[id]) out.push(box = ['div', { class: frames[id] }])
    } else if (tag === 'h3' && cardIds.includes(id)) {
      if (!cards) out.push(cards = ['div', { class: 'gb-cards' }])
      cards.push(box = ['div', { class: 'gb-card' }])
    } else if (tag === 'h3' && cards) {
      box = cards = undefined
    }
    ;(box ?? out).push(box?.[1].class === 'gb-concept' ? fullReference(node) : node)
  }
  return out
}

// "Full reference: [Docs](https://…)" closes The concept as 1b's button.
function fullReference(node: MinimarkNode): MinimarkNode {
  if (typeof node === 'string' || node[0] !== 'p') return node
  const [, , first, ...rest] = node
  if (typeof first !== 'string' || !first.startsWith('Full reference')) return node
  const after = first.replace(/^Full reference:?\s*/, '')
  return ['p', { class: 'gb-ref' }, ['span', {}, 'Full reference'], ...(after ? [after] : []), ...rest]
}
