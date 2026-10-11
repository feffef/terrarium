// Coverage for the Bash rules hint (issue #1764; contract in
// `scripts/bash-rules-hint.ts`).
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { bashRulesHint, rulesForPaths } from '../../scripts/bash-rules-hint.ts'
import { hintedRules } from '../../scripts/session-trace.ts'
import { bashReadPaths } from '../../scripts/shell-reads.ts'
import type { RuleFile } from '../../scripts/skill-rules-hint.ts'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const rule = (file: string, paths: string[], body: string): RuleFile => ({
  file,
  text: `---\npaths:\n${paths.map((p) => `  - "${p}"`).join('\n')}\n---\n${body}\n`,
})
const RULES = [
  rule('tenant.md', ['nuxt.config.ts', 'layers/*/*', 'layers/*/app/**'], '# Tenant layers'),
  rule('guards.md', ['scripts/*-guard.*'], '# The guards'),
  { file: 'adr-0003.md', text: '# ADR-0003: always loaded\n' },
]
const hint = (command: string, cwd = '/repo', loaded?: Set<string>) => bashRulesHint(command, cwd, '/repo', RULES, loaded)
const injected = (command: string, cwd?: string) => hintedRules(hint(command, cwd) ?? '')

describe('bashRulesHint() — the pure core', () => {
  it('injects the matching rule for a piped, chained or multi-file read', () => {
    const out = hint('cat layers/atlas/nuxt.config.ts | head') ?? ''
    expect(out.split('\n')[0]).toBe('Files this command read are governed by these rules:')
    expect(out).toContain('Contents of .claude/rules/tenant.md:\n\n# Tenant layers')
    expect(out).not.toContain('paths:')
    expect(injected('cat README.md layers/atlas/tenant.config.ts')).toEqual(['.claude/rules/tenant.md'])
    expect(injected('grep -n x README.md scripts/a-guard.ts')).toEqual(['.claude/rules/guards.md'])
  })

  it('resolves relative paths against a preceding cd', () => {
    expect(injected('cd layers/atlas && head nuxt.config.ts')).toEqual(['.claude/rules/tenant.md'])
    expect(hint('cd layers/atlas && head scripts/a-guard.ts | head')).toBeNull()
    expect(hint('cd "$DIR" && cat nuxt.config.ts | head')).toBeNull()
    expect(injected('cd - && cat /repo/nuxt.config.ts | head')).toEqual(['.claude/rules/tenant.md'])
  })

  it('stays silent for a simple one-file read, which the harness already covers', () => {
    for (const c of ['cat nuxt.config.ts', 'head -50 nuxt.config.ts', 'head -n 50 nuxt.config.ts', 'sed -n 1,5p nuxt.config.ts', 'grep x nuxt.config.ts']) {
      expect(bashReadPaths(c, '/repo')).toEqual({ paths: ['/repo/nuxt.config.ts'], simple: true })
      expect(hint(c)).toBeNull()
    }
  })

  it('stays silent when no governed path is read', () => {
    expect(hint('cat README.md | wc -l && git status')).toBeNull()
    expect(hint('ls layers/atlas && echo nuxt.config.ts | cat')).toBeNull()
  })

  it('normalises in-repo absolute paths and never matches outside the repo', () => {
    expect(injected('cat /repo/layers/atlas/nuxt.config.ts | head', '/elsewhere')).toEqual(['.claude/rules/tenant.md'])
    expect(hint('cat /other/layers/atlas/nuxt.config.ts | head')).toBeNull()
    expect(hint('cat ../layers/atlas/nuxt.config.ts | head', '/repo/docs/x')).toBeNull()
  })

  it('treats a directory as covering the files under it, but not the whole repo', () => {
    expect(injected('grep -rn x layers/ | head')).toEqual(['.claude/rules/tenant.md'])
    expect(hint('grep -rn x . | head')).toBeNull()
  })

  it('skips heredoc bodies, globs, variables and command substitutions', () => {
    expect(hint("cat > /tmp/x <<'EOF'\ncat layers/atlas/nuxt.config.ts\nEOF\ncat README.md | head")).toBeNull()
    expect(hint('cat layers/*/nuxt.config.ts "$(echo layers/atlas/nuxt.config.ts)" $F | head')).toBeNull()
  })

  it('reads quoted paths with spaces and a reader on a later line', () => {
    expect(injected('cat "layers/my tenant/app/a b.vue" | head')).toEqual(['.claude/rules/tenant.md'])
    expect(injected('git status\nhead -5 layers/atlas/nuxt.config.ts')).toEqual(['.claude/rules/tenant.md'])
  })

  it('skips writes and name-only output', () => {
    expect(hint('sed -i s/a/b/ layers/atlas/nuxt.config.ts && git diff')).toBeNull()
    expect(hint('grep -l x layers/atlas/nuxt.config.ts scripts/a-guard.ts')).toBeNull()
    expect(hint('git status > layers/atlas/nuxt.config.ts; cat README.md | head')).toBeNull()
  })

  it('injects each rule once, and skips one already loaded', () => {
    expect(injected('cat layers/a/nuxt.config.ts layers/b/nuxt.config.ts')).toEqual(['.claude/rules/tenant.md'])
    expect(hint('cat a layers/a/nuxt.config.ts', '/repo', new Set(['.claude/rules/tenant.md']))).toBeNull()
  })

  it('matches rules by their paths only', () => {
    expect(rulesForPaths(['nuxt.config.ts', 'scripts/a-guard.ts'], RULES).map((r) => r.file)).toEqual(['tenant.md', 'guards.md'])
    expect(rulesForPaths(['README.md'], RULES)).toEqual([])
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

  it('emits PostToolUse additionalContext for a governed multi-file read', () => {
    const { stdout, status } = run(bash('cat README.md scripts/tail-pipe-guard.ts'))
    expect(status).toBe(0)
    const out = JSON.parse(stdout).hookSpecificOutput
    expect(out.hookEventName).toBe('PostToolUse')
    expect(out.additionalContext).toContain('Contents of .claude/rules/guards.md:')
  })

  it('passes a reader verb on a later line through the pre-filter', () => {
    expect(JSON.parse(run(bash('git status\nhead -5 README.md scripts/tail-pipe-guard.ts')).stdout).hookSpecificOutput.additionalContext).toContain('guards.md')
  })

  it('writes nothing when the pre-filter drops the command', () => {
    expect(run(bash('ls -la && git status'))).toMatchObject({ status: 0, stdout: '' })
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
