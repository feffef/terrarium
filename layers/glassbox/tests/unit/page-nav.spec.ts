import { describe, expect, it } from 'vitest'
import { currentGlassboxHeading, glassboxFrameDiagrams, glassboxSplitBeforeBody, glassboxSurround } from '../../app/utils/page-nav.ts'

describe('glassboxSurround', () => {
  // Stem order: Subject folders sort alphabetically, so the Subject map has to reorder them.
  const pages = [
    { path: '/', title: 'Landing' },
    { path: '/claude-code/claude-md', title: 'CLAUDE.md as the every-session contract' },
    { path: '/claude-code/path-scoped-rules', title: 'Path-scoped rules' },
    { path: '/nuxt-vue/layers', title: 'One app, many sites' },
    { path: '/skill-pack/skill-pack', title: 'The Skill pack' },
    { path: '/walkthroughs/from-file-to-browser', title: 'From file to browser' },
  ]

  it('links the Lessons either side within a Subject', () => {
    expect(glassboxSurround(pages, '/claude-code/path-scoped-rules')?.prev).toEqual(
      { path: '/claude-code/claude-md', title: 'CLAUDE.md as the every-session contract', label: '← Claude Code' },
    )
  })

  it('crosses Subjects in Subject-map order, both ways, and says so', () => {
    expect(glassboxSurround(pages, '/claude-code/path-scoped-rules')?.next).toEqual(
      { path: '/skill-pack/skill-pack', title: 'The Skill pack', label: 'Leaving Claude Code → Skill pack' },
    )
    expect(glassboxSurround(pages, '/skill-pack/skill-pack')).toEqual({
      prev: { path: '/claude-code/path-scoped-rules', title: 'Path-scoped rules', label: '← Leaving Skill pack · Claude Code' },
      next: { path: '/nuxt-vue/layers', title: 'One app, many sites', label: 'Leaving Skill pack → Nuxt & Vue' },
    })
  })

  it('ends the chain at the first and last Lesson', () => {
    expect(glassboxSurround(pages, '/claude-code/claude-md')).toEqual({
      prev: null,
      next: { path: '/claude-code/path-scoped-rules', title: 'Path-scoped rules', label: 'Claude Code →' },
    })
    expect(glassboxSurround(pages, '/nuxt-vue/layers')?.next).toBeNull()
  })

  it('leaves Walkthroughs and the landing page out of the chain', () => {
    expect(glassboxSurround(pages, '/walkthroughs/from-file-to-browser')).toBeNull()
    expect(glassboxSurround(pages, '/')).toBeNull()
  })
})

describe('glassboxSplitBeforeBody', () => {
  it('splits before the first top-level node that holds an h2, wrapped or not', () => {
    const lede = ['p', {}, 'Lede']
    const skip = ['p', {}, 'Know X? ', ['a', { href: '#in-terrarium' }, 'Skip']]
    const concept = ['concept', {}, ['h2', { id: 'the-concept' }, 'The concept'], ['p', {}, 'Body']]
    const later = ['h2', { id: 'in-terrarium' }, 'In Terrarium']
    expect(glassboxSplitBeforeBody([lede, skip, concept, later])).toEqual([[lede, skip], [concept, later]])
    expect(glassboxSplitBeforeBody([lede, later])).toEqual([[lede], [later]])
  })

  // Design 1b: a Walkthrough's diagram comes after the table of contents.
  it('splits before a diagram that comes before the first h2', () => {
    const lede = ['p', {}, 'Lede']
    const diagram = ['pre', { language: 'mermaid', code: 'flowchart TD' }]
    const stop = ['h2', { id: '1-a' }, '1. A']
    expect(glassboxSplitBeforeBody([lede, diagram, stop])).toEqual([[lede], [diagram, stop]])
    expect(glassboxSplitBeforeBody([lede, ['pre', { language: 'ts' }], stop])).toEqual([[lede, ['pre', { language: 'ts' }]], [stop]])
  })

  it('keeps everything in the intro when there is no h2', () => {
    expect(glassboxSplitBeforeBody([['p', {}, 'Only'], 'text'])).toEqual([[['p', {}, 'Only'], 'text'], []])
  })
})

describe('glassboxFrameDiagrams', () => {
  it('frames each diagram, nested or not, and leaves other nodes alone', () => {
    const diagram = ['pre', { language: 'mermaid', code: 'flowchart TD' }]
    const code = ['pre', { language: 'ts' }]
    const framed = ['div', { class: 'gb-diagram' }, diagram]
    expect(glassboxFrameDiagrams([['p', {}, 'Lede'], diagram, code, ['div', { class: 'gb-card' }, diagram], 'text']))
      .toEqual([['p', {}, 'Lede'], framed, code, ['div', { class: 'gb-card' }, framed], 'text'])
  })
})

describe('currentGlassboxHeading', () => {
  const headings = [{ id: 'the-concept', top: -400 }, { id: 'in-terrarium', top: 120 }, { id: 'where-next', top: 900 }]

  it('is the last heading scrolled past the reading line', () => {
    expect(currentGlassboxHeading(headings, 200, false)).toBe('in-terrarium')
    expect(currentGlassboxHeading(headings, 100, false)).toBe('the-concept')
  })

  // Why it's built this way and What to watch for sit side by side (design 1b).
  it('is the first of headings that share a top', () => {
    const cards = [{ id: 'in-terrarium', top: -300 }, { id: 'why-its-built-this-way', top: 100 }, { id: 'what-to-watch-for', top: 100 }]
    expect(currentGlassboxHeading(cards, 200, false)).toBe('why-its-built-this-way')
  })

  it('is none before the first heading reaches the line', () => {
    expect(currentGlassboxHeading([{ id: 'the-concept', top: 500 }], 200, false)).toBeUndefined()
  })

  // A short last section never reaches the line, so the page's end selects it.
  it('is the last heading once the page is scrolled to its end', () => {
    expect(currentGlassboxHeading(headings, 200, true)).toBe('where-next')
  })
})
