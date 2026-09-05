// Coverage for the Agent-background-flag guard (issue #835; rationale and
// detection contract in `scripts/agent-background-flag-guard.ts`). One test per
// behaviour: the pure core's two decisions, the stdin→deny-JSON path and its
// fail-closed branch exercised end to end against the real script, and
// `--dry-run` (ADR-0004's reviewability bar for an unattended hook).
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkAgentBackgroundFlag } from '../../scripts/agent-background-flag-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'agent-background-flag-guard.ts')

describe('checkAgentBackgroundFlag() — the pure predicate (issue #835)', () => {
  it('DENIES: run_in_background explicitly false — the recorded regression', () => {
    expect(checkAgentBackgroundFlag({ run_in_background: false })).toBe(true)
  })

  it('ALLOWS: run_in_background true, omitted, or no object at all', () => {
    expect(checkAgentBackgroundFlag({ run_in_background: true })).toBe(false)
    expect(checkAgentBackgroundFlag({ prompt: 'do the thing' })).toBe(false)
    expect(checkAgentBackgroundFlag(null)).toBe(false)
    expect(checkAgentBackgroundFlag('a string')).toBe(false)
    expect(checkAgentBackgroundFlag(undefined)).toBe(false)
  })
})

describe('the CLI as the PreToolUse hook would invoke it (stdin JSON → stdout deny)', () => {
  function runHook(payload: unknown): { hookSpecificOutput: Record<string, string> } | null {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], {
      cwd: root,
      input: typeof payload === 'string' ? payload : JSON.stringify(payload),
      encoding: 'utf8',
    }).trim()
    return out ? JSON.parse(out) : null
  }

  it('END TO END: denies run_in_background: false, naming the no-op and the fix', () => {
    const deny = runHook({
      hook_event_name: 'PreToolUse',
      tool_name: 'Agent',
      tool_input: { prompt: 'do the thing', run_in_background: false },
    })
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('issue #835')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toMatch(/no-op/i)
  })

  it('END TO END: denies uninspectable stdin (not JSON) — fail-closed', () => {
    expect(runHook('not json')?.hookSpecificOutput.permissionDecision).toBe('deny')
  })
})

describe('the --dry-run path (ADR-0004: an unattended hook needs a way to be exercised by hand)', () => {
  function dryRun(args: string[]): { decision: string; reason?: string } {
    return JSON.parse(execFileSync('pnpm', ['exec', 'tsx', SCRIPT, '--dry-run', ...args], { cwd: root, encoding: 'utf8' }))
  }

  it('reports deny for run_in_background: false, allow for true and for no --input at all', () => {
    const denied = dryRun(['--tool', 'Agent', '--input', '{"run_in_background":false}'])
    expect(denied.decision).toBe('deny')
    expect(denied.reason).toContain('issue #835')
    expect(dryRun(['--tool', 'Agent', '--input', '{"run_in_background":true}']).decision).toBe('allow')
    expect(dryRun(['--tool', 'Agent']).decision).toBe('allow')
  })
})
