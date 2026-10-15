import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { glassboxUpdate, type UpdateReport } from '../../scripts/glassbox-update.ts'

const pagesDir = 'layers/glassbox/content/guide/pages'
const lines = (n: number, tag = 'line') => Array.from({ length: n }, (_, i) => `${tag} ${i + 1}`).join('\n') + '\n'
const page = (rev: string, body: string) => `---\ntitle: T\ndescription: D\nrevision: '${rev}'\nrevisionDate: '2026-01-01'\n---\n\n${body}\n`

describe('glassboxUpdate over a fixture repo history', () => {
  let dir: string
  let base: string
  let main: string
  let report: UpdateReport
  const git = (...args: string[]) => execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { cwd: dir, encoding: 'utf8' }).trim()
  const write = (path: string, text: string) => {
    mkdirSync(dirname(join(dir, path)), { recursive: true })
    writeFileSync(join(dir, path), text)
  }
  const commit = (date: string) => {
    git('add', '-A')
    execFileSync('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', 'commit', '-q', '-m', 'c'], {
      cwd: dir,
      env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date },
    })
    return git('rev-parse', 'HEAD')
  }

  beforeAll(() => {
    dir = mkdtempSync(join(tmpdir(), 'glassbox-update-'))
    git('init', '-q', '-b', 'main')
    git('config', 'user.email', 'test@example.com')
    git('config', 'user.name', 'Test')
    write('src/a.ts', lines(10))
    write('src/b.ts', lines(3))
    write('GLOSSARY.md', '### Space\nA variant.\n')
    write('package.json', JSON.stringify({ dependencies: { nuxt: '^3.1.0' }, devDependencies: { zod: '^3.0.0', vitest: '1.0.0' } }))
    base = commit('2026-01-01T12:00:00+00:00')

    // Two lines added at the top, and old line 6 rewritten: 1-2 shifts, 5-6 holds the edit.
    write('src/a.ts', lines(10).replace('line 6\n', 'line six\n').replace(/^/, 'new 1\nnew 2\n'))
    write('GLOSSARY.md', '### Space\nAn isolated variant.\n')
    write('package.json', JSON.stringify({ dependencies: { nuxt: '^4.0.2' }, devDependencies: { zod: '^3.2.0', vitest: '1.0.0' } }))
    write(`${pagesDir}/claude-code/01.shifted.md`, page(base, 'See :file[src/a.ts]{lines="1-2"} and :file[src/].\n\n::excerpt{path="src/a.ts" lines="1-2"}\n```ts\nline 1\n```\n::'))
    write(`${pagesDir}/claude-code/02.edited.md`, page(base, 'See :file[src/a.ts]{lines="5-6"}.'))
    write(`${pagesDir}/walkthroughs/quiet.md`, page(base, 'See :file[src/b.ts] and a :term[Space].'))
    write('layers/glassbox/content/guide/terms/space.yml', 'term: Space\ndefinition: A variant.\nsource: GLOSSARY.md\n')
    main = commit('2026-02-03T12:00:00+00:00')
    report = glassboxUpdate(dir, 'main')
  })
  afterAll(() => rmSync(dir, { recursive: true, force: true }))

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

  it('reports tool versions that changed between revision and main, marking a major bump', () => {
    expect(report.versions).toEqual({
      [base]: [
        { name: 'nuxt', revision: '^3.1.0', main: '^4.0.2', major: true },
        { name: 'zod', revision: '^3.0.0', main: '^3.2.0', major: false },
      ],
    })
  })

  it('--write shifts ranges and advances every page but one with an edited range', () => {
    glassboxUpdate(dir, 'main', true)
    const read = (file: string) => readFileSync(join(dir, pagesDir, file), 'utf8')
    const pinned = `revision: '${main}'\nrevisionDate: '2026-02-03'`
    expect(read('claude-code/01.shifted.md')).toBe(page(base, 'See :file[src/a.ts]{lines="3-4"} and :file[src/].\n\n::excerpt{path="src/a.ts" lines="3-4"}\n```ts\nline 1\n```\n::')
      .replace(/revision: .*\nrevisionDate: .*/, pinned))
    expect(read('walkthroughs/quiet.md')).toContain(pinned)
    expect(read('claude-code/02.edited.md')).toContain(`revision: '${base}'`)
  })

  it('refuses a shallow clone', () => {
    const shallow = mkdtempSync(join(tmpdir(), 'glassbox-update-shallow-'))
    execFileSync('git', ['clone', '-q', '--depth', '1', `file://${dir}`, shallow])
    expect(() => glassboxUpdate(shallow, 'main')).toThrow(/shallow/)
    rmSync(shallow, { recursive: true, force: true })
  })
})
