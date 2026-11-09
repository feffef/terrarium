// The `ruleUse` derivation (#3009): per agent, which rules loaded and why, and
// what the agent said helped. Driven through the trace seam: transcripts and the
// rule-load ledger in, the stitched session log out.
import { describe, expect, it } from 'vitest'
import { extractTrace, foldSubagentTrace, stitch, type AuthoredScratch } from '../../scripts/session/transcript-trace.ts'
import { subagentNote, type RuleLoadRow } from '../../scripts/session/rule-use.ts'
import { validateEntry } from '../../scripts/session/journal-files.ts'

const NO_ENV = {}
const cwd = { type: 'user', cwd: '/repo', sessionId: 'session_01RU', timestamp: '2026-11-09T10:00:00Z', message: { content: 'go' } }
const native = (rule: string) => ({ type: 'attachment', attachment: { type: 'nested_memory', path: `/repo/.claude/rules/${rule}` } })
const hinted = (rule: string) => ({
  type: 'attachment',
  attachment: { type: 'hook_additional_context', content: [`Files this command read are governed by these rules:\n\nContents of .claude/rules/${rule}:\n\n# x`] },
})
const always = (rule: string) => ({ type: 'attachment', attachment: { type: 'instructions', files: [{ path: `/repo/.claude/rules/${rule}` }] } })
const note = { type: 'attachment', attachment: { type: 'hook_additional_context', hookEvent: 'SubagentStart', content: [subagentNote('/repo')] } }
const bash = (command: string) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command } }] } })
const authored = (extra: Partial<AuthoredScratch> = {}): AuthoredScratch => ({
  session: 'session_01RU', goal: 'g', status: 'completed', outcome: 'o', summary: 's', frictions: [], ...extra,
})
type Entry = { by: string; answered: boolean; loads: { rule: string; via: string; trigger?: string }[]; helped: { path: string; why?: string }[] }
const ruleUseOf = (entry: Record<string, unknown>) => entry.ruleUse as Entry[]

describe('ruleUse — the main agent', () => {
  it('lists its path-scoped loads with the ledger trigger, and what it authored as helped', () => {
    const trace = extractTrace([cwd, always('adr-0003.md'), native('adr-0004.md'), hinted('adr-0025.md')], NO_ENV)
    const ledger: RuleLoadRow[] = [{ rule: '.claude/rules/adr-0004.md', trigger: 'scripts/gate/gate.ts' }]
    const folded = foldSubagentTrace(trace, [], NO_ENV, undefined, ledger)
    const entry = stitch(authored({ helped: [{ path: '.claude/rules/adr-0004.md', why: 'ran the gate first' }] }), folded)
    expect(ruleUseOf(entry)).toEqual([{
      by: 'main',
      answered: true,
      loads: [
        { rule: '.claude/rules/adr-0004.md', via: 'native', trigger: 'scripts/gate/gate.ts' },
        { rule: '.claude/rules/adr-0025.md', via: 'hint' },
      ],
      helped: [{ path: '.claude/rules/adr-0004.md', why: 'ran the gate first' }],
    }])
    expect(validateEntry(entry).ok).toBe(true)
  })

  it('gives a trigger only to a native load: a hint-injected load fires no ledger row', () => {
    const trace = extractTrace([cwd, hinted('adr-0004.md'), native('adr-0004.md')], NO_ENV)
    const folded = foldSubagentTrace(trace, [], NO_ENV, undefined, [{ rule: '.claude/rules/adr-0004.md', trigger: 'x.ts' }])
    expect(ruleUseOf(stitch(authored({ helped: [] }), folded))[0]!.loads).toEqual([{ rule: '.claude/rules/adr-0004.md', via: 'hint' }])
  })

  it('records an empty helped list as answered, and a missing one (the dropped-scratch placeholder) as unanswered', () => {
    const trace = extractTrace([cwd, native('adr-0004.md')], NO_ENV)
    expect(ruleUseOf(stitch(authored({ helped: [] }), trace))[0]).toMatchObject({ answered: true, helped: [] })
    expect(ruleUseOf(stitch(authored(), trace))[0]).toMatchObject({ answered: false, helped: [] })
  })

  it('leaves the field out when no agent loaded or named anything', () => {
    expect(stitch(authored({ helped: [] }), extractTrace([cwd, always('adr-0003.md')], NO_ENV))).not.toHaveProperty('ruleUse')
  })

  it('marks a named rule this agent never loaded, but not an always-loaded one', () => {
    const trace = extractTrace([cwd, always('adr-0003.md'), native('adr-0004.md')], NO_ENV)
    const helped = [{ path: '.claude/rules/adr-0003.md' }, { path: '.claude/rules/adr-0012.md' }, { path: 'docs/agents/pr-workflow.md' }]
    expect(ruleUseOf(stitch(authored({ helped }), trace))[0]!.helped).toEqual([
      { path: '.claude/rules/adr-0003.md' },
      { path: '.claude/rules/adr-0012.md', why: '(no load recorded)' },
      { path: 'docs/agents/pr-workflow.md' },
    ])
  })
})

describe('ruleUse — subagents', () => {
  const main = extractTrace([cwd, always('adr-0003.md')], NO_ENV)
  const sub = (records: Record<string, unknown>[], agentId = 'a1', type = 'general-purpose') =>
    ({ records: [cwd, ...records], agent: { type, task: 't' }, agentId })

  it('recovers a subagent answer from its helped.sh call, normalising the names', () => {
    const records = [note, always('adr-0003.md'), native('adr-0004.md'), native('adr-0017.md'),
      bash('sh /repo/scripts/session/helped.sh rule:adr-0004.md doc:/repo/docs/agents/pr-workflow.md rule:adr-0099.md')]
    const ledger: RuleLoadRow[] = [
      { rule: '.claude/rules/adr-0004.md', trigger: 'CLAUDE.md' }, // the main agent's: no agentId
      { rule: '.claude/rules/adr-0004.md', trigger: 'scripts/gate/gate.ts', agentId: 'a1' },
    ]
    const folded = foldSubagentTrace(main, [sub(records)], NO_ENV, undefined, ledger)
    const entry = stitch(authored({ helped: [] }), folded)
    expect(ruleUseOf(entry)[0]).toEqual({
      by: 'general-purpose',
      answered: true,
      loads: [
        { rule: '.claude/rules/adr-0004.md', via: 'native', trigger: 'scripts/gate/gate.ts' },
        { rule: '.claude/rules/adr-0017.md', via: 'native' },
      ],
      helped: [
        { path: '.claude/rules/adr-0004.md' },
        { path: 'docs/agents/pr-workflow.md' },
        { path: '.claude/rules/adr-0099.md', why: '(no load recorded)' },
      ],
    })
    expect(validateEntry(entry).ok).toBe(true)
  })

  it('records "none helped" (a bare call) apart from silence (no call)', () => {
    const folded = foldSubagentTrace(main, [
      sub([note, native('adr-0004.md'), bash('sh /repo/scripts/session/helped.sh')], 'a1'),
      sub([note, native('adr-0004.md')], 'a2', 'Explore'),
    ], NO_ENV)
    const [none, silent] = ruleUseOf(stitch(authored({ helped: [] }), folded))
    expect(none).toMatchObject({ by: 'general-purpose', answered: true, helped: [] })
    expect(silent).toMatchObject({ by: 'Explore', answered: false, helped: [] })
  })

  it('takes the last call when an agent answers twice', () => {
    const folded = foldSubagentTrace(main, [sub([note, native('adr-0004.md'),
      bash('sh /repo/scripts/session/helped.sh'), bash("sh '/repo/scripts/session/helped.sh' 'rule:adr-0004.md'")])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ helped: [] }), folded))[0]!.helped).toEqual([{ path: '.claude/rules/adr-0004.md' }])
  })

  it('counts only a call that runs helped.sh, not a command that names it', () => {
    const folded = foldSubagentTrace(main, [sub([note, native('adr-0004.md'),
      bash('git diff origin/main -- scripts/session/helped.sh scripts/session/rule-use.ts'), bash('cat /repo/scripts/session/helped.sh')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ helped: [] }), folded))[0]).toMatchObject({ answered: false, helped: [] })
    const run = foldSubagentTrace(main, [sub([note, bash('cd /repo && /repo/scripts/session/helped.sh doc:GLOSSARY.md')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ helped: [] }), run))[0]).toMatchObject({ answered: true, helped: [{ path: 'GLOSSARY.md' }] })
    const noisy = foldSubagentTrace(main, [sub([note, bash('echo done\n/bin/sh /repo/scripts/session/helped.sh -x doc:GLOSSARY.md 2>&1 >/dev/null\necho bye')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ helped: [] }), noisy))[0]).toMatchObject({ answered: true, helped: [{ path: 'GLOSSARY.md' }] })
  })

  it('leaves out a subagent that was never asked and never answered', () => {
    const folded = foldSubagentTrace(main, [sub([native('adr-0004.md')])], NO_ENV)
    expect(stitch(authored({ helped: [] }), folded)).not.toHaveProperty('ruleUse')
  })

  it('counts a workflow agent with no type as `workflow`', () => {
    const folded = foldSubagentTrace(main, [{ records: [cwd, note], agent: { task: 'triage #1' }, agentId: 'w1' }], NO_ENV)
    expect(ruleUseOf(stitch(authored({ helped: [] }), folded))[0]!.by).toBe('workflow')
  })
})
