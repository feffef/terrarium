import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { orientation, pageOverview } from '../../scripts/orient.ts'

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
  it('gives the title, description, first paragraph and Where next titles', () => {
    expect(pageOverview('claude-code/05.blocking-hooks', page)).toBe([
      '### claude-code/05.blocking-hooks: Blocking hooks',
      'Hooks that refuse a wrong tool call.',
      '',
      'Some instructions keep being missed. A blocking hook checks instead.',
      '',
      'Where next: Claude Code hooks · Subagents',
    ].join('\n'))
  })

  it('skips a leading component and omits an empty Where next', () => {
    const walkthrough = `---\ntitle: W\ndescription: D\n---\n\n::diagram\n::\n\nThe story starts here.\n\n## 1. First stop\n`
    expect(pageOverview('walkthroughs/w', walkthrough)).toBe('### walkthroughs/w: W\nD\n\nThe story starts here.')
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

  it('prints every section in order, unfiltered, with runs newest first', () => {
    const seen: (string | undefined)[] = []
    const out = orientation(base, (since) => (seen.push(since), 'abc1234 a guide commit'))
    expect(out.split('\n').filter((l) => l.startsWith('# '))).toEqual([
      '# Memory page', '# Curate runs, newest first', '# glassbox-update checks', '# Terms', '# Page-check warnings', '# Guide changes since the last curate run', '# Guide pages',
    ])
    for (const text of ['A lead.', 'focus: first', 'focus: second', 'pages: []', 'term: Hook', '### claude-code/05.blocking-hooks: Blocking hooks']) expect(out).toContain(text)
    expect(out.indexOf('focus: second')).toBeLessThan(out.indexOf('focus: first'))
    expect(out).toContain('may give a motive ("so")')
    expect(out).toContain('abc1234 a guide commit')
    expect(seen).toEqual(['2026-11-07T09:00:00Z'])
  })
})
