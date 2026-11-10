// The InstructionsLoaded ledger behind `ruleUse` (#3009): pure core, the file, and `--dry-run`.
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ledgerRowOf } from '../../scripts/hooks/rule-load-ledger.ts'
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

  it('makes the trigger relative to the root the rule loaded from, not the cwd', () => {
    expect(ledgerRowOf(load({ cwd: '/repo/scripts' }))).toEqual({ rule: '.claude/rules/adr-0004.md', trigger: 'scripts/gate/gate.ts' })
  })

  it('keeps a trigger outside the rule root absolute', () => {
    expect(ledgerRowOf(load({ trigger_file_path: '/elsewhere/x.ts' }))).toEqual({ rule: '.claude/rules/adr-0004.md', trigger: '/elsewhere/x.ts' })
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

describe('--dry-run', () => {
  it('prints the ledger row without writing it', () => {
    const r = spawnSync('node_modules/.bin/tsx', ['scripts/hooks/rule-load-ledger.ts', '--dry-run', '--input', JSON.stringify(load({}))], { cwd: root, encoding: 'utf8' })
    expect(JSON.parse(r.stdout)).toEqual({ row: { rule: '.claude/rules/adr-0004.md', trigger: 'scripts/gate/gate.ts' } })
  })
})
