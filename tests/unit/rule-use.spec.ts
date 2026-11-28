// The `ruleUse` derivation (#3009): per agent, which rules loaded and why, and
// what the agent reported. Driven through the trace seam: transcripts and the
// rule-load ledger in, the stitched session log out.
import { describe, expect, it } from 'vitest'
import { extractTrace, foldSubagentTrace, stitch, type AuthoredScratch } from '../../scripts/session/transcript-trace.ts'
import { governsLine, unratedRules, type RuleLoadRow } from '../../scripts/session/rule-use.ts'
import { validateEntry } from '../../scripts/session/journal-files.ts'

const NO_ENV = {}
const cwd = { type: 'user', cwd: '/repo', sessionId: 'session_01RU', timestamp: '2026-11-09T10:00:00Z', message: { content: 'go' } }
const native = (rule: string) => ({ type: 'attachment', attachment: { type: 'nested_memory', path: `/repo/.claude/rules/${rule}` } })
const hinted = (rule: string) => ({
  type: 'attachment',
  attachment: { type: 'hook_additional_context', content: [`Files this command read are governed by these rules:\n\nContents of .claude/rules/${rule}:\n\n# x`] },
})
const always = (rule: string) => ({ type: 'attachment', attachment: { type: 'instructions', files: [{ path: `/repo/.claude/rules/${rule}` }] } })
const bash = (command: string) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command } }] } })
const authored = (extra: Partial<AuthoredScratch> = {}): AuthoredScratch => ({
  session: 'session_01RU', goal: 'g', status: 'completed', outcome: 'o', summary: 's', frictions: [], ...extra,
})
type Entry = { by: string; answered: boolean; loads: { rule: string; via: string; trigger?: string }[]; reported: { path: string; value?: string; why?: string }[] }
const ruleUseOf = (entry: Record<string, unknown>) => entry.ruleUse as Entry[]

describe('ruleUse — the main agent', () => {
  it('lists its start and path-scoped loads with the ledger trigger, and what it authored as reported', () => {
    const trace = extractTrace([cwd, always('adr-0003.md'), native('adr-0004.md'), hinted('adr-0025.md')], NO_ENV)
    const ledger: RuleLoadRow[] = [{ rule: '.claude/rules/adr-0004.md', trigger: 'scripts/gate/gate.ts' }]
    const folded = foldSubagentTrace(trace, [], NO_ENV, undefined, ledger)
    const entry = stitch(authored({ reported: [{ path: '.claude/rules/adr-0004.md', value: 'steered', why: 'ran the gate first' }] }), folded)
    expect(ruleUseOf(entry)).toEqual([{
      by: 'main',
      answered: true,
      loads: [
        { rule: '.claude/rules/adr-0003.md', via: 'start' },
        { rule: '.claude/rules/adr-0004.md', via: 'native', trigger: 'scripts/gate/gate.ts' },
        { rule: '.claude/rules/adr-0025.md', via: 'hint' },
      ],
      reported: [{ path: '.claude/rules/adr-0004.md', value: 'steered', why: 'ran the gate first' }],
    }])
    expect(validateEntry(entry).ok).toBe(true)
  })

  it('records a rule loaded both ways as native, with its trigger, whichever came first', () => {
    const ledger: RuleLoadRow[] = [{ rule: '.claude/rules/adr-0004.md', trigger: 'x.ts' }]
    for (const records of [[cwd, hinted('adr-0004.md'), native('adr-0004.md')], [cwd, native('adr-0004.md'), hinted('adr-0004.md')]]) {
      const folded = foldSubagentTrace(extractTrace(records, NO_ENV), [], NO_ENV, undefined, ledger)
      expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.loads).toEqual([{ rule: '.claude/rules/adr-0004.md', via: 'native', trigger: 'x.ts' }])
    }
  })

  it('gives a hint-only load no trigger: a hint hook fires no ledger row', () => {
    const folded = foldSubagentTrace(extractTrace([cwd, hinted('adr-0004.md')], NO_ENV), [], NO_ENV, undefined, [{ rule: '.claude/rules/adr-0004.md', trigger: 'x.ts' }])
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.loads).toEqual([{ rule: '.claude/rules/adr-0004.md', via: 'hint' }])
  })

  it("matches the main agent's rule named without .md to its load", () => {
    const trace = extractTrace([cwd, native('adr-0004.md')], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [{ path: '.claude/rules/adr-0004', value: 'steered' }] }), trace))[0]!.reported)
      .toEqual([{ path: '.claude/rules/adr-0004.md', value: 'steered' }])
  })

  it('records an empty reported list as answered, and a missing one (the dropped-scratch placeholder) as unanswered', () => {
    const trace = extractTrace([cwd, native('adr-0004.md')], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), trace))[0]).toMatchObject({ answered: true, reported: [] })
    expect(ruleUseOf(stitch(authored(), trace))[0]).toMatchObject({ answered: false, reported: [] })
  })

  it('leaves the field out when no agent loaded or named anything', () => {
    expect(stitch(authored({ reported: [] }), extractTrace([cwd], NO_ENV))).not.toHaveProperty('ruleUse')
  })

  it('marks a named rule this agent never loaded, keeping its why, and keeps an always-loaded one', () => {
    const trace = extractTrace([cwd, always('adr-0003.md'), native('adr-0004.md')], NO_ENV)
    const reported = [{ path: '.claude/rules/adr-0003.md', value: 'steered' as const }, { path: '.claude/rules/adr-0012.md', value: 'steered' as const, why: 'pingbacks' }, { path: 'docs/agents/pr-workflow.md' }]
    expect(ruleUseOf(stitch(authored({ reported }), trace))[0]!.reported).toEqual([
      { path: '.claude/rules/adr-0003.md', value: 'steered' },
      { path: '.claude/rules/adr-0012.md', value: 'steered', why: '(no load recorded) pingbacks' },
      { path: 'docs/agents/pr-workflow.md' },
    ])
  })
})

describe('ruleUse — subagents', () => {
  const main = extractTrace([cwd], NO_ENV)
  const sub = (records: Record<string, unknown>[], agentId = 'a1', type = 'general-purpose') =>
    ({ records: [cwd, ...records], agent: { type, task: 't' }, agentId })

  it('records a subagent\'s loads with the ledger trigger and no rating', () => {
    const records = [always('adr-0003.md'), native('adr-0004.md'), native('adr-0017.md'),
      // A leftover echo from an older session is no answer any more (#3741).
      bash('echo rule-use: rule:adr-0004.md=steered')]
    const ledger: RuleLoadRow[] = [
      { rule: '.claude/rules/adr-0004.md', trigger: 'CLAUDE.md' }, // the main agent's: no agentId
      { rule: '.claude/rules/adr-0004.md', trigger: 'scripts/gate/gate.ts', agentId: 'a1' },
    ]
    const folded = foldSubagentTrace(main, [sub(records)], NO_ENV, undefined, ledger)
    const entry = stitch(authored({ reported: [] }), folded)
    expect(ruleUseOf(entry)[0]).toEqual({
      by: 'general-purpose',
      subagent: 0,
      answered: false,
      loads: [
        { rule: '.claude/rules/adr-0003.md', via: 'start' },
        { rule: '.claude/rules/adr-0004.md', via: 'native', trigger: 'scripts/gate/gate.ts' },
        { rule: '.claude/rules/adr-0017.md', via: 'native' },
      ],
      reported: [],
    })
    expect(validateEntry(entry).ok).toBe(true)
  })

  it('does not mark a rule the main agent read directly as unloaded', () => {
    const read = { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/repo/.claude/rules/glassbox-content.md' } }] } }
    const folded = foldSubagentTrace(main, [sub([read])], NO_ENV)
    const byMain = ruleUseOf(stitch(authored({ reported: [{ path: '.claude/rules/glassbox-content.md', value: 'steered' }] }), folded))[0]!
    expect(byMain).toMatchObject({ by: 'main', reported: [{ path: '.claude/rules/glassbox-content.md', value: 'steered', why: '(no load recorded)' }] })
    const own = extractTrace([cwd, read], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [{ path: '.claude/rules/glassbox-content.md', value: 'steered' }] }), own))[0]!.reported)
      .toEqual([{ path: '.claude/rules/glassbox-content.md', value: 'steered' }])
  })

  it('refuses a value that needs a word without one, and the retired backed, in a log', () => {
    const entry = (reported: unknown[]) => ({ ...stitch(authored({ reported: [] }), extractTrace([cwd], NO_ENV)), ruleUse: [{ by: 'main', answered: true, loads: [], reported }] })
    expect(validateEntry(entry([{ path: '.claude/rules/a.md', value: 'missed', why: 'late: edited first' }])).ok).toBe(true)
    expect(validateEntry(entry([{ path: '.claude/rules/a.md', value: 'missed' }])).ok).toBe(false)
    expect(validateEntry(entry([{ path: '.claude/rules/a.md', value: 'duplicate', why: 'a friend said so' }])).ok).toBe(false)
    expect(validateEntry(entry([{ path: '.claude/rules/a.md', value: 'backed' }])).ok).toBe(true) // old logs stay valid
  })

  it('still validates an old subagent entry that carries ratings', () => {
    const old = { ...stitch(authored({ reported: [] }), extractTrace([cwd], NO_ENV)),
      ruleUse: [{ by: 'Explore', subagent: 0, answered: true, loads: [{ rule: '.claude/rules/adr-0004.md', via: 'native' }], reported: [{ path: '.claude/rules/adr-0004.md', value: 'steered' }] }],
      subagents: [{ type: 'Explore', task: 't' }] }
    expect(validateEntry(old).ok).toBe(true)
  })

  it('counts a rule the agent read as a file as loaded, unless it loaded otherwise', () => {
    const read = (rule: string) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: `/repo/.claude/rules/${rule}` } }] } })
    const folded = foldSubagentTrace(main, [sub([read('glassbox-content.md'), read('adr-0004.md'), native('adr-0004.md'), always('adr-0003.md'), read('adr-0003.md')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.loads).toEqual([
      { rule: '.claude/rules/adr-0003.md', via: 'start' },
      { rule: '.claude/rules/adr-0004.md', via: 'native' },
      { rule: '.claude/rules/glassbox-content.md', via: 'read' },
    ])
  })

  it('leaves out a subagent that loaded nothing, whatever it ran', () => {
    const folded = foldSubagentTrace(main, [sub([bash('echo rule-use:')])], NO_ENV)
    expect(stitch(authored({ reported: [] }), folded)).not.toHaveProperty('ruleUse')
  })

  it("never gives a subagent with no agent id the main agent's triggers", () => {
    const folded = foldSubagentTrace(main, [{ records: [cwd, native('adr-0004.md')], agent: { type: 'Explore' } }], NO_ENV, undefined,
      [{ rule: '.claude/rules/adr-0004.md', trigger: 'main.ts' }])
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.loads).toEqual([{ rule: '.claude/rules/adr-0004.md', via: 'native' }])
  })

  it('points each subagent entry at its subagents[] row, in that order', () => {
    const dispatch = (id: string, description: string) =>
      ({ type: 'assistant', message: { content: [{ type: 'tool_use', id, name: 'Agent', input: { subagent_type: 'general-purpose', description } }] } })
    // `tu-lost` left no transcript but keeps its row in subagents[].
    const parent = extractTrace([cwd, dispatch('tu-review', 'review'), dispatch('tu-lost', 'lost'), dispatch('tu-build', 'build')], NO_ENV)
    // Transcripts sort by agent id, not dispatch order (#3019).
    const folded = foldSubagentTrace(parent, [
      { ...sub([native('adr-0004.md')], 'a1'), toolUseId: 'tu-build' },
      { ...sub([native('adr-0027.md')], 'a2'), toolUseId: 'tu-review' },
      sub([native('adr-0012.md')], 'w1', 'workflow-agent'),
    ], NO_ENV)
    const entry = stitch(authored({ reported: [] }), folded)
    const subagents = entry.subagents as { task: string }[]
    const joined = (entry.ruleUse as (Entry & { subagent?: number })[]).map((e) => [subagents[e.subagent!]!.task, e.loads.map((l) => l.rule)])
    expect(joined).toEqual([['review', ['.claude/rules/adr-0027.md']], ['build', ['.claude/rules/adr-0004.md']], ['t', ['.claude/rules/adr-0012.md']]])
    expect(validateEntry(entry).ok).toBe(true)
  })

  it('no longer writes rulesLoaded or rulesLoadedBySubagents', () => {
    const parent = extractTrace([cwd, native('adr-0012.md')], NO_ENV)
    const entry = stitch(authored({ reported: [] }), foldSubagentTrace(parent, [sub([native('adr-0004.md')])], NO_ENV))
    expect(entry).not.toHaveProperty('rulesLoaded')
    expect(entry).not.toHaveProperty('rulesLoadedBySubagents')
  })

  it('counts a workflow agent with no type as `workflow`', () => {
    const folded = foldSubagentTrace(main, [{ records: [cwd, native('adr-0004.md')], agent: { task: 'triage #1' }, agentId: 'w1' }], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.by).toBe('workflow')
  })
})

describe('governsLine()', () => {
  it('prints the hand-written line for a rule that has one, else where the rule loads, else nothing', () => {
    expect(governsLine('.claude/rules/adr-0004.md')).toMatch(/^governs running gate:scoped/)
    expect(governsLine('.claude/rules/mermaid-lanes.md')).toBe('loads on layers/glassbox/content/guide/pages/walkthroughs/**')
    expect(governsLine('.claude/rules/adr-0099.md')).toBeUndefined()
  })
})

describe('unratedRules — the --author completeness check (#3508)', () => {
  const loads = [
    { rule: '.claude/rules/adr-0003.md', via: 'start' as const },
    { rule: '.claude/rules/adr-0004.md', via: 'native' as const },
  ]
  it('names each loaded rule with no rating', () => {
    expect(unratedRules(loads, [{ path: '/repo/.claude/rules/adr-0003.md' }])).toEqual(['.claude/rules/adr-0004.md'])
    expect(unratedRules(loads, undefined)).toEqual(['.claude/rules/adr-0003.md', '.claude/rules/adr-0004.md'])
  })
  it('accepts every rule rated, an explicit none, or nothing loaded', () => {
    expect(unratedRules(loads, loads.map((l) => ({ path: l.rule })))).toEqual([])
    expect(unratedRules(loads, [])).toEqual([])
    expect(unratedRules([], undefined)).toEqual([])
  })
})
