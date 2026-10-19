import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { flatten, parsePage } from '../../scripts/flatten.ts'
import { outline } from '../../scripts/outline.ts'
import { logReads, parseSelector, render, search, type Selector } from '../../scripts/search.ts'
import type { FlatLine } from '../../scripts/flat.ts'

const page = (name: string) => parsePage(readFileSync(join(import.meta.dirname, 'fixtures', name), 'utf8'), name)
const { lines, meta } = flatten([page('page-older.txt'), page('page-newer.txt')], 'x')
const run = (args: string[], agent?: string) => search(lines, parseSelector(args), agent)

describe('search', () => {
  it('finds reads by path or glob, and names the paths it did not find', () => {
    const r = run(['reads', 'docs/agents/*.md', 'CLAUDE.md', 'docs/adr/**'])
    expect(r.hits.map((l) => l.tool)).toEqual(['Read', 'Bash'])
    expect(r.missing).toEqual(['docs/adr/**'])
  })

  it('finds tool calls by name and input', () => {
    expect(run(['tool', 'Bash', 'sed']).hits.map((l) => l.n)).toEqual([6])
    expect(run(['tool', 'Read|Grep']).hits).toHaveLength(2)
  })

  it('narrows to one agent', () => {
    expect(run(['tool', 'Grep'], 'parent').missing).toEqual(['tool Grep'])
    expect(run(['tool', 'Grep'], 'agbg1').hits).toHaveLength(1)
  })

  it('lists dispatches and each subagent whose dispatch is out of range once', () => {
    expect(run(['dispatches']).hits.map((l) => l.agent)).toEqual(['parent', 'sub:aorph'])
  })

  it('lists a failed call once, on the call line', () => {
    expect(run(['errors']).hits.map((l) => l.tool)).toEqual(['Grep'])
  })

  it('lists human prompts and the last N events', () => {
    expect(run(['prompts']).hits.map((l) => l.n)).toEqual([1])
    expect(run(['last', '3']).hits.map((l) => l.n)).toEqual([18, 19, 20])
    expect(run(['last', '30']).missing).toEqual(['10 more line(s)'])
  })

  it('rejects an unknown selector', () => {
    expect(() => parseSelector(['everything'])).toThrow(/selectors:/)
  })
})

describe('render', () => {
  const many: FlatLine[] = Array.from({ length: 50 }, (_, i) => ({ n: i + 1, at: '2026-10-19T10:00:00', agent: 'parent', kind: 'assistant', tool: 'Bash', tags: [], target: '', input: 'x'.repeat(400), result: '' }))
  const sel: Selector = { name: 'tool', tool: 'Bash' }

  it('caps the matching lines and points to the full list', () => {
    const out = render(sel, undefined, { hits: many, missing: [] }, meta, null, [], 'full.txt')
    expect(out.length).toBeLessThan(2600)
    expect(out).toContain('more; full list: full.txt')
    expect(out).toMatch(/COVERAGE: .*\nFOUND\nNEXT: done, found$/)
  })

  it('says what is missing and where to fetch next', () => {
    const out = render(sel, undefined, { hits: [], missing: ['tool Bash'] }, { ...meta, reachedStart: false, nextBeforeId: 'abc' }, null, [], 'f')
    expect(out).toMatch(/NOT FOUND: tool Bash\nNEXT: fetch list_events limit 100 before_id=abc$/)
  })
})

describe('logReads', () => {
  it('finds a path among the session log reads and rule loads', () => {
    const log = 'docsRead:\n  - path: GLOSSARY.md\n    reason: x\nrulesLoadedBySubagents:\n  - .claude/rules/adr-0015.md\nskillsUsed:\n  - name: close-session\n'
    expect(logReads(log, ['GLOSSARY.md', 'adr-0015.md', 'close-session/SKILL.md'])).toEqual([
      'GLOSSARY.md in docsRead',
      '.claude/rules/adr-0015.md in rulesLoadedBySubagents',
      '.agents/skills/close-session/SKILL.md in skillsUsed',
    ])
  })
})

describe('outline', () => {
  it('lists each human prompt, then one line per tool call without output', () => {
    const out = outline(lines)
    expect(out[1]).toBe('L1 2026-10-19T10:00:00 PROMPT: Please fix the PR docs')
    expect(out.slice(2).every((l) => l.startsWith('  L'))).toBe(true)
    expect(out).toHaveLength(2 + 6)
    expect(out.join('\n')).not.toContain('Landing a gated PR')
  })
})
