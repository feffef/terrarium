// The SubagentStop rating check (#3633; rationale in
// `scripts/hooks/subagent-rule-use-stop.ts`).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { stopReason } from '../../scripts/hooks/subagent-rule-use-stop.ts'

const loaded = (rule: string) => ({ type: 'attachment', attachment: { type: 'nested_memory', path: `/repo/.claude/rules/${rule}` } })
const bash = (command: string) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command } }] } })

function payload(records: unknown[], extra: object = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'subagent-stop-'))
  mkdirSync(join(dir, 'session', 'subagents'), { recursive: true })
  const all = [{ type: 'user', cwd: '/repo', message: { content: 'go' } }, ...records]
  writeFileSync(join(dir, 'session', 'subagents', 'agent-a1.jsonl'), all.map((r) => JSON.stringify(r)).join('\n'))
  return { transcript_path: join(dir, 'session.jsonl'), agent_id: 'a1', ...extra }
}

describe('stopReason()', () => {
  const rule = loaded('adr-0003.md')
  it('blocks while a loaded rule has no rating, naming it', () => {
    expect(stopReason(payload([rule]))).toContain('.claude/rules/adr-0003.md')
    expect(stopReason(payload([rule, bash('echo rule-use: rule:adr-0027.md=steered')]))).toContain('adr-0003.md')
  })
  it('passes a rated rule, an explicit none-applies and an agent with no rules', () => {
    expect(stopReason(payload([rule, bash('echo rule-use: rule:adr-0003.md=steered')]))).toBeNull()
    expect(stopReason(payload([rule, bash('echo rule-use:')]))).toBeNull()
    expect(stopReason(payload([]))).toBeNull()
  })
  it('passes a re-entered stop, the main agent and a missing transcript', () => {
    expect(stopReason(payload([rule], { stop_hook_active: true }))).toBeNull()
    expect(stopReason({ ...payload([rule]), agent_id: undefined })).toBeNull()
    expect(stopReason({ transcript_path: '/nope/x.jsonl', agent_id: 'a1' })).toBeNull()
  })
})
