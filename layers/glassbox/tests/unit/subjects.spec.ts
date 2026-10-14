import { describe, expect, it } from 'vitest'
import { glassboxDirectory, glassboxWalkthroughs } from '../../app/utils/subjects.ts'

describe('glassboxWalkthroughs', () => {
  it('lists only Walkthroughs, keeping their order', () => {
    expect(glassboxWalkthroughs([
      { path: '/', title: 'Landing' },
      { path: '/walkthroughs/opening-a-page', title: 'Opening a page' },
      { path: '/claude-code/claude-md', title: 'CLAUDE.md as the every-session contract' },
      { path: '/walkthroughs/friction-to-fix', title: 'A friction becomes a fix' },
    ])).toEqual([
      { path: '/walkthroughs/opening-a-page', title: 'Opening a page' },
      { path: '/walkthroughs/friction-to-fix', title: 'A friction becomes a fix' },
    ])
  })
})

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
