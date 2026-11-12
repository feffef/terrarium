import { describe, expect, it } from 'vitest'
import type { MinimarkNode } from '@nuxt/content'
import { glassboxLessonSections, glassboxNextLessons, glassboxNextList } from '../../app/utils/lesson.ts'

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
      ['ul', {}, ['li', {}, ['a', { href: '/t/glassbox/guide/verification/schemas' }, 'Schemas']], ['li', {}, ['a', { href: '/t/journal/current/history' }, 'How']]],
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
        ['li', {}, ['span', {}, 'Lesson'], ['a', { href: '/t/glassbox/guide/verification/schemas' }, 'Schemas']],
        ['li', {}, ['span', {}, 'Journal'], ['a', { href: '/t/journal/current/history' }, 'How']],
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

describe('glassboxNextList', () => {
  const base = '/t/glassbox/guide'
  const bare = (href: string): MinimarkNode => ['li', {}, ['a', { href }]]

  it('fills a bare link with its target\'s current title, and leaves typed text and other targets alone', () => {
    expect(glassboxNextList(['ul', {}, bare(`${base}/verification/schemas`), bare('/t/journal/current/history'), bare(`${base}/missing`),
      ['li', {}, ['a', { href: `${base}/verification/schemas` }, 'Typed']]], base, { '/verification/schemas': 'Schemas' })).toEqual(['ul', { class: 'gb-next' },
      ['li', {}, ['span', {}, 'Lesson'], ['a', { href: `${base}/verification/schemas` }, 'Schemas']],
      ['li', {}, ['span', {}, 'Journal'], ['a', { href: '/t/journal/current/history' }]],
      ['li', {}, ['span', {}, 'Page'], ['a', { href: `${base}/missing` }]],
      ['li', {}, ['span', {}, 'Lesson'], ['a', { href: `${base}/verification/schemas` }, 'Typed']],
    ])
  })

  it('leaves out the rows whose Lesson was read, and keeps the other targets', () => {
    expect(glassboxNextList(['ul', {}, bare(`${base}/verification/schemas`), bare(`${base}/hooks/gate`), bare('/t/journal/current/history')], base, {}, ['/verification/schemas'])).toEqual(['ul', { class: 'gb-next' },
      ['li', {}, ['span', {}, 'Lesson'], ['a', { href: `${base}/hooks/gate` }]],
      ['li', {}, ['span', {}, 'Journal'], ['a', { href: '/t/journal/current/history' }]],
    ])
  })
})

describe('Where next and read Lessons', () => {
  const base = '/t/glassbox/guide'
  const body = (...hrefs: string[]): MinimarkNode[] => [
    h2('where-next', 'Where next'),
    ['ul', {}, ...hrefs.map((href): MinimarkNode => ['li', {}, ['a', { href }]])],
  ]
  const a = `${base}/verification/schemas`
  const b = `${base}/hooks/gate`

  it('lists the Lessons a Where next list links, in order, skipping other targets', () => {
    expect(glassboxNextLessons(body(a, '/t/journal/current/history', b), base)).toEqual(['/verification/schemas', '/hooks/gate'])
    expect(glassboxNextLessons([['p', {}, 'No list.']], base)).toEqual([])
  })

  it('keeps the heading while an unread link remains, and drops it once every link is read', () => {
    expect(glassboxLessonSections(body(a, b), base, {}, ['/verification/schemas'])).toEqual([
      h2('where-next', 'Where next'),
      ['ul', { class: 'gb-next' }, ['li', {}, ['span', {}, 'Lesson'], ['a', { href: b }]]],
    ])
    expect(glassboxLessonSections(body(a, b), base, {}, ['/verification/schemas', '/hooks/gate'])).toEqual([])
  })

  it('keeps Where next whole when a link is not a Lesson, however much is read', () => {
    const out = glassboxLessonSections(body(a, '/t/journal/current/history'), base, {}, ['/verification/schemas'])
    expect(out[0]).toEqual(h2('where-next', 'Where next'))
  })
})
