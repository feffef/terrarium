// The bare helped.sh call's answer (#3020): each agent's own rules and what
// each value means, read from its own transcript.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { askFor } from '../../scripts/hooks/helped-ask.ts'

const always = (rule: string) => ({ type: 'attachment', attachment: { type: 'instructions', files: [{ path: `/repo/.claude/rules/${rule}` }] } })
const native = (rule: string) => ({ type: 'attachment', attachment: { type: 'nested_memory', path: `/repo/.claude/rules/${rule}` } })
const jsonl = (records: unknown[]) => [{ type: 'user', cwd: '/repo', message: { content: 'go' } }, ...records].map((r) => JSON.stringify(r)).join('\n')

function transcripts(main: unknown[], agent: unknown[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'helped-ask-'))
  writeFileSync(join(dir, 'session.jsonl'), jsonl(main))
  mkdirSync(join(dir, 'session', 'subagents'), { recursive: true })
  writeFileSync(join(dir, 'session', 'subagents', 'agent-a1.jsonl'), jsonl(agent))
  return join(dir, 'session.jsonl')
}
const payload = (command: string, transcript_path: string, agent_id?: string) =>
  ({ tool_name: 'Bash', tool_input: { command }, transcript_path, ...(agent_id && { agent_id }) })

describe('askFor()', () => {
  const path = transcripts([always('adr-0003.md'), native('adr-0012.md')], [always('adr-0003.md'), native('adr-0027.md')])

  it("lists a subagent's own rules, start-loaded ones marked, with what each value means", () => {
    const ask = askFor(payload('sh /repo/scripts/session/helped.sh', path, 'a1'))!
    expect(ask).toContain('  .claude/rules/adr-0003.md (loaded at start)\n  .claude/rules/adr-0027.md\n')
    expect(ask).not.toContain('adr-0012')
    expect(ask).toContain('steered  you did, avoided or decided something differently because of it.')
    expect(ask).toContain('lowers its share')
  })

  it("reads the main agent's transcript when the payload names no agent", () => {
    expect(askFor(payload('sh /repo/scripts/session/helped.sh', path))).toContain('.claude/rules/adr-0012.md')
  })

  it('stays silent on a call that names something, and on other commands', () => {
    expect(askFor(payload('sh /repo/scripts/session/helped.sh rule:adr-0027.md=backed', path, 'a1'))).toBeNull()
    expect(askFor(payload('cat /repo/scripts/session/helped.sh', path, 'a1'))).toBeNull()
  })
})
