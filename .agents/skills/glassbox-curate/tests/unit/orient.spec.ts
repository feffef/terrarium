import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { guideIndex, guidePath, indexOrientation, subjectPages, orientation, pageOverview, runStem, shortPath, warningLines } from '../../scripts/orient.ts'

const page = `---
title: Blocking hooks
description: Hooks that refuse a wrong tool call.
revision: 'abc'
---

Some instructions keep being missed. A blocking hook checks instead.

Know hooks already? Skip ahead.

## The concept

Body text.

## Where next

- [Claude Code hooks](/t/glassbox/guide/claude-code/hooks)
- [Subagents](/t/glassbox/guide/claude-code/subagents)
`

describe('pageOverview', () => {
  it('gives the stem, title, description and dates on one line, and no body', () => {
    expect(pageOverview('claude-code/05.blocking-hooks', page, {}, { read: '2026-11-06' })).toBe('- claude-code/05.blocking-hooks: Blocking hooks. Hooks that refuse a wrong tool call. [read 2026-11-06 · checked never]')
  })

  it('puts Teaches first, from the frontmatter', () => {
    const taught = page.replace('revision:', 'teaches: "Concept: deny JSON."\nrevision:')
    expect(pageOverview('hooks/20.blocking-hooks', taught).split('\n')[1]).toBe('  Teaches: Concept: deny JSON.')
  })

  it('adds the Why and watch lead-ins, as plain words', () => {
    const lesson = `${page}\n### Why it's built this way\n\n- **A crash blocks.** Text.\n- **Keys from :term[Catalog]{id="catalog"},** text.\n\n### What to watch for\n\n- **The [deny](/x) message is the instruction.** Text.\n- **A shared point.** [Hooks](/t/glassbox/guide/hooks/hooks#why) says why.\n\n## Try it\n\n- **Not a lead-in.** Text.\n`
    expect(pageOverview('hooks/20.blocking-hooks', lesson, { 'hooks/hooks': 'Claude Code hooks' }).split('\n').slice(1)).toEqual([
      "  Why: A crash blocks · Keys from Catalog",
      '  Watch: The deny message is the instruction · A shared point → Claude Code hooks',
    ])
  })

  it("adds a Walkthrough's stops, each with the Lessons it links", () => {
    const walk = `---\ntitle: A walk\ndescription: A story.\n---\n\n## 1. A Collection opts in\n\nText.\n\n::lessons\n[Cross-tenant reads](/t/glassbox/guide/x/y) · :file[a.ts]\n::\n\n## 2. The :term[Catalog] lists it\n\n## Where next\n`
    expect(pageOverview('walkthroughs/a-walk', walk).split('\n')[1]).toBe('  Stops: A Collection opts in [Cross-tenant reads] · The Catalog lists it')
  })
})

describe('orientation', () => {
  let base: string
  beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), 'orient-'))
    const write = (path: string, text: string) => {
      mkdirSync(dirname(join(base, path)), { recursive: true })
      writeFileSync(join(base, path), text)
    }
    write('guide/pages/claude-code/05.blocking-hooks.md', page.replace('## Where next', '## In Terrarium\n\nThe hook runs first, so the agent sees it.\n\n## Where next'))
    write('guide/terms/hook.yml', 'term: Hook\ndefinition: A command Claude Code runs on an event.\n')
    write('workshop/pages/index.md', '---\ntitle: Workshop\n---\n\n## Memory\n\nA lead.\n')
    write('workshop/runs/2026-11-06T0900.yml', 'focus: first\n')
    write('workshop/runs/2026-11-07T0900.yml', 'focus: second\npagesRead:\n  - claude-code/01.old\n')
    write('workshop/checks/update.yml', "pages:\n  - page: claude-code/05.blocking-hooks\n    checked: '2026-11-05'\n")
  })
  afterAll(() => rmSync(base, { recursive: true, force: true }))

  const run = (log = (_since: string | undefined) => 'abc1234 a guide commit') =>
    orientation(base, { log, prs: () => '- #1 a PR: layers/glassbox/x.md', words: () => ['Hook'], now: new Date('2026-11-07T10:05:30Z') })

  it('prints every section in order, runs newest first, pages as one line each, and no terms', () => {
    const seen: (string | undefined)[] = []
    const out = run((since) => (seen.push(since), 'abc1234 a guide commit'))
    expect(out.split('\n').filter((l) => l.startsWith('# '))).toEqual([
      '# Run entry', '# Open PRs that touch Glass Box', '# Memory page (4 of 2,500 words)', '# Last 5 curate runs, newest first', '# Page-check warnings', '# Guide changes since the last curate run', '# Guide pages',
    ])
    for (const text of ['workshop/runs/2026-11-07T1005.yml', 'focus: "<', '- #1 a PR', 'A lead.', 'focus: first', 'focus: second', 'abc1234 a guide commit', 'Read each whole', 'This output: ']) expect(out).toContain(text)
    expect(out.indexOf('focus: second')).toBeLessThan(out.indexOf('focus: first'))
    expect(out).toContain('05.blocking-hooks.md ×1')
    for (const text of ['term: Hook', 'Some instructions keep being missed', 'pagesRead:\n  - claude-code', 'Blocking hooks. Hooks']) expect(out).not.toContain(text)
    expect(seen).toEqual(['2026-11-07T09:00:00Z'])
  })

  it('indexes every page with the dates its runs and checks give, through renames', () => {
    const [out = '', ...rest] = guideIndex(base, () => [['claude-code/01.old', 'claude-code/02.older'], ['claude-code/02.older', 'claude-code/05.blocking-hooks']])
    expect(rest).toEqual([])
    expect(out).toContain('- claude-code/05.blocking-hooks: Blocking hooks. Hooks that refuse a wrong tool call. [read 2026-11-07 · checked 2026-11-05]')
    expect(out.split('\n')[2]).toMatch(/^Each page: /)
  })

  it('splits the index into parts under the cap, each with the key', () => {
    const two = mkdtempSync(join(tmpdir(), 'orient-two-'))
    for (const stem of ['claude-code/05.a', 'claude-code/06.b']) {
      mkdirSync(dirname(join(two, `guide/pages/${stem}.md`)), { recursive: true })
      writeFileSync(join(two, `guide/pages/${stem}.md`), page)
    }
    const parts = guideIndex(two, () => [], 1)
    rmSync(two, { recursive: true, force: true })
    expect(parts).toHaveLength(2)
    expect(parts[1]).toMatch(/^# Guide pages, part 2 of 2\n\nEach page: [\s\S]*- claude-code\/06\.b: Blocking hooks\./)
  })

  it('prints a Subject\'s pages in full with the pagesRead lines they make', () => {
    const out = subjectPages('claude-code', base)
    expect(out).toContain('# claude-code/05.blocking-hooks\n\n---\ntitle: Blocking hooks')
    expect(out).toContain('## The concept\n\nBody text.')
    expect(out).toMatch(/pagesRead:\n {2}- claude-code\/05\.blocking-hooks$/)
    expect(() => subjectPages('nope', base)).toThrow(/no guide pages under "nope"/)
  })

  it('falls back to the last commits before the first run', () => {
    const empty = mkdtempSync(join(tmpdir(), 'orient-empty-'))
    const seen: (string | undefined)[] = []
    const out = orientation(empty, { log: (since) => (seen.push(since), ''), prs: () => '' })
    rmSync(empty, { recursive: true, force: true })
    expect(seen).toEqual([undefined])
    expect(out).toContain('# Last 30 guide changes (no curate run yet)')
  })
})

describe('indexOrientation', () => {
  it('prints only the open PRs and the guide index files', () => {
    const out = indexOrientation([{ path: '.throwaway/glassbox-curate/guide-pages-1.md', bytes: 12_345 }], () => '- #1 a PR: layers/glassbox/x.md')
    expect(out).toBe([
      '# Open PRs that touch Glass Box\n\n- #1 a PR: layers/glassbox/x.md',
      "# Guide pages\n\nEvery page's entry is in these files. Read each whole, one Read per file, never through head:\n- .throwaway/glassbox-curate/guide-pages-1.md (12 KB)",
    ].join('\n\n'))
  })
})

describe('guidePath', () => {
  it('drops the order prefixes', () => expect(guidePath('claude-code/05.blocking-hooks')).toBe('claude-code/blocking-hooks'))
})

describe('runStem', () => {
  it('names the entry by the UTC minute', () => expect(runStem(new Date('2026-11-07T09:04:59Z'))).toBe('2026-11-07T0904'))
})

describe('warningLines', () => {
  it('counts motive warnings per page and keeps the rest in full', () => {
    const motive = 'In Terrarium may give a motive ("so"); check it states mechanism: x'
    expect(warningLines([['a.md', [motive, motive, 'stop "1" has 90 words']], ['b.md', [motive]], ['c.md', []]])).toEqual([
      '- a.md: stop "1" has 90 words',
      '- In Terrarium may give a motive ("so"); check it states mechanism: a.md ×2, b.md ×1',
    ])
  })
})

describe('shortPath', () => {
  it('gives a guide page as its stem and other Glass Box files under the layer', () => {
    expect(shortPath('layers/glassbox/content/guide/pages/git-github/05.attribution.md')).toBe('git-github/05.attribution')
    expect(shortPath('layers/glassbox/content/workshop/checks/update.yml')).toBe('content/workshop/checks/update.yml')
  })
})
