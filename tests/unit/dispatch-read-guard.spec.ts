// Coverage for the dispatch-read guard (issue #2543; contract in
// `scripts/hooks/dispatch-read-guard.ts`).
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DOC, shouldDeny } from '../../scripts/hooks/dispatch-read-guard.ts'
import { runTsx } from '../support/run-script.ts'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const toolUse = (id: string, name: string, input: object) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name, input }] } })
const toolResult = (id: string, content: string) => ({ type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: id, content }] } })
const start = { type: 'user', cwd: repo, message: { content: 'hi' } }

// Each transcript, and whether it shows the Skill read or invoked.
const transcripts: [string, Record<string, unknown>[], boolean][] = [
  ['empty', [start], false],
  ['another doc read', [start, toolUse('r', 'Read', { file_path: `${repo}/docs/agents/guards.md` })], false],
  ['another Skill invoked', [start, toolUse('s', 'Skill', { skill: 'tdd' })], false],
  ['Skill invoked', [start, toolUse('s', 'Skill', { skill: 'dispatch-subagents' })], true],
  ['slash command', [start, { type: 'user', message: { content: '<command-name>/dispatch-subagents</command-name>' } }], true],
  ['file read', [start, toolUse('r', 'Read', { file_path: `${repo}/${DOC}` })], true],
  ['shell read', [start, toolUse('b', 'Bash', { command: `cat ${DOC}` }), toolResult('b', readFileSync(join(repo, DOC), 'utf8'))], true],
]

describe('shouldDeny()', () => {
  it('denies exactly a main-session call whose transcript shows the Skill neither invoked nor read', () => {
    for (const [name, records, seen] of transcripts) {
      expect(shouldDeny(undefined, records), name).toBe(!seen)
      expect(shouldDeny('a1', records), `subagent, ${name}`).toBe(false)
    }
  })

  it('lets the call through when the transcript is missing or unreadable', () => {
    expect(shouldDeny(undefined, null)).toBe(false)
  })
})

describe('the hook entry', () => {
  const dir = mkdtempSync(join(tmpdir(), 'dispatch-read-'))
  const run = (extra: object) => runTsx('scripts/hooks/dispatch-read-guard.ts', { input: JSON.stringify({ tool_name: 'Agent', tool_input: { prompt: 'go' }, ...extra }) })

  it('denies with the doc to read, and allows once it is read or the transcript is missing', () => {
    const path = (name: string, records: unknown[]) => (writeFileSync(join(dir, name), records.map((r) => JSON.stringify(r)).join('\n')), join(dir, name))
    const denied = JSON.parse(run({ transcript_path: path('e.jsonl', [start]) })).hookSpecificOutput
    expect(denied.permissionDecision).toBe('deny')
    expect(denied.permissionDecisionReason).toContain(DOC)
    expect(run({ transcript_path: path('r.jsonl', transcripts[5]![1]) })).toBe('')
    expect(run({ transcript_path: join(dir, 'nope.jsonl') })).toBe('')
  })
})
