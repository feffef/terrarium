// Coverage for the ADR read hint (contract in `scripts/hooks/adr-read-hint.ts`).
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { adrsForWrite, LATE_READ_NOTE } from '../../scripts/hooks/adr-read-hint.ts'
import { agentTranscript } from '../../scripts/session/transcript-trace.ts'
import { ADR_HINT_PREFIX, adrHintLine, adrHintsIn, loadRules, ruleAdr, rulePaths } from '../../scripts/lib/adr-rules.ts'
import { runTsx } from '../support/run-script.ts'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const rule = (paths: string[]) => `---\nadr: x\npaths:\n${paths.map((p) => `  - "${p}"`).join('\n')}\n---\nbody\n`
const RULES = [
  { file: 'adr-0004.md', text: '---\nadr: x\n---\nat session start\n' },
  { file: 'adr-0004-human-merge.md', text: rule(['scripts/hooks/**']) },
  { file: 'adr-0021.md', text: rule(['GLOSSARY.md']) },
  { file: 'guards.md', text: rule(['GLOSSARY.md']) },
]
const ADRS = new Map([
  ['0004', 'docs/adr/0004-gate.md'],
  ['0021', 'docs/adr/0021-glossaries.md'],
  ['0029', 'docs/adr/0029-rules.md'],
])
const hits = (file: string, texts: string[] = []) => adrsForWrite(file, texts, RULES, ADRS).map((h) => `${h.adr} ${h.via}`)

describe('adrsForWrite()', () => {
  it('maps every ADR rule whose paths match the file, a topic rule included, and no other rule', () => {
    expect(hits('GLOSSARY.md')).toEqual(['0021 path'])
    expect(hits('scripts/hooks/x.ts')).toEqual(['0004 path'])
    expect(hits('README.md')).toEqual([])
  })

  it('adds each ADR the old or new text names, or the ADR file itself, once and after the path matches', () => {
    expect(hits('GLOSSARY.md', ['see ADR-0004 and ADR-0021', 'ADR-0004 again'])).toEqual([
      '0021 path',
      '0004 text',
    ])
    expect(hits('docs/adr/0029-rules.md')).toEqual(['0029 text'])
    expect(hits('x.md', ['ADR-00045', 'xADR-0004', 'ADR-0029'])).toEqual(['0029 text'])
  })

  it('keeps only ADRs with a file, and skips the text match in Tenant content, session logs and throwaway scripts', () => {
    expect(hits('x.md', ['ADR-0099'])).toEqual([])
    for (const f of ['layers/journal/content/current/sessions/a.yml', '.session-logs/pending.json', '.throwaway/a.ts']) {
      expect(hits(f, ['ADR-0004']), f).toEqual([])
    }
    expect(hits('layers/journal/GLOSSARY.md', ['ADR-0004'])).toEqual(['0004 text'])
  })
})

describe('the pointer line', () => {
  it('parses back to each ADR and how it matched, from pointer lines only', () => {
    const line = adrHintLine([
      { adr: '0021', via: 'path', doc: 'docs/adr/0021-g.md', file: 'GLOSSARY.md' },
      { adr: '0029', via: 'text', doc: 'docs/adr/0029-r.md', file: 'docs/adr/0029-r.md' },
      { adr: '0004', via: 'text', doc: 'docs/adr/0004-g.md', file: 'x.md' },
    ])
    expect(line).toBe('Read in full before you go on: `docs/adr/0021-g.md` (ADR-0021 governs `GLOSSARY.md`); `docs/adr/0029-r.md` (you edit ADR-0029); `docs/adr/0004-g.md` (your edit names ADR-0004).')
    expect(adrHintsIn(`other\n${line}\n${LATE_READ_NOTE}`)).toEqual([{ adr: '0021', via: 'path' }, { adr: '0029', via: 'text' }, { adr: '0004', via: 'text' }])
    expect(adrHintsIn('Read `docs/adr/0021-g.md` (ADR-0021 governs `GLOSSARY.md`)')).toEqual([])
  })
})

describe('agentTranscript()', () => {
  it("finds a depth-1 subagent's and a workflow agent's transcript, else nothing", () => {
    const dir = mkdtempSync(join(tmpdir(), 'adr-hint-agents-'))
    const parent = join(dir, 'p.jsonl')
    for (const p of ['p/subagents/agent-a1.jsonl', 'p/subagents/workflows/wf_1/agent-w1.jsonl']) {
      mkdirSync(dirname(join(dir, p)), { recursive: true })
      writeFileSync(join(dir, p), '')
    }
    expect(agentTranscript(parent, 'a1')).toBe(join(dir, 'p/subagents/agent-a1.jsonl'))
    expect(agentTranscript(parent, 'w1')).toBe(join(dir, 'p/subagents/workflows/wf_1/agent-w1.jsonl'))
    expect(agentTranscript(parent, 'w')).toBeUndefined()
  })
})

describe('the sh pre-filter', () => {
  const sh = readFileSync(join(repo, 'scripts/hooks/adr-read-hint.sh'), 'utf8').replace(/^printf .*adr-read-hint\.ts$/m, 'echo PASS')
  const passes = (tool_input: object) =>
    spawnSync('sh', ['-c', sh], { input: JSON.stringify({ tool_name: 'Edit', tool_input }), encoding: 'utf8' }).stdout.trim() === 'PASS'

  it("passes a file under every ADR rule glob's first segment", () => {
    const globs = loadRules(join(repo, '.claude/rules')).filter((r) => ruleAdr(r.file)).flatMap((r) => rulePaths(r.text))
    expect(globs.length).toBeGreaterThan(0)
    for (const g of globs) expect(passes({ file_path: `/r/${g.replace(/\*+/g, 'x')}` }), g).toBe(true)
  })

  it('passes an edit naming an ADR, and skips one outside every glob', () => {
    expect(passes({ file_path: '/tmp/x.md', new_string: 'see ADR-0004' })).toBe(true)
    expect(passes({ file_path: '/tmp/notes/x.md', new_string: 'nothing' })).toBe(false)
  })
})

describe('the hook entry (sh pre-filter → tsx)', () => {
  const run = (payload: unknown) =>
    spawnSync('sh', ['scripts/hooks/adr-read-hint.sh'], { cwd: repo, input: typeof payload === 'string' ? payload : JSON.stringify(payload), encoding: 'utf8' })
  const dir = mkdtempSync(join(tmpdir(), 'adr-hint-'))
  const transcript = (name: string, records: unknown[]) => {
    const path = join(dir, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, records.map((r) => JSON.stringify(r)).join('\n') + '\n')
    return path
  }
  const start = { type: 'user', cwd: repo, message: { content: 'hi' } }
  const empty = transcript('empty.jsonl', [start])
  const edit = (extra: object = {}, input: object = {}) => ({
    hook_event_name: 'PostToolUse', tool_name: 'Edit', cwd: repo, transcript_path: empty,
    tool_input: { file_path: `${repo}/GLOSSARY.md`, old_string: 'a', new_string: 'b', ...input }, ...extra,
  })
  const context = (r: { stdout: string }) => (r.stdout ? JSON.parse(r.stdout).hookSpecificOutput.additionalContext as string : '')
  const read = (file_path: string) => ({ type: 'assistant', message: { content: [{ type: 'tool_use', id: 'r', name: 'Read', input: { file_path } }] } })
  const ADR21 = 'docs/adr/0021-multi-context-domain-docs.md'

  it('points to each governing or named ADR in one line, then the late-read note', () => {
    const hint = context(run(edit({}, { old_string: 'ADR-0004 says' })))
    const [line, note] = hint.split('\n')
    expect(line!.startsWith(ADR_HINT_PREFIX)).toBe(true)
    expect(line).toContain(`\`${ADR21}\` (ADR-0021 governs \`GLOSSARY.md\`)`)
    expect(line).toContain('`docs/adr/0004-objective-safety-gate.md` (your edit names ADR-0004)')
    expect(note).toBe(LATE_READ_NOTE)
  })

  it('reads a Write\'s content, and a path inside a worktree', () => {
    const wt = `${repo}/.claude/worktrees/w1/notes.md`
    expect(context(run({ ...edit(), tool_name: 'Write', tool_input: { file_path: wt, content: 'per ADR-0029' } }))).toContain('ADR-0029')
  })

  it('stays silent for an ADR read in full or already pointed to, and only for that ADR', () => {
    const readT = transcript('read.jsonl', [start, read(`${repo}/${ADR21}`)])
    expect(run(edit({ transcript_path: readT })).stdout).toBe('')
    const first = context(run(edit()))
    const pointed = transcript('pointed.jsonl', [start, { type: 'attachment', attachment: { type: 'hook_additional_context', content: [first] } }])
    expect(run(edit({ transcript_path: pointed })).stdout).toBe('')
    expect(context(run(edit({ transcript_path: pointed }, { new_string: 'ADR-0004' })))).not.toContain(ADR21)
    const rulePointer = transcript('rule.jsonl', [start, { type: 'attachment', attachment: { type: 'hook_additional_context', content: [`Read \`${ADR21}\` (~900 tokens)`] } }])
    expect(context(run(edit({ transcript_path: rulePointer })))).toContain(ADR21)
  })

  it("checks a subagent's own transcript, a workflow agent's included, and adds nothing without one", () => {
    const parent = transcript('p.jsonl', [start, read(`${repo}/${ADR21}`)])
    transcript('p/subagents/workflows/wf_1/agent-w1.jsonl', [start])
    transcript('p/subagents/agent-a1.jsonl', [start, read(`${repo}/${ADR21}`)])
    expect(context(run(edit({ transcript_path: parent, agent_id: 'w1' })))).toContain(ADR21)
    expect(run(edit({ transcript_path: parent, agent_id: 'a1' })).stdout).toBe('')
    expect(run(edit({ transcript_path: parent, agent_id: 'gone' })).stdout).toBe('')
    expect(run(edit({ transcript_path: join(dir, 'nope.jsonl') })).stdout).toBe('')
  })

  it('fails open on a malformed payload', () => {
    expect(run('{"tool_input":{"file_path":"GLOSSARY.md"')).toMatchObject({ status: 0, stdout: '' })
  })

  it('--dry-run prints the hint with no transcript, and stays under the hook-output cap with every ADR named', () => {
    const dry = (input: object) =>
      JSON.parse(runTsx(join(repo, 'scripts/hooks/adr-read-hint.ts'), { args: ['--dry-run', '--input', JSON.stringify(input)] })).hint as string | null
    expect(dry({ tool_name: 'Edit', cwd: repo, tool_input: { file_path: `${repo}/GLOSSARY.md`, old_string: '', new_string: '' } })).toContain(ADR21)
    const all = Array.from({ length: 30 }, (_, i) => `ADR-${String(i + 1).padStart(4, '0')}`).join(' ')
    expect(dry({ tool_name: 'Write', cwd: repo, tool_input: { file_path: `${repo}/.claude/settings.json`, content: all } })!.length).toBeLessThan(10_000)
  })
})
