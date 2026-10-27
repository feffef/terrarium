// Coverage for the ADR read hint (contract in `scripts/hooks/adr-read-hint.ts`).
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { adrsForWrite, committedShas, LATE_READ_NOTE, patchWrites } from '../../scripts/hooks/adr-read-hint.ts'
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

describe('committedShas()', () => {
  it("reads each commit from git's summary lines, only when a command line runs git commit", () => {
    const out = '[main (root-commit) 1a2b3c4] first\n 1 file changed\n[detached HEAD 5d6e7f8a9] second\nnot [x 1234567] a summary'
    expect(committedShas('git add -A && git commit -m x', out)).toEqual(['1a2b3c4', '5d6e7f8a9'])
    expect(committedShas('W=/r/wt\ngit -C "$W" commit -F msg', '[fix/a 0123abc] y')).toEqual(['0123abc'])
    expect(committedShas('git -C "$W" \\\n  commit -m x', '[fix/a 0123abc] y')).toEqual(['0123abc'])
    expect(committedShas("git -c user.name='a b' --no-pager commit --amend", '[m 0123abc] y')).toEqual(['0123abc'])
    for (const c of ['git -C"$W" commit -m x;git push', '`git commit -m x`', 'git --git-dir /x commit', '(git commit -am x)', '/usr/bin/git commit', 'if git commit -m x; then :; fi', 'xargs git commit']) {
      expect(committedShas(c, '[m 0123abc] y'), c).toEqual(['0123abc'])
    }
    for (const c of ['git log -1 --oneline', 'echo commit\ngit status', 'git status && echo commit', 'git log --grep commit',
      'git commit-tree HEAD^{tree}', "cat > f <<'EOF'\ngit commit -m x\nEOF", 'git -c commit.gpgsign=false log', 'git --commit status']) {
      expect(committedShas(c, '[main 1a2b3c4] first'), c).toEqual([])
    }
    expect(committedShas('git commit -q -m x', '')).toEqual([])
  })
})

describe('committedShas() on a long run of options', () => {
  it('stays linear on runs of options that could parse more than one way', () => {
    for (const run of [' -c', ' -cx', ' --x', ' -C"a"', " -c 'a b'", ' \\"', '\\"', ' "', " '", '\\', ' \\\'']) {
      expect(committedShas(`git${run.repeat(20_000)} y`, '[m 1234567] x'), run).toEqual([])
    }
    expect(committedShas(`git${' -c a=-b'.repeat(20_000)} commit`, '[m 1234567] x')).toEqual(['1234567'])
  })
})

describe('patchWrites()', () => {
  it('lists each touched file with its added and removed lines, new and deleted files included', () => {
    const patch = [
      'diff --git a/GLOSSARY.md b/GLOSSARY.md', 'index 1..2 100644', '--- a/GLOSSARY.md', '+++ b/GLOSSARY.md',
      '@@ -1,2 +1 @@', '-old ADR-0004', '--- a removed line', '+new', '+-- not a header', '\\ No newline at end of file',
      'diff --git a/n.md b/n.md', 'new file mode 100644', '--- /dev/null', '+++ b/n.md', '@@ -0,0 +1 @@', '+per ADR-0029',
      'diff --git a/a b.md b/a b.md', '--- a/a b.md\t', '+++ b/a b.md\t', '@@ -1 +1 @@', '+é',
      'diff --git a/gone.md b/gone.md', 'deleted file mode 100644', '--- a/gone.md', '+++ /dev/null', '@@ -1 +0,0 @@', '-bye',
    ].join('\n')
    expect(patchWrites(patch)).toEqual([
      { file: 'GLOSSARY.md', texts: ['old ADR-0004', '-- a removed line', 'new', '-- not a header'] },
      { file: 'n.md', texts: ['per ADR-0029'] },
      { file: 'a b.md', texts: ['é'] },
      { file: 'gone.md', texts: ['bye'] },
    ])
    expect(patchWrites('')).toEqual([])
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
  const sh = readFileSync(join(repo, 'scripts/hooks/adr-read-hint.sh'), 'utf8').replace(/^( *)printf .*adr-read-hint\.ts$/gm, '$1echo PASS')
  const passes = (tool_input: object, tool_response: object = {}) =>
    spawnSync('sh', ['-c', sh], { input: JSON.stringify({ tool_name: 'Edit', tool_input, tool_response }), encoding: 'utf8' }).stdout.trim() === 'PASS'

  it("passes a file under every ADR rule glob's first segment", () => {
    const globs = loadRules(join(repo, '.claude/rules')).filter((r) => ruleAdr(r.file)).flatMap((r) => rulePaths(r.text))
    expect(globs.length).toBeGreaterThan(0)
    for (const g of globs) expect(passes({ file_path: `/r/${g.replace(/\*+/g, 'x')}` }), g).toBe(true)
  })

  const passesBash = (command: string) =>
    spawnSync('sh', ['-c', sh], { input: JSON.stringify({ tool_name: 'Bash', tool_input: { command }, tool_response: { stdout: '[m 1234567] x' } }), encoding: 'utf8' }).stdout.trim() === 'PASS'

  it('passes every Bash command the hook would read as a commit, and skips one with no git commit', () => {
    const pre = ['', 'cd /r && ', 'echo "a\\"b" ; ', 'W=/r/wt\n', 'git add -A &&\n  ']
    const git = ['git', 'git -C "$W"', "git -c x='a \"b\"'", 'git --no-pager', 'git -C /r \\\n ', '(git', '`/usr/bin/git']
    const post = [' -m "x"', " -F m.txt", ' --amend --no-edit', " -m 'it\\'s \"q\"'\necho done"]
    for (const a of pre) for (const g of git) for (const b of post) {
      const c = `${a}${g} commit${b}`
      expect(committedShas(c, '[m 1234567] x'), c).toEqual(['1234567'])
      expect(passesBash(c), c).toBe(true)
    }
    for (const c of ['ls docs/adr', 'grep -r ADR-0004 docs', 'cat GLOSSARY.md']) expect(passesBash(c), c).toBe(false)
  })

  it('passes an edit naming an ADR, and skips one outside every glob', () => {
    expect(passes({ file_path: '/tmp/x.md', new_string: 'see ADR-0004' })).toBe(true)
    expect(passes({ file_path: '/tmp/notes/x.md', new_string: 'nothing' })).toBe(false)
    expect(passes({ file_path: '/tmp/notes/x.md', new_string: 'nothing' }, { originalFile: 'per ADR-0004', filePath: '/r/docs/x.md' })).toBe(false)
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
    const bash = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'b', name: 'Bash', input: { command: `cat ${ADR21}` } }] } }
    const shown = { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'b', content: readFileSync(join(repo, ADR21), 'utf8') }] } }
    expect(run(edit({ transcript_path: transcript('shell.jsonl', [start, bash, shown]) })).stdout).toBe('')
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

  it('points to the ADRs a Bash commit touches, once per ADR, and stays silent for read-only Bash or an ADR already pointed to', () => {
    const r = mkdtempSync(join(tmpdir(), 'adr-hint-repo-'))
    const g = (...args: string[]) => spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', '-C', r, ...args], { encoding: 'utf8' })
    mkdirSync(join(r, '.claude/rules'), { recursive: true })
    mkdirSync(join(r, 'docs/adr'), { recursive: true })
    writeFileSync(join(r, '.claude/rules/adr-0021.md'), rule(['GLOSSARY.md']))
    writeFileSync(join(r, 'docs/adr/0021-g.md'), '# ADR-0021\n')
    writeFileSync(join(r, 'docs/adr/0004-s.md'), '# ADR-0004\n')
    writeFileSync(join(r, '.claude/rules/adr-0030.md'), rule(['empty/**']))
    writeFileSync(join(r, 'docs/adr/0030-e.md'), '# ADR-0030\n')
    g('init', '-q')
    g('add', '-A')
    g('commit', '-q', '-m', 'base')
    writeFileSync(join(r, 'GLOSSARY.md'), 'a\n')
    writeFileSync(join(r, 'notes.md'), 'per ADR-0004\n')
    mkdirSync(join(r, 'empty'))
    writeFileSync(join(r, 'empty/keep'), '')
    g('add', '-A')
    expect(g('commit', '-q', '-m', 'x').status).toBe(0)
    const sha = g('rev-parse', '--short', 'HEAD').stdout.trim()
    const t = transcript('repo.jsonl', [{ ...start, cwd: r }])
    const bash = (command: string, extra: object = {}) => ({
      hook_event_name: 'PostToolUse', tool_name: 'Bash', cwd: r, transcript_path: t,
      tool_input: { command }, tool_response: { stdout: `[main ${sha}] x\n`, stderr: '' }, ...extra,
    })
    const hint = context(run(bash('git add -A && git commit -m x')))
    expect(hint).toContain('`docs/adr/0021-g.md` (ADR-0021 governs `GLOSSARY.md`)')
    expect(hint).toContain('`docs/adr/0004-s.md` (your edit names ADR-0004)')
    expect(hint).toContain('`docs/adr/0030-e.md` (ADR-0030 governs `empty/keep`)')
    expect(hint.match(/ADR-0021 governs/g)).toHaveLength(1)
    expect(run(bash('git log -1 --oneline')).stdout).toBe('')
    const pointed = transcript('repo-pointed.jsonl', [{ ...start, cwd: r }, { type: 'attachment', attachment: { type: 'hook_additional_context', content: [hint] } }])
    expect(run(bash('git commit -m x', { transcript_path: pointed })).stdout).toBe('')
    expect(run({ ...edit({ cwd: r, transcript_path: pointed }), tool_input: { file_path: join(r, 'GLOSSARY.md'), old_string: 'a', new_string: 'b' } }).stdout).toBe('')
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
