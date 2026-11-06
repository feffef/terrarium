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
    write('guide/pages/claude-code/05.blocking-hooks.md', page)
    write('guide/terms/hook.yml', 'term: Hook\ndefinition: A command Claude Code runs on an event.\n')
    write('workshop/pages/index.md', '---\ntitle: Workshop\n---\n\n## Memory\n\nA lead.\n')
    write('workshop/runs/2026-11-06T0900.yml', 'focus: first\n')
    write('workshop/runs/2026-11-07T0900.yml', 'focus: second\n')
    write('workshop/checks/update.yml', 'pages: []\n')
  })
  afterAll(() => rmSync(base, { recursive: true, force: true }))

  it('prints every section, with runs newest first and every page summarised', () => {
    const out = orientation(base)
    const at = (text: string) => out.indexOf(text)
    expect(at('# Memory page')).toBeLessThan(at('A lead.'))
    expect(at('focus: second')).toBeLessThan(at('focus: first'))
    expect(out).toContain('pages: []')
    expect(out).toContain('term: Hook')
    expect(out).toContain('# Page-check warnings')
    expect(out).toContain('### claude-code/05.blocking-hooks: Blocking hooks')
  })
})
