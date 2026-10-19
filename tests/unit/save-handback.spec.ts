// #2196: save a subagent's final message verbatim instead of retyping it.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { saveHandback } from '../../scripts/session/save-handback.ts'

const dirs: string[] = []
afterEach(() => dirs.splice(0).forEach((d) => rmSync(d, { recursive: true, force: true })))

const rec = (content: unknown[]) => JSON.stringify({ type: 'assistant', message: { role: 'assistant', content } })

it('writes the last assistant text of the named subagent, byte for byte', () => {
  const dir = mkdtempSync(join(tmpdir(), 'handback-'))
  dirs.push(dir)
  const parent = join(dir, 'parent.jsonl')
  const sub = join(dir, 'parent', 'subagents', 'workflows', 'wf_1')
  mkdirSync(sub, { recursive: true })
  const final = '  {"a": "x\\ty"}\n\n- line two é  \n'
  writeFileSync(
    join(sub, 'agent-abc123.jsonl'),
    [
      rec([{ type: 'text', text: 'working' }, { type: 'tool_use', name: 'Bash', input: {} }]),
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'tool result' } }),
      rec([{ type: 'text', text: final }]),
      JSON.stringify({ type: 'attachment' }),
    ].join('\n'),
  )
  writeFileSync(join(sub, 'agent-other.jsonl'), rec([{ type: 'text', text: 'not me' }]))
  const out = join(dir, 'out.md')
  saveHandback(parent, 'abc123', out)
  expect(readFileSync(out, 'utf8')).toBe(final)
})

it('throws when the subagent has no transcript', () => {
  const dir = mkdtempSync(join(tmpdir(), 'handback-'))
  dirs.push(dir)
  expect(() => saveHandback(join(dir, 'parent.jsonl'), 'nope', join(dir, 'o'))).toThrow(/nope/)
})

it('refuses to save while the subagent is mid-run', () => {
  const dir = mkdtempSync(join(tmpdir(), 'handback-'))
  dirs.push(dir)
  const sub = join(dir, 'parent', 'subagents')
  mkdirSync(sub, { recursive: true })
  writeFileSync(
    join(sub, 'agent-run1.jsonl'),
    rec([{ type: 'text', text: 'working' }, { type: 'tool_use', name: 'Bash', input: {} }]),
  )
  expect(() => saveHandback(join(dir, 'parent.jsonl'), 'run1', join(dir, 'o'))).toThrow(/not finished/)
})

// #2262: a subagent's hand-back is a SubagentHandback tool call, not a text turn.
it('saves the message of a final SubagentHandback tool call, byte for byte', () => {
  const dir = mkdtempSync(join(tmpdir(), 'handback-'))
  dirs.push(dir)
  const sub = join(dir, 'parent', 'subagents')
  mkdirSync(sub, { recursive: true })
  const reply = 'PROBE-REPLY line one\nline two'
  writeFileSync(
    join(sub, 'agent-hb1.jsonl'),
    [
      rec([{ type: 'text', text: reply }]),
      JSON.stringify({ type: 'user', message: { role: 'user', content: 'call SubagentHandback' } }),
      rec([
        { type: 'tool_use', id: 'toolu_1', name: 'SubagentHandback', input: { message: reply }, caller: { type: 'direct' } },
      ]),
      JSON.stringify({
        type: 'user',
        message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'delivered' }] },
      }),
    ].join('\n'),
  )
  const out = join(dir, 'out.md')
  saveHandback(join(dir, 'parent.jsonl'), 'hb1', out)
  expect(readFileSync(out, 'utf8')).toBe(reply)
})
