// Coverage for the Agent-background-flag guard (issue #835; rationale and
// detection contract in `scripts/agent-background-flag-guard.ts`). The pure
// core is pinned directly against `tool_input` shapes, plus the CLI's
// stdin→deny-JSON path and `--dry-run`, exercised end to end against the real
// script (ADR-0004's reviewability bar for an unattended hook).
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkAgentBackgroundFlag, denyOutputFor, formatGuardMessage } from '../../scripts/agent-background-flag-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'agent-background-flag-guard.ts')

describe('checkAgentBackgroundFlag() — the pure predicate (issue #835)', () => {
  it('DENIES: run_in_background explicitly false — the recorded regression', () => {
    expect(checkAgentBackgroundFlag({ run_in_background: false })).toBe(true)
  })

  it('ALLOWS: run_in_background explicitly true', () => {
    expect(checkAgentBackgroundFlag({ run_in_background: true })).toBe(false)
  })

  it('ALLOWS: run_in_background omitted', () => {
    expect(checkAgentBackgroundFlag({})).toBe(false)
    expect(checkAgentBackgroundFlag({ prompt: 'do the thing' })).toBe(false)
  })

  it('never throws on a null / non-object tool_input', () => {
    expect(checkAgentBackgroundFlag(null)).toBe(false)
    expect(checkAgentBackgroundFlag('a string')).toBe(false)
    expect(checkAgentBackgroundFlag(undefined)).toBe(false)
  })
})

describe('formatGuardMessage()', () => {
  it('states the real behaviour and the fix', () => {
    const msg = formatGuardMessage()
    expect(msg).toContain('issue #835')
    expect(msg).toMatch(/no-op/i)
    expect(msg).toMatch(/omit .*run_in_background.*or pass .*true/i)
  })
})

describe('denyOutputFor() — the PreToolUse control object', () => {
  it('emits a deny decision for a finding', () => {
    const out = denyOutputFor(true)
    expect(out?.hookSpecificOutput.hookEventName).toBe('PreToolUse')
    expect(out?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(out?.hookSpecificOutput.permissionDecisionReason).toContain('issue #835')
  })

  it('emits nothing (null) for an allowed call, so the call proceeds untouched', () => {
    expect(denyOutputFor(false)).toBeNull()
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

  function payload(runInBackground: unknown): Record<string, unknown> {
    const tool_input: Record<string, unknown> = { prompt: 'do the thing' }
    if (runInBackground !== undefined) tool_input.run_in_background = runInBackground
    return { hook_event_name: 'PreToolUse', tool_name: 'Agent', tool_input }
  }

  it('END TO END: denies run_in_background: false', () => {
    const deny = runHook(payload(false))
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('issue #835')
  })

  it('END TO END: stays silent for run_in_background: true', () => {
    expect(runHook(payload(true))).toBeNull()
  })

  it('END TO END: stays silent when run_in_background is omitted', () => {
    expect(runHook(payload(undefined))).toBeNull()
  })

  it('END TO END: stays silent on empty stdin (a bare manual run is not a tool call to police)', () => {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], { cwd: root, input: '', encoding: 'utf8' }).trim()
    expect(out).toBe('')
  })

  it('END TO END: denies uninspectable stdin (not JSON) — fail-closed', () => {
    expect(runHook('not json')?.hookSpecificOutput.permissionDecision).toBe('deny')
  })
})

describe('the --dry-run path (ADR-0004: an unattended hook needs a way to be exercised by hand)', () => {
  function dryRun(args: string[]): { decision: string; reason?: string } {
    return JSON.parse(execFileSync('pnpm', ['exec', 'tsx', SCRIPT, '--dry-run', ...args], { cwd: root, encoding: 'utf8' }))
  }

  it('reports deny for run_in_background: false', () => {
    const out = dryRun(['--tool', 'Agent', '--input', '{"run_in_background":false}'])
    expect(out.decision).toBe('deny')
    expect(out.reason).toContain('issue #835')
  })

  it('reports allow for run_in_background: true, and for no --input at all', () => {
    expect(dryRun(['--tool', 'Agent', '--input', '{"run_in_background":true}']).decision).toBe('allow')
    expect(dryRun(['--tool', 'Agent']).decision).toBe('allow')
  })
})
