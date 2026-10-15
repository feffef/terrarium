import { existsSync, globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { parseDocument } from '../../../../scripts/validate-content.ts'
import { root } from '../../../../shared/expand.ts'
import { glassboxPageProblems, glassboxTermProblems, repoGit, type GlassboxGit, type GlassboxSite } from '../page-checks.ts'

const rev = 'a'.repeat(40)
const expand = [
  'import { resolve } from "node:path"',
  '',
  'export function catalogFrom(cols) {',
  '  const out = {}',
  '  for (const col of cols) out[col.key] = col',
  '  return out',
  '}',
].join('\n')
const files: Record<string, string | string[]> = {
  'shared/expand.ts': `${expand}\n`,
  'layers/': ['blog', 'glassbox'],
  'docs/adr/': ['0004-objective-safety-gate.md'],
}
const fakeGit: GlassboxGit = {
  commit: (r) => (r === rev ? { date: '2026-10-14T23:03:14+00:00', onMain: true } : r === 'b'.repeat(40) ? { date: '2026-10-14T01:00:00+00:00', onMain: false } : undefined),
  read: (r, path) => (r === rev ? files[path] : undefined),
}
const site: GlassboxSite = {
  pages: ['index.md', 'nuxt-content/01.collections.md', 'terrarium-practice/01.gate.md', 'walkthroughs/opening-a-page.md'],
  journal: ['current/pages/index.md', 'current/pages/how-it-works.md'],
  terms: ['collection'],
}

const front = `---\ntitle: T\ndescription: D\nrevision: '${rev}'\nrevisionDate: '2026-10-14'\n---\n`
const lesson = `${front}
Collections come from one manifest.

Know it? Skip to [In Terrarium](#in-terrarium).

## The concept

A :term[Collection] is one type of content.

Full reference: [Nuxt Content docs](https://content.nuxt.com/docs/collections/define)

## In Terrarium

Built in :file[shared/expand.ts]{lines="3-7"}, one per :file[layers/].

::excerpt{path="shared/expand.ts" lines="3-7"}
\`\`\`ts
export function catalogFrom(cols) {
  // …
  return out
}
\`\`\`
::

### Why it's built this way

See ADR-0004 and [how it works](/t/journal/current/how-it-works).

### What to watch for

Issues like https://github.com/feffef/terrarium/issues/1985 are fine.

## Try it in your project

\`\`\`ts
// an example, not an Excerpt: never checked
see github.com/feffef/terrarium/blob/main/x.ts and ADR-9999
\`\`\`

## Where next

- [The Gate](/t/glassbox/guide/terrarium-practice/gate)
`
const walkthrough = `${front}
How a page opens.

## 1. The request arrives

It reaches the router.

::stop-links
[Collections](/t/glassbox/guide/nuxt-content/collections)
::

## 2. The page renders

::stop-links
:file[shared/expand.ts]
::

## Where next

- [Home](/t/glassbox/guide)
`

const check = (file: string, source: string) => glassboxPageProblems(file, source, site, fakeGit)

describe('glassboxPageProblems on fixture pages', () => {
  it('passes a good Lesson, Terrarium practice Lesson, Walkthrough and landing page', () => {
    expect(check('nuxt-content/01.collections.md', lesson)).toEqual([])
    expect(check('terrarium-practice/01.gate.md', lesson.replace(/^Full reference.*$/m, ''))).toEqual([])
    expect(check('walkthroughs/opening-a-page.md', walkthrough)).toEqual([])
    expect(check('index.md', `${front}\nWelcome.\n`)).toEqual([])
  })

  it.each([
    ['revision not on main', (s: string) => s.replace(rev, 'b'.repeat(40)), 'is not on main'],
    ['revisionDate off its commit', (s: string) => s.replace("'2026-10-14'", "'2026-10-13'"), 'is not the revision\'s date 2026-10-14'],
    ['a :file path missing at revision', (s: string) => s.replace(':file[layers/]', ':file[nowhere/]'), 'nowhere/ does not exist'],
    ['an ::excerpt path missing at revision', (s: string) => s.replace('path="shared/expand.ts"', 'path="shared/gone.ts"'), 'shared/gone.ts does not exist'],
    ['a lines range past the file end', (s: string) => s.replace('{lines="3-7"}', '{lines="3-8"}'), 'lines 3-8 do not fit its 7 lines'],
    ['an Excerpt not word for word', (s: string) => s.replace('  return out', '  return outs'), 'Excerpt of shared/expand.ts is not in the file'],
    ['an Excerpt outside its lines', (s: string) => s.replace('lines="3-7"}\n```', 'lines="1-5"}\n```'), 'Excerpt of shared/expand.ts is not in the file'],
    ['an Excerpt out of order across a gap', (s: string) => s.replace('  // …\n  return out', '  return out\n  // …\n  const out = {}'), 'Excerpt of shared/expand.ts is not in the file'],
    ['an ADR missing at revision', (s: string) => s.replace('ADR-0004', 'ADR-0099'), 'ADR-0099 does not exist'],
    ['a guide link to no page', (s: string) => s.replace('terrarium-practice/gate', 'terrarium-practice/gates'), 'link /t/glassbox/guide/terrarium-practice/gates resolves to no page'],
    ['a Journal link to no content file', (s: string) => s.replace('current/how-it-works', 'current/skills'), 'link /t/journal/current/skills resolves to no page'],
    ['a Lesson with no Full reference', (s: string) => s.replace('(https://content', '(http://content'), 'no "Full reference" https link'],
    ['a reworded Lesson heading', (s: string) => s.replace('### What to watch for', '### Watch for'), 'no #what-to-watch-for heading'],
    ['a :term with no entry', (s: string) => s.replace(':term[Collection]', ':term[Space]'), ':term space has no entry'],
    ['a hand-written blob link', (s: string) => `${s}\n[x](https://github.com/feffef/terrarium/blob/${rev}/shared/expand.ts)\n`, 'hand-written link'],
    ['a hand-written tree link', (s: string) => `${s}\nhttps://github.com/feffef/terrarium/tree/main/layers\n`, 'hand-written link'],
  ])('fails %s', (_name, broken, message) => {
    expect(check('nuxt-content/01.collections.md', broken(lesson)).join('\n')).toContain(message)
  })

  it.each([
    ['a stop with no ::stop-links block', (s: string) => s.replace('::stop-links\n:file[shared/expand.ts]\n::', ''), 'stop "2. The page renders" has 0 ::stop-links blocks'],
    ['a stop with two ::stop-links blocks', (s: string) => s.replace('It reaches the router.', '::stop-links\n[A](/t/glassbox/guide)\n::'), 'stop "1. The request arrives" has 2'],
    ['a stop whose ::stop-links links nothing', (s: string) => s.replace(':file[shared/expand.ts]', 'Nothing.'), 'stop "2. The page renders" links nothing'],
  ])('fails a Walkthrough with %s', (_name, broken, message) => {
    expect(check('walkthroughs/opening-a-page.md', broken(walkthrough)).join('\n')).toContain(message)
  })

  it.each([
    ['a folder outside the Subject map', 'nuxt/01.collections.md', 'folder nuxt/ is not in the Subject map'],
    ['a Lesson with no two-digit prefix', 'nuxt-content/collections.md', 'no two-digit prefix'],
    ['a one-digit prefix', 'nuxt-content/1.collections.md', 'no two-digit prefix'],
    ['a page outside any folder', 'collections.md', 'outside a Subject folder'],
  ])('fails %s', (_name, file, message) => {
    expect(check(file, lesson).join('\n')).toContain(message)
  })

  it('skips the git checks where the clone lacks the revision, and still checks the rest', () => {
    const shallow = lesson.replaceAll(rev, 'c'.repeat(40)).replace('ADR-0004', 'ADR-0099').replace('terrarium-practice/gate', 'nowhere')
    expect(check('nuxt-content/01.collections.md', shallow)).toEqual(['link /t/glassbox/guide/nowhere resolves to no page'])
  })
})

describe('glassboxTermProblems', () => {
  it('fails a term whose source does not exist, and passes one that does or has none', () => {
    const exists = (path: string) => path === 'GLOSSARY.md'
    expect(glassboxTermProblems({ space: { source: 'GLOSSARY.md' }, zod: {} }, exists)).toEqual([])
    expect(glassboxTermProblems({ space: { source: 'GLOSARY.md' } }, exists)).toEqual(['term space: source GLOSARY.md does not exist'])
  })
})

describe('every Glass Box page matches the code at its revision', () => {
  const content = join(root, 'layers/glassbox/content/guide')
  const pages = globSync('**/*.md', { cwd: join(content, 'pages') }).sort()
  const terms = Object.fromEntries(globSync('**/*.yml', { cwd: join(content, 'terms') })
    .map((f) => [f.replace(/\.yml$/, ''), parseDocument(join(content, 'terms', f)) as { source?: string }]))
  const realSite: GlassboxSite = {
    pages,
    journal: globSync('*/pages/**/*.md', { cwd: join(root, 'layers/journal/content') }),
    terms: Object.keys(terms),
  }

  it('finds the landing page (canary: the walk must not match nothing)', () => {
    expect(pages).toContain('index.md')
  })

  it.each(pages)('%s', (file) => {
    expect(glassboxPageProblems(file, readFileSync(join(content, 'pages', file), 'utf8'), realSite, repoGit)).toEqual([])
  })

  it('every term source exists', () => {
    expect(glassboxTermProblems(terms, (path) => existsSync(join(root, path)))).toEqual([])
  })
})
