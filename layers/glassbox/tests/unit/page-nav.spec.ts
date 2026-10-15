import { describe, expect, it } from 'vitest'
import { currentGlassboxHeading, formatGlassboxDate, glassboxSplitAtFirstSection, glassboxSurround } from '../../app/utils/page-nav.ts'

describe('glassboxSurround', () => {
  // Stem order: Subject folders sort alphabetically, so the Subject map has to reorder them.
  const pages = [
    { path: '/', title: 'Landing' },
    { path: '/claude-code/claude-md', title: 'CLAUDE.md as the every-session contract' },
    { path: '/claude-code/path-scoped-rules', title: 'Path-scoped rules' },
    { path: '/nuxt-vue/layers', title: 'One app, many sites' },
    { path: '/skill-pack/skill-pack', title: 'The Skill pack' },
    { path: '/walkthroughs/opening-a-page', title: 'Opening a page' },
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
      prev: { path: '/claude-code/path-scoped-rules', title: 'Path-scoped rules', label: 'Leaving Skill pack → Claude Code' },
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
    expect(glassboxSurround(pages, '/walkthroughs/opening-a-page')).toBeNull()
    expect(glassboxSurround(pages, '/')).toBeNull()
  })
})

describe('glassboxSplitAtFirstSection', () => {
  it('splits before the first top-level node that holds an h2, wrapped or not', () => {
    const lede = ['p', {}, 'Lede']
    const skip = ['p', {}, 'Know X? ', ['a', { href: '#in-terrarium' }, 'Skip']]
    const concept = ['concept', {}, ['h2', { id: 'the-concept' }, 'The concept'], ['p', {}, 'Body']]
    const later = ['h2', { id: 'in-terrarium' }, 'In Terrarium']
    expect(glassboxSplitAtFirstSection([lede, skip, concept, later])).toEqual([[lede, skip], [concept, later]])
    expect(glassboxSplitAtFirstSection([lede, later])).toEqual([[lede], [later]])
  })

  it('keeps everything in the intro when there is no h2', () => {
    expect(glassboxSplitAtFirstSection([['p', {}, 'Only'], 'text'])).toEqual([[['p', {}, 'Only'], 'text'], []])
  })
})

describe('formatGlassboxDate', () => {
  it('reads like "14 Oct 2026"', () => {
    expect(formatGlassboxDate('2026-10-14')).toBe('14 Oct 2026')
    expect(formatGlassboxDate('2026-01-01')).toBe('1 Jan 2026')
  })
})

describe('currentGlassboxHeading', () => {
  const headings = [{ id: 'the-concept', top: -400 }, { id: 'in-terrarium', top: 120 }, { id: 'where-next', top: 900 }]

  it('is the last heading scrolled past the reading line', () => {
    expect(currentGlassboxHeading(headings, 200, false)).toBe('in-terrarium')
    expect(currentGlassboxHeading(headings, 100, false)).toBe('the-concept')
  })

  it('is none before the first heading reaches the line', () => {
    expect(currentGlassboxHeading([{ id: 'the-concept', top: 500 }], 200, false)).toBeUndefined()
  })

  // A short last section never reaches the line, so the page's end selects it.
  it('is the last heading once the page is scrolled to its end', () => {
    expect(currentGlassboxHeading(headings, 200, true)).toBe('where-next')
  })
})
