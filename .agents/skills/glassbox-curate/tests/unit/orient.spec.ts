import { describe, expect, it } from 'vitest'
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
  it('holds every section, the memory text and every guide page', () => {
    const out = orientation()
    for (const heading of ['# Memory page', '# Curate runs, newest first', '# glassbox-update checks', '# Terms', '# Page-check warnings', '# Guide pages']) {
      expect(out).toContain(heading)
    }
    expect(out).toContain('## Memory')
    expect(out).toContain('### claude-code/05.blocking-hooks: Blocking hooks')
  })
})
