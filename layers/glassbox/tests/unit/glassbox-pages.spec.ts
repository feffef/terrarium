import { existsSync, globSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { splitFrontmatter } from '../../../../scripts/validate-content.ts'
import { root } from '../../../../shared/expand.ts'
import glassbox from '../../tenant.config.ts'
import { glassboxStories } from '../../app/utils/subjects.ts'
import { glassboxCites, glassboxJournalRoutes, glassboxPageProblems, glassboxSitePath, glassboxTermProblems, glassboxTerms, repoGit, type GlassboxGit, type GlassboxSite } from '../../page-checks.ts'

const rev = 'a'.repeat(40)
const expandTs = [
  'import { resolve } from "node:path"',
  '',
  'export function catalogFrom(cols) {',
  '  const out = {}',
  '  for (const col of cols) out[col.key] = col',
  '  return out',
  '}',
].join('\n')
const files: Record<string, string | string[]> = {
  'shared/expand.ts': `${expandTs}\n`,
  'layers/': ['blog', 'glassbox'],
  'docs/adr/': ['0004-objective-safety-gate.md'],
  'docs/adr/0004-objective-safety-gate.md': '# ADR-0004\n',
}
const commits: Record<string, { date: string; onMain: boolean }> = {
  [rev]: { date: '2026-10-14T23:03:14+00:00', onMain: true },
  ['b'.repeat(40)]: { date: '2026-10-14T01:00:00+00:00', onMain: false },
}
const fakeGit: GlassboxGit = {
  commit: (r) => commits[r],
  read: (r, path) => (r === rev ? files[path] : undefined),
}
const site: GlassboxSite = {
  pages: ['/t/glassbox/guide', '/t/glassbox/guide/nuxt-content/collections', '/t/glassbox/guide/terrarium-practice/gate', '/t/glassbox/guide/walkthroughs/from-file-to-browser', '/t/glassbox/drafts/zod/timestamps'],
  journal: ['/t/journal/current', '/t/journal/current/how-it-works', '/t/journal/current/skills'],
  terms: ['collection'],
  cites: { '/t/glassbox/guide/nuxt-content/collections': ['shared/expand.ts'] },
  titles: { '/t/glassbox/guide': 'Home', '/t/glassbox/guide/nuxt-content/collections': 'Collections', '/t/glassbox/guide/terrarium-practice/gate': 'The Gate', '/t/glassbox/drafts/zod/timestamps': 'Timestamps' },
}

const frontmatter = `---\ntitle: T\ndescription: D\nrevision: '${rev}'\nrevisionDate: '2026-10-14'\n---\n`
const lesson = `${frontmatter}
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

- **A shared check.** Agents write most changes, so a check every PR must pass keeps mistakes off \`main\`. ADR-0004 (:file[docs/adr/0004-objective-safety-gate.md]).
- **One expansion step.** One expansion step turns a manifest into Collections, so a Tenant never writes them by hand. :file[shared/expand.ts].

### What to watch for

See ADR-0004, [how it works](/t/journal/current/how-it-works) and [the Skills](/t/journal/current/skills).
Inline code shows syntax: \`ADR-9999\`, \`[x](/t/journal/nope)\`.

Issues like https://github.com/feffef/terrarium/issues/1985 are fine.

## Try it in your project

\`\`\`ts
// an example, not an Excerpt: never checked
see github.com/feffef/terrarium/blob/main/x.ts and ADR-9999
\`\`\`

## Where next

- [The Gate](/t/glassbox/guide/terrarium-practice/gate)
`
const gateItem = '- [The Gate](/t/glassbox/guide/terrarium-practice/gate)\n'
const journalItem = '- [How it works](/t/journal/current/how-it-works)\n'
const walkthrough = `${frontmatter}
How a page opens.

## 1. The request arrives

It reaches the router. The router picks a page.

::stop-links
[Collections](/t/glassbox/guide/nuxt-content/collections)
::

## 2. The page renders

The page reads \`shared/expand.ts\`, e.g. its keys, under "New here? Start. Go!". Then it renders.

\`\`\`ts
return \`out\`. // Not. A. Sentence.
\`\`\`

::stop-links
:file[shared/expand.ts]
::

## Where next

- [Home](/t/glassbox/guide)
`

const problemsOf = (file: string, source: string, space = 'guide') => glassboxPageProblems(file, source, site, fakeGit, space)

describe('glassboxPageProblems on fixture pages', () => {
  it('passes a good Lesson, House rules Lesson, Walkthrough and landing page', () => {
    expect(problemsOf('nuxt-content/01.collections.md', lesson)).toEqual([])
    expect(problemsOf('terrarium-practice/01.gate.md', lesson.replace(/^Full reference.*$/m, ''))).toEqual([])
    expect(problemsOf('walkthroughs/from-file-to-browser.md', walkthrough)).toEqual([])
    expect(problemsOf('index.md', `${frontmatter}\nWelcome.\n`)).toEqual([])
  })

  it.each([
    ['revision not on main', (s: string) => s.replace(rev, 'b'.repeat(40)), 'is not on main'],
    ['revisionDate off its commit', (s: string) => s.replace("'2026-10-14'", "'2026-10-13'"), 'is not the revision\'s date 2026-10-14'],
    ['a :file path missing at revision', (s: string) => s.replace(':file[layers/]', ':file[nowhere/]'), 'nowhere/ does not exist'],
    ['an ::excerpt path missing at revision', (s: string) => s.replace('path="shared/expand.ts"', 'path="shared/gone.ts"'), 'shared/gone.ts does not exist'],
    ['a lines range past the file end', (s: string) => s.replace('{lines="3-7"}', '{lines="3-8"}'), 'lines 3-8 do not fit its 7 lines'],
    ['an Excerpt not word for word', (s: string) => s.replace('  return out', '  return outs'), 'Excerpt of shared/expand.ts is not in the file'],
    ['an Excerpt outside its lines', (s: string) => s.replace('lines="3-7"}\n```', 'lines="1-5"}\n```'), 'Excerpt of shared/expand.ts is not in the file'],
    // Excerpt.vue numbers lines from both ends of `lines`, so the Excerpt must reach both.
    ['an Excerpt that starts after its lines start', (s: string) => s.replace('lines="3-7"}\n```', 'lines="2-7"}\n```'), 'Excerpt of shared/expand.ts is not in the file'],
    ['an Excerpt that ends before its lines end', (s: string) => s.replace('  return out\n}\n```', '  return out\n```'), 'Excerpt of shared/expand.ts is not in the file'],
    ['an Excerpt with no gap shorter than its lines', (s: string) => s.replace('  // …\n  return out\n}', '  const out = {}'), 'Excerpt of shared/expand.ts is not in the file'],
    ['an Excerpt out of order across a gap', (s: string) => s.replace('  // …\n  return out', '  return out\n  // …\n  const out = {}'), 'Excerpt of shared/expand.ts is not in the file'],
    // Excerpt.vue can't number a run between two gaps.
    ['an Excerpt with one range and two gaps', (s: string) => s.replace('  // …\n  return out', '  // …\n  for (const col of cols) out[col.key] = col\n  // …\n  return out'), 'has 2 gaps: give lines one range per run'],
    ['an Excerpt run off its range', (s: string) => s.replace('  // …\n  return out', '  // …\n  for (const col of cols) out[col.key] = col\n  // …\n  return out').replace('lines="3-7"}\n```', 'lines="3,4,6-7"}\n```'), 'does not match its ranges 3,4,6-7'],
    ['an Excerpt with fewer ranges than runs', (s: string) => s.replace('  // …\n  return out', '  // …\n  for (const col of cols) out[col.key] = col\n  // …\n  return out').replace('lines="3-7"}\n```', 'lines="3,6-7"}\n```'), 'does not match its ranges 3,6-7'],
    ['an Excerpt with ranges that open on a gap', (s: string) => s.replace('  // …\n  return out', '  // …\n  for (const col of cols) out[col.key] = col\n  // …\n  return out').replace('lines="3-7"}\n```ts\n', 'lines="3,5,6-7"}\n```ts\n  // …\n'), 'opens with a gap or has two in a row'],
    ['an Excerpt with ranges and two gaps in a row', (s: string) => s.replace('  // …\n  return out', '  // …\n  for (const col of cols) out[col.key] = col\n  // …\n  return out').replace('lines="3-7"}\n```', 'lines="3,5,6-7"}\n```').replace('  // …\n  return out', '  // …\n  // …\n  return out'), 'opens with a gap or has two in a row'],
    ['overlapping ranges', (s: string) => s.replace('  // …\n  return out', '  // …\n  for (const col of cols) out[col.key] = col\n  // …\n  return out').replace('lines="3-7"}\n```', 'lines="3,3-5,6-7"}\n```'), 'does not match its ranges 3,3-5,6-7'],
    ['descending ranges', (s: string) => s.replace('  // …\n  return out', '  // …\n  for (const col of cols) out[col.key] = col\n  // …\n  return out').replace('lines="3-7"}\n```', 'lines="6-7,5,3"}\n```'), 'does not match its ranges 6-7,5,3'],
    ['malformed lines', (s: string) => s.replace('{lines="3-7"}, one', '{lines="3,,5"}, one'), 'lines="3,,5" is not one or more'],
    ['lines with inner spaces', (s: string) => s.replace('{lines="3-7"}, one', '{lines=" 3 - 5"}, one'), 'lines=" 3 - 5" is not one or more'],
    ['a Why bullet whose ADR number is not its file', (s: string) => s.replace('ADR-0004 (:file[docs/adr/0004', 'ADR-0026 (:file[docs/adr/0004'), 'cites an ADR by another ADR\'s file'],
    ['a Why bullet naming an ADR bare', (s: string) => s.replace('keeps mistakes off', 'per ADR-0004 keeps mistakes off'), 'cites an ADR not as'],
    ['a Why bullet that only links its reason', (s: string) => s.replace(/- \*\*One expansion step\.\*\*[^\n]*/, '- **One expansion step.** The expansion: :file[shared/expand.ts].'), 'words of its own, not 12-65'],
    ['a Why bullet too long to stay short', (s: string) => s.replace('turns a manifest', 'turns a manifest'.concat(' word'.repeat(80))), 'words of its own, not 12-65'],
    ['a Why paragraph that is not a bullet', (s: string) => s.replace('- **One expansion step.** ', '\n'), 'not a bullet that opens with a bold lead-in'],
    ['a Why bullet with no bold lead-in', (s: string) => s.replace('**One expansion step.** ', ''), 'not a bullet that opens with a bold lead-in'],
    ['an ADR missing at revision', (s: string) => s.replace('ADR-0004', 'ADR-0099'), 'ADR-0099 does not exist'],
    ['a guide link to no page', (s: string) => s.replace('terrarium-practice/gate', 'terrarium-practice/gates'), 'link /t/glassbox/guide/terrarium-practice/gates resolves to no page'],
    ['a Journal link to no content file', (s: string) => s.replace('current/how-it-works', 'current/made-up'), 'link /t/journal/current/made-up resolves to no page'],
    ['a Lesson with no Full reference', (s: string) => s.replace('(https://content', '(http://content'), 'no "Full reference" https link'],
    ['a Lesson section heading at h3', (s: string) => s.replace('## Try it', '### Try it'), 'no h2 #try-it-in-your-project'],
    ['Lesson sections out of order', (s: string) => s.replace(/(## Try it[^#]*)(## Where next[^]*)$/, '$2\n$1'), 'section #where-next is out of order'],
    ['a reworded Lesson heading', (s: string) => s.replace('### What to watch for', '### Watch for'), 'no h3 #what-to-watch-for'],
    ['a ::stop-links block on a Lesson', (s: string) => `${s}\n::stop-links\n[Home](/t/glassbox/guide)\n::\n`, '1 ::stop-links block(s) sit outside a Walkthrough stop'],
    ['a :term with no entry', (s: string) => s.replace(':term[Collection]', ':term[Space]'), ':term space has no entry'],
    ['a hand-written blob link', (s: string) => `${s}\n[x](https://github.com/feffef/terrarium/blob/${rev}/shared/expand.ts)\n`, 'hand-written link'],
    ['a Why bullet citing an ADR file without its number', (s: string) => s.replace(':file[shared/expand.ts].', ':file[docs/adr/0004-objective-safety-gate.md].'), 'cites an ADR not as'],
    ['a hand-written tree link', (s: string) => `${s}\nhttps://github.com/feffef/terrarium/tree/main/layers\n`, 'hand-written link'],
    ['a Where next over 5 pages', (s: string) => `${s}${gateItem.repeat(5)}`, 'Where next lists 6 pages, more than 5'],
    ['a Journal page before a Lesson in Where next', (s: string) => s.replace(gateItem, `${journalItem}${gateItem}`), 'Where next lists a Journal page before its end'],
    ['two Journal pages in Where next', (s: string) => `${s}${journalItem}${journalItem}`, 'Where next lists a Journal page before its end'],
  ])('fails %s', (_name, broken, message) => {
    expect(problemsOf('nuxt-content/01.collections.md', broken(lesson)).join('\n')).toContain(message)
  })

  it.each([
    ['no stops', (s: string) => s.replace(/## \d\. /g, '## '), 'no "## N. Title" stops'],
    ['a stop with no ::stop-links block', (s: string) => s.replace('::stop-links\n:file[shared/expand.ts]\n::', ''), 'stop "2. The page renders" has 0 ::stop-links blocks'],
    ['a stop with two ::stop-links blocks', (s: string) => s.replace('It reaches the router.', '::stop-links\n[A](/t/glassbox/guide)\n::'), 'stop "1. The request arrives" has 2'],
    ['a ::stop-links block before stop 1', (s: string) => s.replace('How a page opens.', 'How a page opens.\n\n::stop-links\n[Home](/t/glassbox/guide)\n::'), '1 ::stop-links block(s) sit outside a Walkthrough stop'],
    ['a ::stop-links block in A real case', (s: string) => s.replace('## Where next', '## A real case\n\n::stop-links\n[Home](/t/glassbox/guide)\n::\n\n## Where next'), '1 ::stop-links block(s) sit outside'],
    ['a stop whose ::stop-links holds only a :term', (s: string) => s.replace(':file[shared/expand.ts]', ':term[Collection]'), 'stop "2. The page renders" links nothing'],
    ['a stop whose ::stop-links links nothing', (s: string) => s.replace(':file[shared/expand.ts]', 'Nothing.'), 'stop "2. The page renders" links nothing'],
    ['a Where next over 5 pages', (s: string) => `${s}${gateItem.repeat(5)}`, 'Where next lists 6 pages, more than 5'],
    ['a Journal page before a Lesson in Where next', (s: string) => `${s}${journalItem}${gateItem}`, 'Where next lists a Journal page before its end'],
    ['a stop with over 5 chips', (s: string) => s.replace(':file[shared/expand.ts]\n', `${Array(6).fill(':file[layers/]').join(' · ')}\n`), 'stop "2. The page renders" has 6 chips, more than 5'],
    ['a stop of one sentence', (s: string) => s.replace(' The router picks a page.', ''), 'stop "1. The request arrives" has 1 sentence(s), not 2 to 4'],
    ['a stop of five sentences', (s: string) => s.replace('Then it renders.', 'Then it renders. It ends! Done? Yes.'), 'stop "2. The page renders" has 5 sentence(s), not 2 to 4'],
    ['a stop :file a linked Lesson cites', (s: string) => s.replace('(/t/glassbox/guide/nuxt-content/collections)', '$& · :file[shared/expand.ts]'), 'stop "1. The request arrives" repeats shared/expand.ts, which /t/glassbox/guide/nuxt-content/collections cites'],
  ])('fails a Walkthrough with %s', (_name, broken, message) => {
    expect(problemsOf('walkthroughs/from-file-to-browser.md', broken(walkthrough)).join('\n')).toContain(message)
  })

  it.each([
    ['a folder outside the Subject map', 'nuxt/01.collections.md', 'folder nuxt/ is not in the Subject map'],
    ['a Lesson with no two-digit prefix', 'nuxt-content/collections.md', 'no two-digit prefix'],
    ['a one-digit prefix', 'nuxt-content/1.collections.md', 'no two-digit prefix'],
    ['a page outside any folder', 'collections.md', 'outside a Subject folder'],
  ])('fails %s', (_name, file, message) => {
    expect(problemsOf(file, lesson).join('\n')).toContain(message)
  })

  it('fails a guide page linking into drafts, and passes a draft linking either way', () => {
    const toDraft = lesson.replace(gateItem, `${gateItem}- [Timestamps](/t/glassbox/drafts/zod/timestamps)\n`)
    expect(problemsOf('nuxt-content/01.collections.md', toDraft)).toEqual(['guide page links outside the guide: /t/glassbox/drafts/zod/timestamps'])
    expect(problemsOf('nuxt-content/01.collections.md', toDraft, 'drafts')).toEqual([])
    expect(problemsOf('nuxt-content/01.collections.md', toDraft.replace('zod/timestamps', 'zod/gone'), 'drafts')).toEqual(['link /t/glassbox/drafts/zod/gone resolves to no page'])
  })

  it.each([
    ['a Lesson title over 28 chars', 'nuxt-content/01.collections.md', lesson, 'title', 29, 'title "xxxxxxxxxxxxxxxxxxxxxxxxxxxxx" is 29 chars, more than 28'],
    ['a Lesson description over 120 chars', 'nuxt-content/01.collections.md', lesson, 'description', 121, 'is 121 chars, more than 120'],
    ['a Walkthrough title over 36 chars', 'walkthroughs/from-file-to-browser.md', walkthrough, 'title', 37, 'is 37 chars, more than 36'],
    ['a Walkthrough description over 140 chars', 'walkthroughs/from-file-to-browser.md', walkthrough, 'description', 141, 'is 141 chars, more than 140'],
  ])('fails %s in the guide, not in drafts', (_name, file, page, field, length, message) => {
    const long = page.replace(field === 'title' ? 'title: T' : 'description: D', `${field}: ${'x'.repeat(length)}`)
    expect(problemsOf(file, long).join('\n')).toContain(message)
    expect(problemsOf(file, page.replace(field === 'title' ? 'title: T' : 'description: D', `${field}: ${'x'.repeat(length - 1)}`))).toEqual([])
    expect(problemsOf(file, long, 'drafts').join('\n')).not.toContain('chars, more than')
  })

  it('fails guide link text that is not its target\'s title, unless it starts lowercase, and passes it in drafts', () => {
    const stale = lesson.replace('[The Gate](', '[The Old Gate](')
    expect(problemsOf('nuxt-content/01.collections.md', stale)).toEqual(['link text "The Old Gate" is not the title "The Gate" of /t/glassbox/guide/terrarium-practice/gate'])
    expect(problemsOf('nuxt-content/01.collections.md', stale, 'drafts')).toEqual([])
    expect(problemsOf('nuxt-content/01.collections.md', lesson.replace('[The Gate](', '[the gate step]('))).toEqual([])
  })

  it('passes a Where next of 5 pages ending in one Journal page', () => {
    expect(problemsOf('nuxt-content/01.collections.md', `${lesson}${gateItem.repeat(3)}${journalItem}`)).toEqual([])
  })

  it('passes an Excerpt with one range per run', () => {
    const multi = lesson.replace('  // …\n  return out', '  // …\n  for (const col of cols) out[col.key] = col\n  // …\n  return out').replace('lines="3-7"}\n```', 'lines="3,5,6-7"}\n```')
    expect(problemsOf('nuxt-content/01.collections.md', multi)).toEqual([])
  })

  it('passes an Excerpt with no lines anywhere in its file', () => {
    const anywhere = lesson.replace('path="shared/expand.ts" lines="3-7"}', 'path="shared/expand.ts"}').replace('  // …\n  return out\n}', '  const out = {}')
    expect(problemsOf('nuxt-content/01.collections.md', anywhere)).toEqual([])
  })

  it('skips the git checks where the clone lacks the revision, and still checks the rest', () => {
    const shallow = lesson.replaceAll(rev, 'c'.repeat(40)).replace('See ADR-0004', 'See ADR-0099').replace('terrarium-practice/gate', 'nowhere')
    expect(problemsOf('nuxt-content/01.collections.md', shallow)).toEqual(['link /t/glassbox/guide/nowhere resolves to no page'])
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
  const content = join(root, 'layers/glassbox/content')
  const spaces = glassbox.spaces
  const read = (space: string, file: string) => readFileSync(join(content, space, 'pages', file), 'utf8')
  const files = Object.fromEntries(spaces.map((space) => [space, globSync('**/*.md', { cwd: join(content, space, 'pages') }).sort()]))
  const pages = spaces.flatMap((space) => files[space]!.map((file) => ({ space, file })))
  const terms = glassboxTerms()
  const realSite: GlassboxSite = {
    pages: pages.map(({ space, file }) => glassboxSitePath(space, file)),
    journal: glassboxJournalRoutes(),
    terms: Object.keys(terms),
    cites: Object.assign({}, ...spaces.map((space) => glassboxCites(Object.fromEntries(files[space]!.map((file) => [file, read(space, file)])), space))),
    titles: Object.fromEntries(pages.map(({ space, file }) => [glassboxSitePath(space, file), String(splitFrontmatter(read(space, file)).frontmatter.title)])),
  }

  it('reaches Journal content pages and the Journal\'s own Vue routes', () => {
    expect(realSite.journal).toEqual(expect.arrayContaining(['/t/journal/current', '/t/journal/current/how-it-works', '/t/journal/archived/skills']))
  })

  it('finds the landing page and a draft (canary: the walk must not match nothing)', () => {
    expect(files.guide).toContain('index.md')
    expect(files.drafts!.length).toBeGreaterThan(0)
  })

  it.each(pages.map(({ space, file }) => [`${space}/${file}`, space, file]))('%s', (_name, space, file) => {
    expect(glassboxPageProblems(file, read(space, file), realSite, repoGit, space)).toEqual([])
  })

  it('finds every landing story in the guide', () => {
    expect(glassboxStories.map(({ path }) => glassboxSitePath('guide', `${path.slice(1)}.md`)).filter((path) => !realSite.pages.includes(path))).toEqual([])
  })

  it('reads the drafts Space\'s terms through its link to the guide\'s', () => {
    expect(globSync('*.yml', { cwd: join(content, 'drafts/terms') }).sort()).toEqual(globSync('*.yml', { cwd: join(content, 'guide/terms') }).sort())
  })

  it('every term source exists', () => {
    expect(glassboxTermProblems(terms, (path) => existsSync(join(root, path)))).toEqual([])
  })
})
