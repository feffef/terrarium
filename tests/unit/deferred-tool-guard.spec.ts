// Coverage for the deferred-tool-shape guard (issue #612): CLAUDE.md's doc-only
// "load a deferred tool's schema via ToolSearch before the first call" rule
// failed to hold three times for `TaskCreate`, each time by calling it with the
// `Agent` tool's `prompt`/`subagent_type` shape. The pure core
// (`checkToolCall`) is pinned here directly; the CLI's stdin→deny-JSON path is
// exercised end to end against the real built script so the exact regression
// case (`TaskCreate` carrying Agent-shaped args) is proven to be blocked with a
// corrective message, not just asserted in the abstract.
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  checkToolCall,
  denyOutputFor,
  formatGuardMessage,
  FOREIGN_SIGNATURES,
} from '../../scripts/deferred-tool-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'deferred-tool-guard.ts')

/** Run the guard exactly as the PreToolUse hook would: JSON on stdin, capture
 *  stdout. Returns the parsed deny object, or null when the guard stayed silent
 *  (an allowed call). */
function runHook(payload: unknown): { hookSpecificOutput: Record<string, string> } | null {
  const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], {
    cwd: root,
    input: JSON.stringify(payload),
    encoding: 'utf8',
  }).trim()
  return out ? JSON.parse(out) : null
}

describe('checkToolCall() — the pure core (issue #612)', () => {
  it('THE REGRESSION: TaskCreate called with Agent-shaped params (prompt + subagent_type) is flagged', () => {
    const finding = checkToolCall('TaskCreate', { prompt: 'do the thing', subagent_type: 'general-purpose' })
    expect(finding).toEqual({
      calledTool: 'TaskCreate',
      looksLikeTool: 'Agent',
      matchedKeys: ['prompt', 'subagent_type'],
    })
  })

  it('generalizes: Monitor — the other named repeat offender — wearing the Agent shape is flagged too', () => {
    expect(checkToolCall('Monitor', { prompt: 'watch the log', subagent_type: 'x' })?.looksLikeTool).toBe('Agent')
  })

  it('generalizes: ANY non-Agent tool wearing the Agent shape is flagged (rule is about every deferred tool)', () => {
    expect(checkToolCall('SomeFutureDeferredTool', { prompt: 'p', subagent_type: 's' })).not.toBeNull()
  })

  it('never flags the legitimate caller: the real Agent tool with its own shape passes', () => {
    expect(checkToolCall('Agent', { prompt: 'p', subagent_type: 's' })).toBeNull()
  })

  it('does not over-match on a single shared key: `prompt` alone (without subagent_type) is allowed', () => {
    expect(checkToolCall('TaskCreate', { prompt: 'p' })).toBeNull()
    expect(checkToolCall('TaskCreate', { subagent_type: 's' })).toBeNull()
  })

  it('allows a correctly-shaped deferred-tool call (no foreign signature present)', () => {
    expect(checkToolCall('TaskCreate', { title: 'T', description: 'D' })).toBeNull()
  })

  it('never throws on a null / non-object tool_input — matches nothing', () => {
    expect(checkToolCall('TaskCreate', null)).toBeNull()
    expect(checkToolCall('TaskCreate', undefined)).toBeNull()
    expect(checkToolCall('TaskCreate', 'a string')).toBeNull()
    expect(checkToolCall('TaskCreate', 42)).toBeNull()
  })
})

describe('the seed registry', () => {
  it('carries the Agent (prompt + subagent_type) signature the recurrences all borrowed', () => {
    const agent = FOREIGN_SIGNATURES.find((s) => s.owner === 'Agent')
    expect(agent?.requiredKeys).toEqual(['prompt', 'subagent_type'])
  })
})

describe('formatGuardMessage()', () => {
  it('is self-contained: names the called tool, the shape owner, and the ToolSearch fix', () => {
    const msg = formatGuardMessage({ calledTool: 'TaskCreate', looksLikeTool: 'Agent', matchedKeys: ['prompt', 'subagent_type'] })
    expect(msg).toContain('issue #612')
    expect(msg).toContain('TaskCreate')
    expect(msg).toContain('Agent')
    expect(msg).toContain('ToolSearch')
    expect(msg).toContain('select:TaskCreate')
  })
})

describe('denyOutputFor() — the PreToolUse control object', () => {
  it('emits a deny decision for a finding', () => {
    const out = denyOutputFor({ calledTool: 'TaskCreate', looksLikeTool: 'Agent', matchedKeys: ['prompt', 'subagent_type'] })
    expect(out?.hookSpecificOutput.hookEventName).toBe('PreToolUse')
    expect(out?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(out?.hookSpecificOutput.permissionDecisionReason).toContain('ToolSearch')
  })

  it('emits nothing (null) for an allowed call, so the call proceeds untouched', () => {
    expect(denyOutputFor(null)).toBeNull()
  })
})

describe('the CLI as the PreToolUse hook would invoke it (stdin JSON → stdout deny)', () => {
  it('END TO END: blocks the exact regression — TaskCreate with Agent-shaped prompt/subagent_type', () => {
    const deny = runHook({
      hook_event_name: 'PreToolUse',
      tool_name: 'TaskCreate',
      tool_input: { prompt: 'implement the thing', subagent_type: 'general-purpose' },
    })
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('select:TaskCreate')
  })

  it('END TO END: stays silent (allows) a correctly-shaped call', () => {
    expect(runHook({ hook_event_name: 'PreToolUse', tool_name: 'TaskCreate', tool_input: { title: 'T', description: 'D' } })).toBeNull()
  })

  it('END TO END: stays silent on non-JSON / empty stdin (fails open)', () => {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], { cwd: root, input: '', encoding: 'utf8' }).trim()
    expect(out).toBe('')
  })
})
