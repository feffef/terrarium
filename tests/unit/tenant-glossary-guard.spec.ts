// Coverage for the tenant-glossary guard (issue #3234; contract in
// `scripts/hooks/tenant-glossary-guard.ts`).
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { glossaryFor, readInFull } from '../../scripts/hooks/tenant-glossary-guard.ts'
import { runTsx } from '../support/run-script.ts'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const DOC = 'layers/journal/GLOSSARY.md'
const text = readFileSync(join(repo, DOC), 'utf8')
const toolUse = (id: string, name: string, input: object) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } })
const toolResult = (id: string, content: string) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content }] } })
const start = { type: 'user', cwd: repo, message: { content: 'hi' } }

describe('glossaryFor()', () => {
  it('names the Tenant glossary for a layer file, absolute or relative', () => {
    expect(glossaryFor(`${repo}/layers/blog/content/a.md`)).toBe('layers/blog/GLOSSARY.md')
    expect(glossaryFor('layers/blog/tenant.config.ts')).toBe('layers/blog/GLOSSARY.md')
  })
  it('exempts the glossary itself and paths outside a layer', () => {
    for (const p of ['layers/blog/GLOSSARY.md', 'GLOSSARY.md', 'docs/layers.md', 'app/layers/x', undefined, 3]) expect(glossaryFor(p), String(p)).toBeNull()
  })
})

describe('readInFull()', () => {
  const cases: [string, Record<string, unknown>[], boolean][] = [
    ['empty', [start], false],
    ['another glossary', [start, toolUse('r', 'Read', { file_path: `${repo}/layers/blog/GLOSSARY.md` })], false],
    ['partial read', [start, toolUse('r', 'Read', { file_path: `${repo}/${DOC}`, limit: 20 })], false],
    ['offset read', [start, toolUse('r', 'Read', { file_path: `${repo}/${DOC}`, offset: 5 })], false],
    ['grep', [start, toolUse('b', 'Bash', { command: `grep -n term ${DOC}` }), toolResult('b', '3:term')], false],
    ['full read', [start, toolUse('r', 'Read', { file_path: `${repo}/${DOC}` })], true],
    ['shell cat', [start, toolUse('b', 'Bash', { command: `cat ${DOC}` }), toolResult('b', text)], true],
  ]
  it.each(cases)('%s', (_n, records, expected) => {
    expect(readInFull(records, DOC, text)).toBe(expected)
  })
})

describe('the hook entry', () => {
  const dir = mkdtempSync(join(tmpdir(), 'tenant-glossary-'))
  const path = (name: string, records: unknown[]) => (writeFileSync(join(dir, name), records.map((r) => JSON.stringify(r)).join('\n')), join(dir, name))
  const run = (extra: object, file = `${repo}/layers/journal/x.ts`) => runTsx('scripts/hooks/tenant-glossary-guard.ts', { input: JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: file }, ...extra }) })

  it('denies with the glossary to read, and allows once it is read', () => {
    const denied = JSON.parse(run({ transcript_path: path('e.jsonl', [start]) })).hookSpecificOutput
    expect(denied.permissionDecision).toBe('deny')
    expect(denied.permissionDecisionReason).toContain(DOC)
    expect(run({ transcript_path: path('r.jsonl', [start, toolUse('r', 'Read', { file_path: `${repo}/${DOC}` })]) })).toBe('')
  })

  it('fails open: no or unreadable transcript, the glossary itself, a non-layer file, a missing glossary', () => {
    expect(run({})).toBe('')
    expect(run({ transcript_path: join(dir, 'nope.jsonl') })).toBe('')
    const t = path('e2.jsonl', [start])
    expect(run({ transcript_path: t }, `${repo}/${DOC}`)).toBe('')
    expect(run({ transcript_path: t }, `${repo}/docs/a.md`)).toBe('')
    expect(run({ transcript_path: t }, `${repo}/layers/no-such-tenant/a.md`)).toBe('')
  })

  it('checks a subagent against its own transcript, and allows when that is missing', () => {
    const parent = path('p.jsonl', [start, toolUse('r', 'Read', { file_path: `${repo}/${DOC}` })])
    mkdirSync(join(dir, 'p', 'subagents'), { recursive: true })
    expect(run({ transcript_path: parent, agent_id: 'a1' })).toBe('')
    writeFileSync(join(dir, 'p', 'subagents', 'agent-a1.jsonl'), JSON.stringify(start))
    expect(JSON.parse(run({ transcript_path: parent, agent_id: 'a1' })).hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('--dry-run reports the decision', () => {
    const input = JSON.stringify({ tool_name: 'Write', tool_input: { file_path: `${repo}/layers/journal/x.ts` }, transcript_path: path('d.jsonl', [start]) })
    expect(runTsx('scripts/hooks/tenant-glossary-guard.ts', { args: ['--dry-run', '--input', input] })).toContain('deny')
  })
})
