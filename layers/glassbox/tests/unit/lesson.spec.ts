import { describe, expect, it } from 'vitest'
import type { MinimarkNode } from '@nuxt/content'
import { glassboxLessonSections, glassboxTryIt } from '../../app/utils/lesson.ts'

const h2 = (id: string, text: string): MinimarkNode => ['h2', { id }, text]
const h3 = (id: string, text: string): MinimarkNode => ['h3', { id }, text]
const link: MinimarkNode = ['a', { href: 'https://code.claude.com/docs' }, 'Claude Code docs']

describe('glassboxLessonSections', () => {
  it('wraps the sections design 1b frames, keeping every heading and its id', () => {
    expect(glassboxLessonSections([
      ['p', {}, 'Lede.'],
      ['p', {}, 'Know it? Skip to ', ['a', { href: '#in-terrarium' }, 'In Terrarium']],
      h2('the-concept', 'The concept'),
      ['p', {}, 'General.'],
      ['p', {}, 'Full reference: ', link],
      h2('in-terrarium', 'In Terrarium'),
      ['p', {}, 'How.'],
      h3('why-its-built-this-way', "Why it's built this way"),
      ['p', {}, 'Why.'],
      h3('what-to-watch-for', 'What to watch for'),
      ['ul', {}, ['li', {}, 'Trap.']],
      h2('try-it-in-your-project', 'Try it in your project'),
      ['p', {}, 'Step.'],
      h2('where-next', 'Where next'),
      ['ul', {}, ['li', {}, ['a', { href: '/t/glassbox/guide/zod/schemas' }, 'Schemas']], ['li', {}, ['a', { href: '/t/journal/current/how-it-works' }, 'How']]],
    ], '/t/glassbox/guide')).toEqual([
      ['p', {}, 'Lede.'],
      ['p', { class: 'gb-skip' }, 'Know it? Skip to ', ['a', { href: '#in-terrarium' }, 'In Terrarium']],
      ['div', { class: 'gb-concept' },
        ['p', { class: 'gb-kicker' }, 'Outside the box · General'],
        h2('the-concept', 'The concept'),
        ['p', {}, 'General.'],
        ['p', { class: 'gb-ref' }, ['span', {}, 'Full reference'], link],
      ],
      ['div', { class: 'gb-divider' }, 'Looking inside'],
      h2('in-terrarium', 'In Terrarium'),
      ['p', {}, 'How.'],
      ['div', { class: 'gb-cards' },
        ['div', { class: 'gb-card' }, h3('why-its-built-this-way', "Why it's built this way"), ['p', {}, 'Why.']],
        ['div', { class: 'gb-card' }, h3('what-to-watch-for', 'What to watch for'), ['ul', {}, ['li', {}, 'Trap.']]],
      ],
      ['div', { class: 'gb-try' }, h2('try-it-in-your-project', 'Try it in your project'), ['p', {}, 'Step.']],
      h2('where-next', 'Where next'),
      ['ul', { class: 'gb-next' },
        ['li', {}, ['span', {}, 'Lesson'], ['a', { href: '/t/glassbox/guide/zod/schemas' }, 'Schemas']],
        ['li', {}, ['span', {}, 'Journal'], ['a', { href: '/t/journal/current/how-it-works' }, 'How']],
      ],
    ])
  })

  it('ends a card at the next other h3, and leaves a page without those sections alone', () => {
    const walkthrough: MinimarkNode[] = [h2('1-a-reader-asks', '1. A reader asks'), ['p', {}, 'Stop.'], h3('aside', 'Aside')]
    expect(glassboxLessonSections(walkthrough, '/t/glassbox/guide')).toEqual(walkthrough)
    expect(glassboxLessonSections([h3('what-to-watch-for', 'What to watch for'), ['p', {}, 'Trap.'], h3('more', 'More')], '/t/glassbox/guide')).toEqual([
      ['div', { class: 'gb-cards' }, ['div', { class: 'gb-card' }, h3('what-to-watch-for', 'What to watch for'), ['p', {}, 'Trap.']]],
      h3('more', 'More'),
    ])
  })
})

describe('glassboxTryIt', () => {
  it('returns the nodes between the Try it heading and the next h2', () => {
    expect(glassboxTryIt([
      h2('in-terrarium', 'In Terrarium'),
      ['p', {}, 'How.'],
      h2('try-it-in-your-project', 'Try it in your project'),
      ['p', {}, 'Step.'],
      ['pre', {}, 'code'],
      h2('where-next', 'Where next'),
      ['p', {}, 'Next.'],
    ])).toEqual([['p', {}, 'Step.'], ['pre', {}, 'code']])
  })

  it('runs to the end when the section is last, and is empty without one', () => {
    expect(glassboxTryIt([h2('try-it-in-your-project', 'Try it'), ['p', {}, 'Step.']])).toEqual([['p', {}, 'Step.']])
    expect(glassboxTryIt([h2('in-terrarium', 'In Terrarium'), ['p', {}, 'How.']])).toEqual([])
  })
})
