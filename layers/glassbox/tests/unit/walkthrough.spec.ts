import { describe, expect, it } from 'vitest'
import type { MinimarkNode } from '@nuxt/content'
import { glassboxWalkthroughParts, glassboxWalkthroughsThrough } from '../../app/utils/walkthrough.ts'

const base = '/t/glassbox/guide'
const link = (href: string, text = 'x'): MinimarkNode => ['a', { href }, text]
const walkthrough = (path: string, title: string, ...nodes: MinimarkNode[]) => ({ path, title, body: { value: nodes } })

describe('glassboxWalkthroughsThrough', () => {
  const layers = `${base}/nuxt-vue/layers`

  it('lists each Walkthrough that links the Lesson once, however often it links it', () => {
    expect(glassboxWalkthroughsThrough([
      walkthrough('/walkthroughs/b', 'B', ['p', {}, link(layers)], ['stop-links', {}, ['p', {}, link(`${layers}#in-terrarium`)]]),
      walkthrough('/walkthroughs/a', 'A', ['ul', {}, ['li', {}, link(`${layers}/`)]]),
      walkthrough('/walkthroughs/c', 'C', ['p', {}, link(`${base}/nuxt-vue/layers-two`)]),
    ], layers)).toEqual([
      { path: '/walkthroughs/a', title: 'A' },
      { path: '/walkthroughs/b', title: 'B' },
    ])
  })

  it('is empty for a Lesson no Walkthrough links', () => {
    expect(glassboxWalkthroughsThrough([walkthrough('/walkthroughs/a', 'A', ['p', {}, 'No links.'])], layers)).toEqual([])
  })
})

describe('glassboxWalkthroughParts', () => {
  it('cuts each numbered stop into its own part, its number out of the heading and its ::stop-links drawn as chips', () => {
    expect(glassboxWalkthroughParts([
      ['h2', { id: '1-start' }, '1. Start'],
      ['p', {}, 'Story.'],
      ['stop-links', {}, ['p', {},
        link(`${base}/nuxt-vue/layers`, 'Layers'), ' · ',
        ['file', {}, 'docs/adr/0009-session-logs-commit-directly-to-main.md'], ' · ',
        ['term', {}, 'Friction'], ' · see ', link('/t/journal/current', 'the Journal'),
      ]],
      ['h2', { id: '2-end' }, '2. End'],
      ['p', {}, 'More.'],
      ['h2', { id: 'where-next' }, 'Where next'],
      ['ul', {}],
    ], base)).toEqual([
      { stop: '1', id: '1-start', nodes: [
        ['h2', { id: '1-start' }, 'Start'],
        ['p', {}, 'Story.'],
        ['ul', { class: 'gb-stop-links' },
          ['li', {}, ['span', {}, 'Lesson'], link(`${base}/nuxt-vue/layers`, 'Layers')],
          ['li', {}, ['file', {}, 'docs/adr/0009-session-logs-commit-directly-to-main.md']],
          ['li', {}, ['term', {}, 'Friction']],
          ['li', {}, ' see ', link('/t/journal/current', 'the Journal')],
        ],
      ] },
      { stop: '2', id: '2-end', nodes: [['h2', { id: '2-end' }, 'End'], ['p', {}, 'More.']] },
      { nodes: [['h2', { id: 'where-next' }, 'Where next'], ['ul', {}]] },
    ])
  })
})
