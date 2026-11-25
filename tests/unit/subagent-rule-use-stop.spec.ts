// The SubagentStop rating check (#3633; rationale in
// `scripts/hooks/subagent-rule-use-stop.ts`).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { stopReason } from '../../scripts/hooks/subagent-rule-use-stop.ts'

const loaded = (rule: string) => ({ type: 'attachment', attachment: { type: 'nested_memory', path: `/repo/.claude/rules/${rule}` } })
const bash = (command: string) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command } }] } })

let n = 0
function payload(records: unknown[], extra: object = {}) {
  const id = `a${process.pid}-${n++}`
  const dir = mkdtempSync(join(tmpdir(), 'subagent-stop-'))
  mkdirSync(join(dir, 'session', 'subagents'), { recursive: true })
  const all = [{ type: 'user', cwd: '/repo', message: { content: 'go' } }, ...records]
  writeFileSync(join(dir, 'session', 'subagents', `agent-${id}.jsonl`), all.map((r) => JSON.stringify(r)).join('\n'))
  return { transcript_path: join(dir, 'session.jsonl'), agent_id: id, ...extra }
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
  it('blocks each agent 3 times, with no stop_hook_active, then releases', () => {
    const p = payload([rule])
    for (let i = 0; i < 3; i++) expect(stopReason(p)).toContain('adr-0003.md')
    expect(stopReason(p)).toBeNull()
  })
  it('releases once a bare call or a full named call lands, however many blocks came before', () => {
    for (const call of ['echo rule-use:', 'echo rule-use: rule:adr-0003.md=steered']) {
      const p = payload([rule])
      expect(stopReason(p)).toContain('adr-0003.md')
      expect(stopReason(p)).toContain('adr-0003.md')
      writeFileSync(join(p.transcript_path.replace('session.jsonl', ''), 'session', 'subagents', `agent-${p.agent_id}.jsonl`),
        [{ type: 'user', cwd: '/repo', message: { content: 'go' } }, rule, bash(call)].map((r) => JSON.stringify(r)).join('\n'))
      expect(stopReason(p)).toBeNull()
    }
  })
  it('blocks on a start-loaded rule too', () => {
    const start = { type: 'attachment', attachment: { type: 'instructions', files: [{ path: '/repo/.claude/rules/adr-0004.md' }] } }
    expect(stopReason(payload([start]))).toContain('adr-0004.md')
  })
  it('passes a re-entered stop, a payload without agent_id and a missing transcript', () => {
    expect(stopReason(payload([rule], { stop_hook_active: true }))).toBeNull()
    expect(stopReason({ ...payload([rule]), agent_id: undefined })).toBeNull()
    expect(stopReason({ transcript_path: '/nope/x.jsonl', agent_id: 'a1' })).toBeNull()
  })
})
