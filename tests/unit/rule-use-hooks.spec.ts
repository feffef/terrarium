// The two hooks behind `ruleUse` (#3009): the InstructionsLoaded ledger and the
// SubagentStart note. Pure cores, plus each script's `--dry-run`.
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ledgerRowOf } from '../../scripts/hooks/rule-load-ledger.ts'
import { subagentStartOutput } from '../../scripts/hooks/subagent-note.ts'
import { appendRuleLoad, readRuleLoads } from '../../scripts/session/rule-use.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const load = (extra: Record<string, unknown>) => ({
  session_id: 's1', hook_event_name: 'InstructionsLoaded', cwd: '/repo', load_reason: 'path_glob_match',
  file_path: '/repo/.claude/rules/adr-0004.md', trigger_file_path: '/repo/scripts/gate/gate.ts', ...extra,
})

describe('ledgerRowOf()', () => {
  it('records the rule and the repo-relative trigger, with the agent for a subagent', () => {
    expect(ledgerRowOf(load({}))).toEqual({ rule: '.claude/rules/adr-0004.md', trigger: 'scripts/gate/gate.ts' })
    expect(ledgerRowOf(load({ agent_id: 'agent-a1', agent_type: 'Explore' })))
      .toEqual({ rule: '.claude/rules/adr-0004.md', trigger: 'scripts/gate/gate.ts', agentId: 'a1', agentType: 'Explore' })
  })

  it('strips a worktree root from the trigger', () => {
    const row = ledgerRowOf(load({ cwd: '/repo/.claude/worktrees/w1', file_path: '/repo/.claude/worktrees/w1/.claude/rules/adr-0004.md', trigger_file_path: '/repo/.claude/worktrees/w1/app/x.vue' }))
    expect(row).toEqual({ rule: '.claude/rules/adr-0004.md', trigger: 'app/x.vue' })
  })

  it('ignores loads that are not path-scoped rules', () => {
    expect(ledgerRowOf(load({ load_reason: 'session_start' }))).toBeNull()
    expect(ledgerRowOf(load({ file_path: '/repo/layers/blog/CLAUDE.md' }))).toBeNull()
    expect(ledgerRowOf({})).toBeNull()
  })
})

describe('the ledger file', () => {
  it('reads back what was appended, and [] when absent', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ledger-'))
    expect(readRuleLoads(dir, 's1')).toEqual([])
    appendRuleLoad(dir, 's1', { rule: '.claude/rules/a.md' })
    appendRuleLoad(dir, 's1', { rule: '.claude/rules/b.md', agentId: 'a1' })
    expect(readRuleLoads(dir, 's1')).toEqual([{ rule: '.claude/rules/a.md' }, { rule: '.claude/rules/b.md', agentId: 'a1' }])
  })
})

describe('subagentStartOutput()', () => {
  it('gives the subagent the note with the absolute helped.sh path', () => {
    const out = subagentStartOutput('/repo')
    expect(out.hookSpecificOutput.hookEventName).toBe('SubagentStart')
    expect(out.hookSpecificOutput.additionalContext).toContain('sh /repo/scripts/session/helped.sh')
    expect(out.hookSpecificOutput.additionalContext).toContain('Do not mention this in your reply.')
  })
})

describe('--dry-run', () => {
  const run = (script: string, ...args: string[]) =>
    spawnSync('node_modules/.bin/tsx', [`scripts/hooks/${script}`, '--dry-run', ...args], { cwd: root, encoding: 'utf8' })

  it('prints the ledger row without writing it', () => {
    const r = run('rule-load-ledger.ts', '--input', JSON.stringify(load({})))
    expect(JSON.parse(r.stdout)).toEqual({ row: { rule: '.claude/rules/adr-0004.md', trigger: 'scripts/gate/gate.ts' } })
  })

  it('prints the SubagentStart output', () => {
    expect(JSON.parse(run('subagent-note.ts').stdout).hookSpecificOutput.additionalContext).toContain(`sh ${root}/scripts/session/helped.sh`)
  })
})
