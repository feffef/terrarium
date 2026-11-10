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
    expect(ruleUseOf(stitch(authored({ reported: [{ path: '.claude/rules/adr-0004', value: 'backed' }] }), trace))[0]!.reported)
      .toEqual([{ path: '.claude/rules/adr-0004.md', value: 'backed' }])
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
    const reported = [{ path: '.claude/rules/adr-0003.md', value: 'backed' as const }, { path: '.claude/rules/adr-0012.md', value: 'steered' as const, why: 'pingbacks' }, { path: 'docs/agents/pr-workflow.md' }]
    expect(ruleUseOf(stitch(authored({ reported }), trace))[0]!.reported).toEqual([
      { path: '.claude/rules/adr-0003.md', value: 'backed' },
      { path: '.claude/rules/adr-0012.md', value: 'steered', why: '(no load recorded) pingbacks' },
      { path: 'docs/agents/pr-workflow.md' },
    ])
  })
})

describe('reportedNames() — what a helped.sh call reported', () => {
  const S = 'sh /repo/scripts/session/helped.sh'
  // A rule needs a value to count, so these name-only cases give each one.
  const names = (args: string) => reportedNames([`${S} ${args.replace(/(rule:[^\s,>&']+)/g, '$1=backed')}`], (p) => p)?.map((e) => e.path)
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
  it('reads a rule value after the last =, in any case; drops a rule with no known value; a doc takes none', () => {
    expect(reportedNames([`${S} rule:a.md=steered rule:b=BACKED, rule:c=yes rule:d doc:docs/x.md=steered rule:e.md=changed rule:f=x=Backed`], (p) => p)).toEqual([
      { path: '.claude/rules/a.md', value: 'steered' },
      { path: '.claude/rules/b.md', value: 'backed' },
      { path: 'docs/x.md' },
      { path: '.claude/rules/f=x.md', value: 'backed' },
    ])
  })
  it('treats an empty value as missing, keeps = in a doc path, and keeps an earlier value on a later bare mention', () => {
    expect(reportedNames([`${S} rule:x= rule:y==steered doc:docs/a=b.md rule:z=backed rule:z`], (p) => p)).toEqual([
      { path: '.claude/rules/y.md', value: 'steered' },
      { path: 'docs/a=b.md' },
      { path: '.claude/rules/z.md', value: 'backed' },
    ])
  })
  it('finds a call inside bash -c or -lc, and after shell flags', () => {
    expect(reportedNames([`bash -c "${S} rule:a.md=backed"`], (p) => p)?.map((e) => e.path)).toEqual(['.claude/rules/a.md'])
    expect(reportedNames([`bash -lc "${S} rule:a.md=backed"`], (p) => p)?.map((e) => e.path)).toEqual(['.claude/rules/a.md'])
    expect(reportedNames(['sh -x /repo/scripts/session/helped.sh rule:a.md=backed'], (p) => p)?.map((e) => e.path)).toEqual(['.claude/rules/a.md'])
  })
})

describe('ruleUse — subagents', () => {
  const main = extractTrace([cwd], NO_ENV)
  const sub = (records: Record<string, unknown>[], agentId = 'a1', type = 'general-purpose') =>
    ({ records: [cwd, ...records], agent: { type, task: 't' }, agentId })

  it('recovers a subagent answer from its helped.sh call, normalising the names', () => {
    const records = [note, always('adr-0003.md'), native('adr-0004.md'), native('adr-0017.md'),
      bash('sh /repo/scripts/session/helped.sh rule:adr-0003.md=backed rule:adr-0004.md=steered doc:/repo/docs/agents/pr-workflow.md rule:adr-0099.md=backed')]
    const ledger: RuleLoadRow[] = [
      { rule: '.claude/rules/adr-0004.md', trigger: 'CLAUDE.md' }, // the main agent's: no agentId
      { rule: '.claude/rules/adr-0004.md', trigger: 'scripts/gate/gate.ts', agentId: 'a1' },
    ]
    const folded = foldSubagentTrace(main, [sub(records)], NO_ENV, undefined, ledger)
    const entry = stitch(authored({ reported: [] }), folded)
    expect(ruleUseOf(entry)[0]).toEqual({
      by: 'general-purpose',
      subagent: 0,
      answered: true,
      loads: [
        { rule: '.claude/rules/adr-0003.md', via: 'start' },
        { rule: '.claude/rules/adr-0004.md', via: 'native', trigger: 'scripts/gate/gate.ts' },
        { rule: '.claude/rules/adr-0017.md', via: 'native' },
      ],
      reported: [
        { path: '.claude/rules/adr-0003.md', value: 'backed' },
        { path: '.claude/rules/adr-0004.md', value: 'steered' },
        { path: 'docs/agents/pr-workflow.md' },
        { path: '.claude/rules/adr-0099.md', value: 'backed', why: '(no load recorded)' },
      ],
    })
    expect(validateEntry(entry).ok).toBe(true)
  })

  it('does not mark a rule the agent read directly as unloaded', () => {
    const read = { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/repo/.claude/rules/glassbox-content.md' } }] } }
    const folded = foldSubagentTrace(main, [sub([note, read, bash('sh /repo/scripts/session/helped.sh rule:glassbox-content.md=backed')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.reported).toEqual([{ path: '.claude/rules/glassbox-content.md', value: 'backed' }])
    const byMain = ruleUseOf(stitch(authored({ reported: [{ path: '.claude/rules/glassbox-content.md', value: 'backed' }] }), folded))[0]!
    expect(byMain).toMatchObject({ by: 'main', reported: [{ path: '.claude/rules/glassbox-content.md', value: 'backed', why: '(no load recorded)' }] })
    const own = extractTrace([cwd, read], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [{ path: '.claude/rules/glassbox-content.md', value: 'backed' }] }), own))[0]!.reported)
      .toEqual([{ path: '.claude/rules/glassbox-content.md', value: 'backed' }])
  })

  it('keeps the values a subagent reported', () => {
    const folded = foldSubagentTrace(main, [sub([note, native('adr-0004.md'), bash('sh /repo/scripts/session/helped.sh rule:adr-0004.md=backed rule:adr-0099=steered')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.reported).toEqual([
      { path: '.claude/rules/adr-0004.md', value: 'backed' },
      { path: '.claude/rules/adr-0099.md', value: 'steered', why: '(no load recorded)' },
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

  it('counts a denied call as no answer', () => {
    const call = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu-h', name: 'Bash', input: { command: 'sh /repo/scripts/session/helped.sh' } }] } }
    const denied = { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu-h', is_error: true, content: 'Permission for this action was denied' }] } }
    const folded = foldSubagentTrace(main, [sub([note, native('adr-0004.md'), call, denied])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]).toMatchObject({ answered: false, reported: [] })
  })

  it('takes the last call when an agent answers twice', () => {
    const folded = foldSubagentTrace(main, [sub([note, native('adr-0004.md'),
      bash('sh /repo/scripts/session/helped.sh'), bash("sh '/repo/scripts/session/helped.sh' 'rule:adr-0004.md=backed'")])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.reported).toEqual([{ path: '.claude/rules/adr-0004.md', value: 'backed' }])
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

  it('leaves out a subagent that was never asked, never answered and loaded nothing', () => {
    const folded = foldSubagentTrace(main, [sub([])], NO_ENV)
    expect(stitch(authored({ reported: [] }), folded)).not.toHaveProperty('ruleUse')
  })

  it("never gives a subagent with no agent id the main agent's triggers", () => {
    const folded = foldSubagentTrace(main, [{ records: [cwd, note, native('adr-0004.md')], agent: { type: 'Explore' } }], NO_ENV, undefined,
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
      { ...sub([note, bash('sh /repo/scripts/session/helped.sh')], 'a1'), toolUseId: 'tu-build' },
      { ...sub([note, bash('sh /repo/scripts/session/helped.sh rule:adr-0027.md=backed')], 'a2'), toolUseId: 'tu-review' },
      sub([note], 'w1', 'workflow-agent'),
    ], NO_ENV)
    const entry = stitch(authored({ reported: [] }), folded)
    const subagents = entry.subagents as { task: string }[]
    const joined = (entry.ruleUse as (Entry & { subagent?: number })[]).map((e) => [subagents[e.subagent!]!.task, e.reported.map((r) => r.path)])
    expect(joined).toEqual([['review', ['.claude/rules/adr-0027.md']], ['build', []], ['t', []]])
    expect(validateEntry(entry).ok).toBe(true)
  })

  it('keeps the loads of a subagent that was never asked, as unanswered', () => {
    const folded = foldSubagentTrace(main, [sub([native('adr-0004.md')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))).toEqual([
      { by: 'general-purpose', subagent: 0, answered: false, loads: [{ rule: '.claude/rules/adr-0004.md', via: 'native' }], reported: [] },
    ])
  })

  it('no longer writes rulesLoaded or rulesLoadedBySubagents', () => {
    const parent = extractTrace([cwd, native('adr-0012.md')], NO_ENV)
    const entry = stitch(authored({ reported: [] }), foldSubagentTrace(parent, [sub([note, native('adr-0004.md')])], NO_ENV))
    expect(entry).not.toHaveProperty('rulesLoaded')
    expect(entry).not.toHaveProperty('rulesLoadedBySubagents')
  })

  it('counts a workflow agent with no type as `workflow`', () => {
    const folded = foldSubagentTrace(main, [{ records: [cwd, note], agent: { task: 'triage #1' }, agentId: 'w1' }], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.by).toBe('workflow')
  })
})
