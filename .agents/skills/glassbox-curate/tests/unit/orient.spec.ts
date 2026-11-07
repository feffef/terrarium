import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { subjectPages, orientation, pageOverview, runStem, shortPath, warningLines } from '../../scripts/orient.ts'

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
  it('gives the stem, title and description on one line, and no body', () => {
    expect(pageOverview('claude-code/05.blocking-hooks', page)).toBe('- claude-code/05.blocking-hooks: Blocking hooks. Hooks that refuse a wrong tool call.')
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
    write('workshop/runs/2026-11-07T0900.yml', 'focus: second\n')
    write('workshop/checks/update.yml', 'pages: []\n')
  })
  afterAll(() => rmSync(base, { recursive: true, force: true }))

  const run = (log = (_since: string | undefined) => 'abc1234 a guide commit') =>
    orientation(base, { log, prs: () => '- #1 a PR: layers/glassbox/x.md', now: new Date('2026-11-07T10:05:30Z') })

  it('prints every section in order, runs newest first, pages as one line each, and no terms', () => {
    const seen: (string | undefined)[] = []
    const out = run((since) => (seen.push(since), 'abc1234 a guide commit'))
    expect(out.split('\n').filter((l) => l.startsWith('# '))).toEqual([
      '# Run entry', '# Open PRs that touch Glass Box', '# Memory page', '# Last 5 curate runs, newest first', '# glassbox-update checks', '# Page-check warnings', '# Guide and drafts changes since the last curate run', '# Guide pages',
    ])
    for (const text of ['workshop/runs/2026-11-07T1005.yml', 'focus: "<', '- #1 a PR', 'A lead.', 'focus: first', 'focus: second', 'pages: []', 'abc1234 a guide commit']) expect(out).toContain(text)
    expect(out.indexOf('focus: second')).toBeLessThan(out.indexOf('focus: first'))
    expect(out).toContain('05.blocking-hooks.md ×1')
    expect(out).toContain('- claude-code/05.blocking-hooks: Blocking hooks. Hooks that refuse a wrong tool call.')
    for (const text of ['term: Hook', 'Some instructions keep being missed']) expect(out).not.toContain(text)
    expect(seen).toEqual(['2026-11-07T09:00:00Z'])
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
    expect(out).toContain('# Last 30 guide and drafts changes (no curate run yet)')
  })
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
