// The bare `echo rule-use:` call's answer (#3020): each agent's own rules and what
// each value means, read from its own transcript.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { askFor } from '../../scripts/hooks/rule-use-ask.ts'

const always = (rule: string) => ({ type: 'attachment', attachment: { type: 'instructions', files: [{ path: `/repo/.claude/rules/${rule}` }] } })
const native = (rule: string) => ({ type: 'attachment', attachment: { type: 'nested_memory', path: `/repo/.claude/rules/${rule}` } })
const jsonl = (records: unknown[]) => [{ type: 'user', cwd: '/repo', message: { content: 'go' } }, ...records].map((r) => JSON.stringify(r)).join('\n')

function transcripts(main: unknown[], agent: unknown[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'rule-use-ask-'))
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
    const ask = askFor(payload('echo rule-use:', path, 'a1'))!
    expect(ask).toContain('  .claude/rules/adr-0003.md (loaded at start)  [governs ')
    expect(ask).toContain('  .claude/rules/adr-0027.md  [loads on ')
    expect(ask).not.toContain('adr-0012')
    expect(ask).toContain('steered    it changed what you did, avoided or decided.')
    for (const value of ['confirmed', 'unrelated', 'missed', 'duplicate', 'in-scope']) expect(ask).toContain(`  ${value} `)
    expect(ask).not.toContain('backed')
    expect(ask).toContain('lowers its share')
  })

  it("reads the main agent's transcript when the payload names no agent", () => {
    expect(askFor(payload('echo rule-use:', path))).toContain('.claude/rules/adr-0012.md')
  })

  it('stays silent on a call that rates every loaded rule, and on other commands', () => {
    expect(askFor(payload('echo rule-use: rule:adr-0003.md=steered rule:adr-0027.md=unrelated', path, 'a1'))).toBeNull()
    expect(askFor(payload('grep -rn rule-use: scripts', path, 'a1'))).toBeNull()
  })

  it('names the loaded rules a call left out, since only the last call counts (#3508)', () => {
    const reply = askFor(payload('echo rule-use: rule:adr-0027.md=steered doc:docs/a.md', path, 'a1'))!
    expect(reply).toContain('Not recorded')
    expect(reply).toContain('.claude/rules/adr-0003.md')
    expect(reply).not.toContain('adr-0027')
    expect(reply).toContain('echo rule-use:')
  })

  it('matches a loaded rule however the call spells it', () => {
    for (const spelling of ['rule:adr-0003=steered', 'rule:adr-0003.md=steered', 'rule:.claude/rules/adr-0003.md=steered']) {
      const reply = askFor(payload(`echo rule-use: ${spelling} rule:adr-0027.md=unrelated`, path, 'a1'))
      expect(reply, spelling).toBeNull()
    }
  })

  it('reads a call split over several lines, and a main agent payload, the same way', () => {
    const multi = 'echo rule-use: \\\n  rule:adr-0027.md=steered \\\n  rule:adr-0003.md=unrelated'
    expect(askFor(payload(multi, path, 'a1'))).toBeNull()
    expect(askFor(payload('echo rule-use: rule:adr-0012.md=steered rule:adr-0003.md=unrelated', path))).toBeNull()
    expect(askFor(payload('echo rule-use: rule:adr-0003.md=steered', path))).toContain('.claude/rules/adr-0012.md')
  })

  it('fails open when the transcript cannot be read', () => {
    expect(askFor(payload('echo rule-use: rule:adr-0027.md=steered', join(tmpdir(), 'no-such-transcript.jsonl'), 'a1'))).toBeNull()
  })

  it('counts a call that names only docs as leaving every loaded rule out', () => {
    const reply = askFor(payload('echo rule-use: doc:docs/a.md', path, 'a1'))!
    expect(reply).toContain('.claude/rules/adr-0003.md')
    expect(reply).toContain('.claude/rules/adr-0027.md')
  })
})

describe('askFor() after the first ask', () => {
  const asked = { type: 'attachment', attachment: { type: 'hook_additional_context', content: ['Rules loaded for you:\n  (none)'] } }
  const path = transcripts([], [native('adr-0027.md'), asked])

  it('stays silent on a later bare call, so "none applies" can end', () => {
    expect(askFor(payload('echo rule-use:', path, 'a1'))).toBeNull()
  })

  it('names the rules a call gave no valid value, whatever came before', () => {
    const reply = askFor(payload('echo rule-use: rule:adr-0027.md=changed rule:adr-0004 doc:docs/a.md rule:adr-0005.md=steered', path, 'a1'))
    expect(reply).toContain('as in =missed:late: .claude/rules/adr-0027.md .claude/rules/adr-0004.md.')
    expect(reply).not.toContain('adr-0005')
  })

  it('names a value that needs its word and has none, and the retired backed', () => {
    const reply = askFor(payload('echo rule-use: rule:adr-0027.md=missed rule:adr-0004.md=backed rule:adr-0005.md=missed:skipped', path, 'a1'))
    expect(reply).toContain('.claude/rules/adr-0027.md .claude/rules/adr-0004.md.')
    expect(reply).not.toContain('adr-0005')
  })
})
