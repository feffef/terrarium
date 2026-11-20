// The `ruleUse` derivation (#3009): per agent, which rules loaded and why, and
// what the agent reported. Driven through the trace seam: transcripts and the
// rule-load ledger in, the stitched session log out.
import { describe, expect, it } from 'vitest'
import { extractTrace, foldSubagentTrace, stitch, type AuthoredScratch } from '../../scripts/session/transcript-trace.ts'
import { governsLine, reportedNames, ruleUseCall, SUBAGENT_NOTE, unratedRules, type RuleLoadRow } from '../../scripts/session/rule-use.ts'
import { validateEntry } from '../../scripts/session/journal-files.ts'

const NO_ENV = {}
const cwd = { type: 'user', cwd: '/repo', sessionId: 'session_01RU', timestamp: '2026-11-09T10:00:00Z', message: { content: 'go' } }
const native = (rule: string) => ({ type: 'attachment', attachment: { type: 'nested_memory', path: `/repo/.claude/rules/${rule}` } })
const hinted = (rule: string) => ({
  type: 'attachment',
  attachment: { type: 'hook_additional_context', content: [`Files this command read are governed by these rules:\n\nContents of .claude/rules/${rule}:\n\n# x`] },
})
const always = (rule: string) => ({ type: 'attachment', attachment: { type: 'instructions', files: [{ path: `/repo/.claude/rules/${rule}` }] } })
const note = { type: 'attachment', attachment: { type: 'hook_additional_context', hookEvent: 'SubagentStart', content: [SUBAGENT_NOTE] } }
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

describe('reportedNames() — what an echo rule-use: call reported', () => {
  const S = 'echo rule-use:'
  // A rule needs a value to count, so these name-only cases give each one.
  const names = (args: string) => reportedNames([`${S} ${args.replace(/(rule:[^\s,>&']+)/g, '$1=steered')}`], (p) => p)?.map((e) => e.path)
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
    expect(reportedNames([`${S} rule:a.md=steered rule:b=UNRELATED, rule:c=yes rule:d doc:docs/x.md=steered rule:e.md=changed rule:f=x=In-Scope`], (p) => p)).toEqual([
      { path: '.claude/rules/a.md', value: 'steered' },
      { path: '.claude/rules/b.md', value: 'unrelated' },
      { path: 'docs/x.md' },
      { path: '.claude/rules/f=x.md', value: 'in-scope' },
    ])
  })
  it('reads the word after a colon for the values that need one, keeping any detail', () => {
    expect(reportedNames([`${S} rule:a.md=missed:late rule:b.md=duplicate:skill:close-session rule:c.md=confirmed:n/a rule:d.md=CONFIRMED:Agreed doc:docs/x.md=missed:late`], (p) => p)).toEqual([
      { path: '.claude/rules/a.md', value: 'missed', why: 'late:' },
      { path: '.claude/rules/b.md', value: 'duplicate', why: 'skill: close-session' },
      { path: '.claude/rules/c.md', value: 'confirmed', why: 'n/a:' },
      { path: '.claude/rules/d.md', value: 'confirmed', why: 'agreed:' },
      { path: 'docs/x.md' },
    ])
  })
  it('leaves out a value that needs a word and has none or a wrong one, and the retired backed', () => {
    const call = ruleUseCall([`${S} rule:a.md=missed rule:b.md=duplicate:friend rule:c.md=backed rule:d.md=steered:late rule:e.md=in-scope`], (p) => p)!
    expect(call.entries).toEqual([{ path: '.claude/rules/d.md', value: 'steered' }, { path: '.claude/rules/e.md', value: 'in-scope' }])
    expect(call.unvalued).toEqual(['.claude/rules/a.md', '.claude/rules/b.md', '.claude/rules/c.md'])
  })
  it('treats an empty value as missing, keeps = in a doc path, and keeps an earlier value on a later bare mention', () => {
    expect(reportedNames([`${S} rule:x= rule:y==steered doc:docs/a=b.md rule:z=steered rule:z`], (p) => p)).toEqual([
      { path: '.claude/rules/y.md', value: 'steered' },
      { path: 'docs/a=b.md' },
      { path: '.claude/rules/z.md', value: 'steered' },
    ])
  })
  it('finds a call inside bash -c or -lc, quoted or by echo\'s path', () => {
    expect(reportedNames([`bash -c "${S} rule:a.md=steered"`], (p) => p)?.map((e) => e.path)).toEqual(['.claude/rules/a.md'])
    expect(reportedNames([`bash -lc '${S} rule:a.md=steered'`], (p) => p)?.map((e) => e.path)).toEqual(['.claude/rules/a.md'])
    expect(reportedNames(["/bin/echo 'rule-use:' rule:a.md=steered"], (p) => p)?.map((e) => e.path)).toEqual(['.claude/rules/a.md'])
  })
})

describe('ruleUse — subagents', () => {
  const main = extractTrace([cwd], NO_ENV)
  const sub = (records: Record<string, unknown>[], agentId = 'a1', type = 'general-purpose') =>
    ({ records: [cwd, ...records], agent: { type, task: 't' }, agentId })

  it('recovers a subagent answer from its echo rule-use: call, normalising the names', () => {
    const records = [note, always('adr-0003.md'), native('adr-0004.md'), native('adr-0017.md'),
      bash('echo rule-use: rule:adr-0003.md=duplicate:hook rule:adr-0004.md=steered doc:/repo/docs/agents/pr-workflow.md rule:adr-0099.md=unrelated')]
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
        { path: '.claude/rules/adr-0003.md', value: 'duplicate', why: 'hook:' },
        { path: '.claude/rules/adr-0004.md', value: 'steered' },
        { path: 'docs/agents/pr-workflow.md' },
        { path: '.claude/rules/adr-0099.md', value: 'unrelated', why: '(no load recorded)' },
      ],
    })
    expect(validateEntry(entry).ok).toBe(true)
  })

  it('does not mark a rule the agent read directly as unloaded', () => {
    const read = { type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: '/repo/.claude/rules/glassbox-content.md' } }] } }
    const folded = foldSubagentTrace(main, [sub([note, read, bash('echo rule-use: rule:glassbox-content.md=steered')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.reported).toEqual([{ path: '.claude/rules/glassbox-content.md', value: 'steered' }])
    const byMain = ruleUseOf(stitch(authored({ reported: [{ path: '.claude/rules/glassbox-content.md', value: 'steered' }] }), folded))[0]!
    expect(byMain).toMatchObject({ by: 'main', reported: [{ path: '.claude/rules/glassbox-content.md', value: 'steered', why: '(no load recorded)' }] })
    const own = extractTrace([cwd, read], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [{ path: '.claude/rules/glassbox-content.md', value: 'steered' }] }), own))[0]!.reported)
      .toEqual([{ path: '.claude/rules/glassbox-content.md', value: 'steered' }])
  })

  it('keeps the values a subagent reported', () => {
    const folded = foldSubagentTrace(main, [sub([note, native('adr-0004.md'), bash('echo rule-use: rule:adr-0004.md=confirmed:agreed rule:adr-0099=missed:late')])], NO_ENV)
    const entry = stitch(authored({ reported: [] }), folded)
    expect(ruleUseOf(entry)[0]!.reported).toEqual([
      { path: '.claude/rules/adr-0004.md', value: 'confirmed', why: 'agreed:' },
      { path: '.claude/rules/adr-0099.md', value: 'missed', why: '(no load recorded) late:' },
    ])
    expect(validateEntry(entry).ok).toBe(true)
  })

  it('refuses a value that needs a word without one, and the retired backed, in a log', () => {
    const entry = (reported: unknown[]) => ({ ...stitch(authored({ reported: [] }), extractTrace([cwd], NO_ENV)), ruleUse: [{ by: 'main', answered: true, loads: [], reported }] })
    expect(validateEntry(entry([{ path: '.claude/rules/a.md', value: 'missed', why: 'late: edited first' }])).ok).toBe(true)
    expect(validateEntry(entry([{ path: '.claude/rules/a.md', value: 'missed' }])).ok).toBe(false)
    expect(validateEntry(entry([{ path: '.claude/rules/a.md', value: 'duplicate', why: 'a friend said so' }])).ok).toBe(false)
    expect(validateEntry(entry([{ path: '.claude/rules/a.md', value: 'backed' }])).ok).toBe(true) // old logs stay valid
  })

  it('records "nothing to report" (a bare call) apart from silence (no call)', () => {
    const folded = foldSubagentTrace(main, [
      sub([note, native('adr-0004.md'), bash('echo rule-use:')], 'a1'),
      sub([note, native('adr-0004.md')], 'a2', 'Explore'),
    ], NO_ENV)
    const [none, silent] = ruleUseOf(stitch(authored({ reported: [] }), folded))
    expect(none).toMatchObject({ by: 'general-purpose', answered: true, reported: [] })
    expect(silent).toMatchObject({ by: 'Explore', answered: false, reported: [] })
  })

  it('counts a rule the agent read as a file as loaded, unless it loaded otherwise', () => {
    const read = (rule: string) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Read', input: { file_path: `/repo/.claude/rules/${rule}` } }] } })
    const folded = foldSubagentTrace(main, [sub([note, read('glassbox-content.md'), read('adr-0004.md'), native('adr-0004.md'), always('adr-0003.md'), read('adr-0003.md')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.loads).toEqual([
      { rule: '.claude/rules/adr-0003.md', via: 'start' },
      { rule: '.claude/rules/adr-0004.md', via: 'native' },
      { rule: '.claude/rules/glassbox-content.md', via: 'read' },
    ])
  })

  it('counts a denied call as no answer', () => {
    const call = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'tu-h', name: 'Bash', input: { command: 'echo rule-use:' } }] } }
    const denied = { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'tu-h', is_error: true, content: 'Permission for this action was denied' }] } }
    const folded = foldSubagentTrace(main, [sub([note, native('adr-0004.md'), call, denied])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]).toMatchObject({ answered: false, reported: [] })
  })

  it('takes the last call when an agent answers twice', () => {
    const folded = foldSubagentTrace(main, [sub([note, native('adr-0004.md'),
      bash('echo rule-use:'), bash("echo 'rule-use:' 'rule:adr-0004.md=steered'")])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]!.reported).toEqual([{ path: '.claude/rules/adr-0004.md', value: 'steered' }])
  })

  it('counts only an echo of the marker, not a command that names it', () => {
    const folded = foldSubagentTrace(main, [sub([note, native('adr-0004.md'),
      bash('grep -rn "rule-use:" scripts/session'), bash('echo "done; see rule-use: below"')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), folded))[0]).toMatchObject({ answered: false, reported: [] })
    const run = foldSubagentTrace(main, [sub([note, bash('cd /repo && echo rule-use: doc:GLOSSARY.md')])], NO_ENV)
    expect(ruleUseOf(stitch(authored({ reported: [] }), run))[0]).toMatchObject({ answered: true, reported: [{ path: 'GLOSSARY.md' }] })
    const noisy = foldSubagentTrace(main, [sub([note, bash('echo done\necho rule-use: doc:GLOSSARY.md 2>&1 >/dev/null\necho bye')])], NO_ENV)
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
      { ...sub([note, bash('echo rule-use:')], 'a1'), toolUseId: 'tu-build' },
      { ...sub([note, bash('echo rule-use: rule:adr-0027.md=steered')], 'a2'), toolUseId: 'tu-review' },
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

describe('governsLine()', () => {
  it('prints the hand-written line for a rule that has one, else where the rule loads, else nothing', () => {
    expect(governsLine('.claude/rules/adr-0004.md')).toMatch(/^governs running gate:scoped/)
    expect(governsLine('.claude/rules/mermaid-lanes.md')).toBe('loads on layers/*/content/**/*.md')
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
