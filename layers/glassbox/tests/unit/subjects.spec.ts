import { describe, expect, it } from 'vitest'
import { glassboxDirectory } from '../../app/utils/subjects.ts'

describe('glassboxDirectory', () => {
  it('lists only Subjects with a Lesson, in Subject order, keeping Lesson order', () => {
    const directory = glassboxDirectory([
      { path: '/', title: 'Terrarium, seen through the glass.' },
      { path: '/terrarium-practice/gate', title: 'The Gate' },
      { path: '/claude-code/claude-md', title: 'CLAUDE.md as the every-session contract' },
      { path: '/claude-code/path-scoped-rules', title: 'Path-scoped rules' },
      { path: '/walkthroughs/opening-a-page', title: 'Opening a page' },
    ])
    expect(directory).toEqual([
      {
        slug: 'claude-code',
        name: 'Claude Code',
        lessons: [
          { path: '/claude-code/claude-md', title: 'CLAUDE.md as the every-session contract' },
          { path: '/claude-code/path-scoped-rules', title: 'Path-scoped rules' },
        ],
      },
      { slug: 'terrarium-practice', name: 'Terrarium practice', lessons: [{ path: '/terrarium-practice/gate', title: 'The Gate' }] },
    ])
  })

  it('is empty when no Subject has a Lesson', () => {
    expect(glassboxDirectory([{ path: '/', title: 'Landing' }])).toEqual([])
  })
})
