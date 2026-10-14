// Coverage for the Bash rules hint (issue #1764; contract in
// `scripts/bash-rules-hint.ts`).
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { bashRulesHint } from '../../scripts/bash-rules-hint.ts'
import type { RuleFile } from '../../scripts/skill-rules-hint.ts'
import { ruleBlockFiles } from '../../scripts/validate-adr-rules.ts'
import { FORWARDED, prefilterReaching } from '../support/run-script.ts'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const rule = (file: string, paths: string[], body: string): RuleFile => ({
  file,
  text: `---\npaths:\n${paths.map((p) => `  - "${p}"`).join('\n')}\n---\n${body}\n`,
})
const RULES = [
  rule('tenant.md', ['nuxt.config.ts', 'layers/*/*', 'layers/*/app/**', 'layers/*/content/**/*.md'], '# Tenant layers'),
  rule('guards.md', ['scripts/*-guard.*'], '# The guards'),
  { file: 'adr-0003.md', text: '# ADR-0003: always loaded\n' },
]
const none = () => new Set<string>()
const hint = (command: string, cwd = '/repo') => bashRulesHint(command, cwd, '/repo', RULES, none)
const injected = (command: string, cwd?: string) => ruleBlockFiles(hint(command, cwd) ?? '')
const T = ['.claude/rules/tenant.md']
const G = ['.claude/rules/guards.md']

describe('bashRulesHint(), with an injected loaded set', () => {
  it('shows each rule body under its header, without frontmatter', () => {
    const out = hint('cat layers/atlas/nuxt.config.ts | head') ?? ''
    expect(out.split('\n')[0]).toBe('Files this command read are governed by these rules:')
    expect(out).toContain('Contents of .claude/rules/tenant.md:\n\n# Tenant layers')
    expect(out).not.toContain('paths:')
  })

  it('injects exactly the rules governing what a compound or multi-file command read', () => {
    const cases: [command: string, rules: string[], cwd?: string][] = [
      ['cat README.md layers/atlas/tenant.config.ts', T],
      ['grep -n x README.md scripts/a-guard.ts', G],
      ['grep -v x README.md layers/atlas/nuxt.config.ts', T],
      ['cat layers/a/nuxt.config.ts layers/b/nuxt.config.ts', T], // once, though two paths match
      // Relative paths follow a literal cd and stop after one the parser cannot follow.
      ['cd layers/atlas && head nuxt.config.ts', T],
      ['cd layers/atlas && head scripts/a-guard.ts | head', []],
      ['cd "$DIR" && cat nuxt.config.ts | head', []],
      ['cd - && cat /repo/nuxt.config.ts | head', T],
      ['cat README.md | wc -l && git status', []],
      ['ls layers/atlas && echo nuxt.config.ts | cat', []],
      ['cat /repo/layers/atlas/nuxt.config.ts | head', T, '/elsewhere'],
      ['cat /other/layers/atlas/nuxt.config.ts | head', []],
      ['cat ../layers/atlas/nuxt.config.ts | head', [], '/repo/docs/x'],
      // A file matches only where the whole glob does.
      ['cat layers/journal/content/current/sessions/a.yml layers/atlas/content/x.png', []],
      ['cat README.md layers/atlas/content/a/b.md', T],
      ['grep -rn x . | head', []],
      ['cat < layers/atlas/nuxt.config.ts | head', T],
      ['cat <layers/atlas/nuxt.config.ts | head', T],
      ["cat > /tmp/x <<'EOF'\ncat layers/atlas/nuxt.config.ts\nEOF\ncat README.md | head", []],
      ['cat layers/*/nuxt.config.ts "$(echo layers/atlas/nuxt.config.ts)" $F | head', []],
      ['cat "layers/my tenant/app/a b.vue" | head', T],
      ['git status\nhead -5 layers/atlas/nuxt.config.ts', T],
      ['sed -i s/a/b/ layers/atlas/nuxt.config.ts && git diff', []],
      ['grep -l x layers/atlas/nuxt.config.ts scripts/a-guard.ts', []],
      ['git status > layers/atlas/nuxt.config.ts; cat README.md | head', []],
    ]
    for (const [command, rules, cwd] of cases) expect(injected(command, cwd), command).toEqual(rules)
  })

  // shell-reads.spec.ts pins which reads are simple.
  it('stays silent for a simple one-file read, which the harness already covers', () => {
    for (const c of ['cat nuxt.config.ts', 'grep x nuxt.config.ts 2>&1']) expect(hint(c), c).toBeNull()
  })

  it('matches no rule for a real directory, even one a glob would match as a path', () => {
    for (const d of ['layers/atlas', 'layers/atlas/', 'shared']) {
      expect(bashRulesHint(`grep -rn x ${d} README.md`, repo, repo, RULES, none), d).toBeNull()
    }
  })

  it('asks for the loaded rules only on a match, and skips them', () => {
    const never = () => {
      throw new Error('read the transcript without a match')
    }
    expect(bashRulesHint('cat README.md | head', '/repo', '/repo', RULES, never)).toBeNull()
    const loaded = () => new Set(T)
    expect(ruleBlockFiles(bashRulesHint('cat nuxt.config.ts scripts/a-guard.ts', '/repo', '/repo', RULES, loaded) ?? '')).toEqual(G)
    expect(bashRulesHint('cat a layers/a/nuxt.config.ts', '/repo', '/repo', RULES, loaded)).toBeNull()
  })

})

describe('the hook entry (sh pre-filter → tsx)', () => {
  const run = (payload: unknown) =>
    spawnSync('sh', ['scripts/bash-rules-hint.sh'], {
      cwd: repo,
      input: typeof payload === 'string' ? payload : JSON.stringify(payload),
      encoding: 'utf8',
    })
  const bash = (command: string, cwd = repo) => ({ hook_event_name: 'PostToolUse', tool_name: 'Bash', cwd, tool_input: { command }, tool_response: { stdout: 'cat' } })

  it('emits additionalContext for a governed multi-file read, on PostToolUse and PostToolUseFailure', () => {
    for (const event of ['PostToolUse', 'PostToolUseFailure']) {
      const { stdout, status } = run({ ...bash('cat README.md scripts/double-background-guard.ts'), hook_event_name: event })
      expect(status).toBe(0)
      const out = JSON.parse(stdout).hookSpecificOutput
      expect(out.hookEventName).toBe(event)
      expect(out.additionalContext).toContain('Contents of .claude/rules/guards.md:')
    }
  })

  it('writes nothing when the pre-filter drops the command', () => {
    expect(run(bash('ls -la && git status'))).toMatchObject({ status: 0, stdout: '' })
  })

  // The pre-filter reads the first `command` key; JSON.parse keeps the last.
  // A payload where they differ shows which side of the pre-filter ran.
  const probe = (seen: string) =>
    `{"tool_name":"Bash","cwd":${JSON.stringify(repo)},"tool_input":{"command":${JSON.stringify(seen)},"command":"cat README.md scripts/double-background-guard.ts"}}`

  // Only the pre-filter's own decision is under test, so tsx is a stub.
  const reaches = prefilterReaching('bash-rules-hint.sh')

  it('skips tsx for a read that cannot be compound or multi-file', () => {
    for (const seen of ['cat f', 'head -50 f']) expect(reaches(probe(seen)), seen).toBe('')
  })

  it('runs tsx for any compound or multi-word read', () => {
    const compound = ['cat a | head', 'cd x && cat a', 'cat a; ls', 'cat $(ls)', 'ls\ncat a', 'cat a b', 'cat\ta b']
    const multi = ['grep -n x a b', 'head -n 5 a b', 'sed -n 1p a b', 'grep -rn x d', 'rg x d', 'grep x -r d', 'grep -e x -r d']
    for (const seen of [...compound, ...multi]) expect(reaches(probe(seen)), seen).toBe(FORWARDED)
  })

  it('reads the command from tool_input wherever it sits, with spaced colons', () => {
    const compound = JSON.stringify('cat README.md scripts/double-background-guard.ts')
    const late = `{"tool_response":{"command":"ls"},"tool_name":"Bash","cwd":${JSON.stringify(repo)},"tool_input" : {"command" : ${compound}}}`
    expect(reaches(late)).toBe(FORWARDED)
    const quoted = `{"tool_name":"Bash","cwd":${JSON.stringify(repo)},"tool_input":{"command":${compound}},"tool_response":{"x":"tool_input","command":"ls"}}`
    expect(reaches(quoted)).toBe(FORWARDED)
  })

  it("skips a rule already loaded, read from a subagent's own transcript when it has one", () => {
    const dir = mkdtempSync(join(tmpdir(), 'bash-rules-tx-'))
    const loaded = `${JSON.stringify({ attachment: { type: 'nested_memory', path: `${repo}/.claude/rules/guards.md` } })}\n`
    writeFileSync(join(dir, 't.jsonl'), loaded)
    mkdirSync(join(dir, 't/subagents'), { recursive: true })
    writeFileSync(join(dir, 't/subagents/agent-a1.jsonl'), loaded)
    writeFileSync(join(dir, 't/subagents/agent-a2.jsonl'), '{}\n')
    const payload = { ...bash('cat README.md scripts/double-background-guard.ts'), transcript_path: join(dir, 't.jsonl') }
    expect(run(payload).stdout).not.toContain('rules/guards.md')
    expect(run({ ...payload, agent_id: 'a1' }).stdout).not.toContain('rules/guards.md')
    expect(run({ ...payload, agent_id: 'a2' }).stdout).toContain('rules/guards.md')
    expect(run({ ...payload, agent_id: 'missing' }).stdout).toContain('rules/guards.md')
  })

  it('fails open on invalid JSON, a missing rules dir and a malformed rule', () => {
    expect(run('{"tool_input":{"command":"cat a b"')).toMatchObject({ status: 0, stdout: '' })
    const bare = mkdtempSync(join(tmpdir(), 'bash-rules-hint-'))
    expect(run(bash('cat a b', bare))).toMatchObject({ status: 0, stdout: '' })
    mkdirSync(join(bare, '.claude/rules'), { recursive: true })
    writeFileSync(join(bare, '.claude/rules/bad.md'), '---\npaths: [unclosed\n---\nbody\n')
    expect(run(bash('cat a b', bare))).toMatchObject({ status: 0, stdout: '' })
  })
})
