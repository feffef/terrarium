import { describe, expect, it } from 'vitest'
import { glassboxDirectory, glassboxSubjectOf, glassboxWalkthroughs } from '../../app/utils/subjects.ts'

describe('glassboxSubjectOf', () => {
  it("names a Lesson's Subject from its folder, and none for other pages", () => {
    expect(glassboxSubjectOf('/nuxt-vue/layers')?.name).toBe('Nuxt & Vue')
    expect(glassboxSubjectOf('/walkthroughs/from-file-to-browser')).toBeUndefined()
    expect(glassboxSubjectOf('/')).toBeUndefined()
  })
})

describe('glassboxWalkthroughs', () => {
  it('lists only Walkthroughs, Start here first, then by title', () => {
    expect(glassboxWalkthroughs([
      { path: '/', title: 'Landing' },
      { path: '/walkthroughs/routines', title: 'The Routines' },
      { path: '/walkthroughs/friction-to-fix', title: 'A friction becomes a fix' },
      { path: '/claude-code/claude-md', title: 'CLAUDE.md as the every-session contract' },
      { path: '/walkthroughs/from-file-to-browser', title: 'From file to browser' },
    ])).toEqual([
      { path: '/walkthroughs/from-file-to-browser', title: 'From file to browser' },
      { path: '/walkthroughs/friction-to-fix', title: 'A friction becomes a fix' },
      { path: '/walkthroughs/routines', title: 'The Routines' },
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
      { path: '/walkthroughs/from-file-to-browser', title: 'From file to browser' },
    ])
    expect(directory).toMatchObject([
      {
        slug: 'claude-code',
        name: 'Claude Code',
        lessons: [
          { path: '/claude-code/claude-md', title: 'CLAUDE.md as the every-session contract' },
          { path: '/claude-code/path-scoped-rules', title: 'Path-scoped rules' },
        ],
      },
      { slug: 'terrarium-practice', name: 'House rules', lessons:[{ path: '/terrarium-practice/gate', title: 'The Gate' }] },
    ])
  })

  it('is empty when no Subject has a Lesson', () => {
    expect(glassboxDirectory([{ path: '/', title: 'Landing' }])).toEqual([])
  })
})
