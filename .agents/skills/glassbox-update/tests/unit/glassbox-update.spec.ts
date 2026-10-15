import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createGitFixture, git, shallowClone, type GitFixture } from '../../../../../tests/support/git-fixture.ts'
import { glassboxUpdate, type UpdateReport } from '../../scripts/glassbox-update.ts'

const pagesDir = 'layers/glassbox/content/guide/pages'
const lines = (n: number) => Array.from({ length: n }, (_, i) => `line ${i + 1}`).join('\n') + '\n'
const page = (rev: string, body: string) => `---\ntitle: T\ndescription: D\nrevision: '${rev}'\nrevisionDate: '2026-01-01'\n---\n\n${body}\n`
const shiftedBody = (range: string) => `See :file[src/a.ts]{lines="${range}"} and :file[src/].\n\n::excerpt{path="src/a.ts" lines="${range}"}\n\`\`\`ts\nline 1\n\`\`\`\n::`

describe('glassboxUpdate over a fixture repo history', () => {
  let fixture: GitFixture
  let dir: string
  let base: string
  let main: string
  let report: UpdateReport
  const write = (path: string, text: string) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  const commit = (date: string) => {
    git(dir, ['add', '-A'])
    git(dir, ['commit', '-qm', 'c'], { GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date })
    return git(dir, ['rev-parse', 'HEAD'])
  }
  const deps = (nuxt: string, zod: string, consola: string) => JSON.stringify({ dependencies: { nuxt, consola }, devDependencies: { zod, vitest: '1.0.0' } })

  beforeAll(() => {
    fixture = createGitFixture('glassbox-update')
    dir = fixture.work
    write('src/a.ts', lines(10))
    write('src/b.ts', lines(3))
    write('GLOSSARY.md', '### Space\nA variant.\n')
    write('package.json', deps('^3.1.0', '^3.0.0', '^0.3.0'))
    base = commit('2026-01-01T12:00:00+00:00')

    // Two lines added at the top, and old line 6 rewritten: 1-2 shifts, 5-6 holds the edit.
    write('src/a.ts', lines(10).replace('line 6\n', 'line six\n').replace(/^/, 'new 1\nnew 2\n'))
    write('GLOSSARY.md', '### Space\nAn isolated variant.\n')
    write('package.json', deps('^4.0.2', '^3.2.0', '^0.4.0'))
    write(`${pagesDir}/claude-code/01.shifted.md`, page(base, shiftedBody('1-2')))
    write(`${pagesDir}/claude-code/02.edited.md`, page(base, 'See :file[src/a.ts]{lines="5-6"}.'))
    write(`${pagesDir}/walkthroughs/quiet.md`, page(base, 'See :file[src/b.ts] and a :term[Space].'))
    write('layers/glassbox/content/guide/terms/space.yml', 'term: Space\ndefinition: A variant.\nsource: GLOSSARY.md\n')
    main = commit('2026-02-03T12:00:00+00:00')
    report = glassboxUpdate(dir, { main: 'main' })
  })
  afterAll(() => rmSync(fixture.dir, { recursive: true, force: true }))

  it('lists the pages whose cited paths changed, and only those', () => {
    expect(report.main).toBe(main)
    expect(report.mainDate).toBe('2026-02-03')
    expect(report.pages.map((p) => [p.file, p.changedPaths])).toEqual([
      ['claude-code/01.shifted.md', ['src/a.ts', 'src/']],
      ['claude-code/02.edited.md', ['src/a.ts']],
    ])
  })

  it('shifts a range the diff moved, and flags a range the diff edited', () => {
    const [shifted, edited] = report.pages
    expect(shifted!.shifted).toEqual([{ path: 'src/a.ts', from: '1-2', to: '3-4' }])
    expect(shifted!.edited).toEqual([])
    expect(edited!.edited).toEqual([{ path: 'src/a.ts', lines: '5-6' }])
  })

  it('lists a term whose source changed since a page citing it was pinned', () => {
    expect(report.terms).toEqual([{ id: 'space', source: 'GLOSSARY.md' }])
  })

  it('reports tool versions that changed between revision and main, a 0.x minor bump as major', () => {
    expect(report.versions).toEqual({
      [base]: [
        { name: 'consola', revision: '^0.3.0', main: '^0.4.0', major: true },
        { name: 'nuxt', revision: '^3.1.0', main: '^4.0.2', major: true },
        { name: 'zod', revision: '^3.0.0', main: '^3.2.0', major: false },
      ],
    })
  })

  it('write lands the shift on a flagged page and pins every page but one with an edited range', () => {
    glassboxUpdate(dir, { main, write: true })
    const read = (file: string) => readFileSync(join(dir, pagesDir, file), 'utf8')
    const pinned = (text: string) => text.replace(`revision: '${base}'\nrevisionDate: '2026-01-01'`, `revision: '${main}'\nrevisionDate: '2026-02-03'`)
    expect(read('claude-code/01.shifted.md')).toBe(pinned(page(base, shiftedBody('3-4'))))
    expect(read('walkthroughs/quiet.md')).toBe(pinned(page(base, 'See :file[src/b.ts] and a :term[Space].')))
    expect(read('claude-code/02.edited.md')).toBe(page(base, 'See :file[src/a.ts]{lines="5-6"}.'))
  })

  it('refuses a shallow clone', () => {
    git(dir, ['push', '-q', 'origin', 'main'])
    expect(() => glassboxUpdate(shallowClone(fixture, 'shallow', 1), { main: 'main' })).toThrow(/shallow/)
  })
})
