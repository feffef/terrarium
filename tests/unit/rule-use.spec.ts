// The `ruleUse` derivation (#3009): per agent, which rules loaded and why, and
// what the agent reported. Driven through the trace seam: transcripts and the
// rule-load ledger in, the stitched session log out.
import { describe, expect, it } from 'vitest'
import { extractTrace, foldSubagentTrace, stitch, type AuthoredScratch } from '../../scripts/session/transcript-trace.ts'
import { reportedNames, subagentNote, type RuleLoadRow } from '../../scripts/session/rule-use.ts'
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
type Entry = { by: string; answered: boolean; loads: { rule: string; via: string; trigger?: string }[]; reported: { path: string; why?: string }[] }
const ruleUseOf = (entry: Record<string, unknown>) => entry.ruleUse as Entry[]

describe('ruleUse — the main agent', () => {
  it('lists its path-scoped loads with the ledger trigger, and what it authored as reported', () => {
    const trace = extractTrace([cwd, always('adr-0003.md'), native('adr-0004.md'), hinted('adr-0025.md')], NO_ENV)
    const ledger: RuleLoadRow[] = [{ rule: '.claude/rules/adr-0004.md', trigger: 'scripts/gate/gate.ts' }]
    const folded = foldSubagentTrace(trace, [], NO_ENV, undefined, ledger)
    const entry = stitch(authored({ reported: [{ path: '.claude/rules/adr-0004.md', why: 'ran the gate first' }] }), folded)
    expect(ruleUseOf(entry)).toEqual([{
      by: 'main',
      answered: true,
      loads: [
        { rule: '.claude/rules/adr-0004.md', via: 'native', trigger: 'scripts/gate/gate.ts' },
        { rule: '.claude/rules/adr-0025.md', via: 'hint' },
      ],
      reported: [{ path: '.claude/rules/adr-0004.md', why: 'ran the gate first' }],
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
    expect(ruleUseOf(stitch(authored({ reported: [{ path: '.claude/rules/adr-0004' }] }), trace))[0]!.reported).toEqual([{ path: '.claude/rules/adr-0004.md' }])
  })

  it('records an empty reported list as answered, and a missing one (the dropped-scratch placeholder) as unanswered', () => {
    const trace = extractTrace([cwd, native('adr-0004.md')], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), trace))[0]).toMatchObject({ answered: true, reported: [] })
    expect(ruleUseOf(stitch(authored(), trace))[0]).toMatchObject({ answered: false, reported: [] })
  })

  it('leaves the field out when no agent loaded or named anything', () => {
    expect(stitch(authored({ reported: [] }), extractTrace([cwd, always('adr-0003.md')], NO_ENV))).not.toHaveProperty('ruleUse')
  })

  it('marks a named rule this agent never loaded, keeping its why, and drops an always-loaded one', () => {
    const trace = extractTrace([cwd, always('adr-0003.md'), native('adr-0004.md')], NO_ENV)
    const reported = [{ path: '.claude/rules/adr-0003.md' }, { path: '.claude/rules/adr-0012.md', why: 'pingbacks' }, { path: 'docs/agents/pr-workflow.md' }]
    expect(ruleUseOf(stitch(authored({ reported }), trace))[0]!.reported).toEqual([
      { path: '.claude/rules/adr-0012.md', why: '(no load recorded) pingbacks' },
      { path: 'docs/agents/pr-workflow.md' },
    ])
  })
})

describe('reportedNames() — what a helped.sh call reported', () => {
  const S = 'sh /repo/scripts/session/helped.sh'
  const names = (args: string) => reportedNames([`${S} ${args}`], (p) => p)?.map((e) => e.path)
  it('normalises rule names, with or without .md', () => {
    expect(names('rule:adr-0004 rule:adr-0005.md doc:docs/a.md')).toEqual(['.claude/rules/adr-0004.md', '.claude/rules/adr-0005.md', 'docs/a.md'])
  })
  it('drops redirections, flags, a literal none and separating commas', () => {
    expect(names('-v rule:a.md, doc:docs/b.md > /dev/null 2>&1')).toEqual(['.claude/rules/a.md', 'docs/b.md'])
    expect(names('rule:a.md >>log')).toEqual(['.claude/rules/a.md'])
    expect(names('none')).toEqual([])
  })
  it('splits one quoted argument holding several names', () => {
    expect(names("'rule:a.md doc:docs/b.md'")).toEqual(['.claude/rules/a.md', 'docs/b.md'])
  })
  it('drops every redirection form with its target, and NONE in any case', () => {
    expect(names('rule:x.md &> log doc:docs/a.md &>>log2 2> err NONE')).toEqual(['.claude/rules/x.md', 'docs/a.md'])
  })
  it('folds a .MD extension to .md, and keeps a name before an unspaced redirect', () => {
    expect(names('rule:adr-0004.MD')).toEqual(['.claude/rules/adr-0004.md'])
    expect(names('rule:a>out rule:b.md>/dev/null 2>err rule:')).toEqual(['.claude/rules/a.md', '.claude/rules/b.md'])
    expect(names('rule:adr-0004>out doc:docs/a2>>log 2>&1')).toEqual(['.claude/rules/adr-0004.md', 'docs/a2'])
  })
  it('reads a rule value after the last =, in any case; unknown is unsure, missing stays absent, a doc takes none', () => {
    expect(reportedNames([`${S} rule:a.md=changed rule:b=CONFIRMED, rule:c=yes rule:d doc:docs/x.md=changed rule:e.md=none rule:f=x=Unsure`], (p) => p)).toEqual([
      { path: '.claude/rules/a.md', value: 'changed' },
      { path: '.claude/rules/b.md', value: 'confirmed' },
      { path: '.claude/rules/c.md', value: 'unsure' },
      { path: '.claude/rules/d.md' },
      { path: 'docs/x.md' },
      { path: '.claude/rules/e.md', value: 'none' },
      { path: '.claude/rules/f=x.md', value: 'unsure' },
    ])
  })
  it('finds a call inside bash -c or -lc, and after shell flags', () => {
    expect(reportedNames([`bash -c "${S} rule:a.md"`], (p) => p)?.map((e) => e.path)).toEqual(['.claude/rules/a.md'])
    expect(reportedNames([`bash -lc "${S} rule:a.md"`], (p) => p)?.map((e) => e.path)).toEqual(['.claude/rules/a.md'])
    expect(reportedNames(['sh -x /repo/scripts/session/helped.sh rule:a.md'], (p) => p)?.map((e) => e.path)).toEqual(['.claude/rules/a.md'])
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
    const entry = stitch(authored({ reported: [] }), folded)
    expect(ruleUseOf(entry)[0]).toEqual({
      by: 'general-purpose',
      answered: true,
      loads: [
        { rule: '.claude/rules/adr-0004.md', via: 'native', trigger: 'scripts/gate/gate.ts' },
        { rule: '.claude/rules/adr-0017.md', via: 'native' },
      ],
      reported: [
        { path: '.claude/rules/adr-0004.md' },
        { path: 'docs/agents/pr-workflow.md' },
        { path: '.claude/rules/adr-0099.md', why: '(no load recorded)' },
      ],
    })
    expect(validateEntry(entry).ok).toBe(true)
  })

  it('keeps the values a subagent reported', () => {
    const folded = foldSubagentTrace(main, [sub([note, native('adr-0004.md'), bash('sh /repo/scripts/session/helped.sh rule:adr-0004.md=confirmed rule:adr-0099=changed')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.reported).toEqual([
      { path: '.claude/rules/adr-0004.md', value: 'confirmed' },
      { path: '.claude/rules/adr-0099.md', value: 'changed', why: '(no load recorded)' },
    ])
  })

  it('records "nothing to report" (a bare call) apart from silence (no call)', () => {
    const folded = foldSubagentTrace(main, [
      sub([note, native('adr-0004.md'), bash('sh /repo/scripts/session/helped.sh')], 'a1'),
      sub([note, native('adr-0004.md')], 'a2', 'Explore'),
    ], NO_ENV)
    const [none, silent] = ruleUseOf(stitch(authored({ reported: [] }), folded))
    expect(none).toMatchObject({ by: 'general-purpose', answered: true, reported: [] })
    expect(silent).toMatchObject({ by: 'Explore', answered: false, reported: [] })
  })

  it('takes the last call when an agent answers twice', () => {
    const folded = foldSubagentTrace(main, [sub([note, native('adr-0004.md'),
      bash('sh /repo/scripts/session/helped.sh'), bash("sh '/repo/scripts/session/helped.sh' 'rule:adr-0004.md'")])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.reported).toEqual([{ path: '.claude/rules/adr-0004.md' }])
  })

  it('counts only a call that runs helped.sh, not a command that names it', () => {
    const folded = foldSubagentTrace(main, [sub([note, native('adr-0004.md'),
      bash('git diff origin/main -- scripts/session/helped.sh scripts/session/rule-use.ts'), bash('cat /repo/scripts/session/helped.sh')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]).toMatchObject({ answered: false, reported: [] })
    const run = foldSubagentTrace(main, [sub([note, bash('cd /repo && /repo/scripts/session/helped.sh doc:GLOSSARY.md')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), run))[0]).toMatchObject({ answered: true, reported: [{ path: 'GLOSSARY.md' }] })
    const noisy = foldSubagentTrace(main, [sub([note, bash('echo done\n/bin/sh /repo/scripts/session/helped.sh -x doc:GLOSSARY.md 2>&1 >/dev/null\necho bye')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), noisy))[0]).toMatchObject({ answered: true, reported: [{ path: 'GLOSSARY.md' }] })
  })

  it('leaves out a subagent that was never asked and never answered', () => {
    const folded = foldSubagentTrace(main, [sub([native('adr-0004.md')])], NO_ENV)
    expect(stitch(authored({ reported: [] }), folded)).not.toHaveProperty('ruleUse')
  })

  it("never gives a subagent with no agent id the main agent's triggers", () => {
    const folded = foldSubagentTrace(main, [{ records: [cwd, note, native('adr-0004.md')], agent: { type: 'Explore' } }], NO_ENV, undefined,
      [{ rule: '.claude/rules/adr-0004.md', trigger: 'main.ts' }])
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.loads).toEqual([{ rule: '.claude/rules/adr-0004.md', via: 'native' }])
  })

  it('counts a workflow agent with no type as `workflow`', () => {
    const folded = foldSubagentTrace(main, [{ records: [cwd, note], agent: { task: 'triage #1' }, agentId: 'w1' }], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.by).toBe('workflow')
  })
})
