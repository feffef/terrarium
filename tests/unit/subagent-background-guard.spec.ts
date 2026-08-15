// Coverage for the subagent background guard (issue #694; rationale and
// detection contract: docs/agents/subagent-background-guard.md). The pure
// core is pinned directly; the CLI's stdin→deny-JSON path, `--dry-run`, and
// the hot-path pre-filter are exercised end to end against the real scripts.
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  checkBackgroundedBash,
  checkMonitorCall,
  denyOutputFor,
  detectAgentContext,
  formatGuardMessage,
} from '../../scripts/subagent-background-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'subagent-background-guard.ts')
const PREFILTER = join(root, 'scripts', 'subagent-background-guard.sh')

/** A dispatched subagent's PreToolUse payload, in the exact shape observed
 *  live (the probe recorded in docs/agents/subagent-background-guard.md). */
function subagentPayload(toolInput: Record<string, unknown>): Record<string, unknown> {
  return {
    session_id: '657b9532-8ed5-5695-a08d-d87a60f7a665',
    transcript_path: '/root/.claude/projects/x/657b9532.jsonl',
    agent_id: 'ab4706700c0ee8efc',
    agent_type: 'general-purpose',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: toolInput,
  }
}

/** A main-session payload: same identity fields, no agent ones. */
function mainPayload(toolInput: Record<string, unknown>): Record<string, unknown> {
  return {
    session_id: '657b9532-8ed5-5695-a08d-d87a60f7a665',
    transcript_path: '/root/.claude/projects/x/657b9532.jsonl',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: toolInput,
  }
}

describe('detectAgentContext() — the pure context reader', () => {
  it('reads `subagent` from an agent_id-carrying payload — the observed dispatched-subagent shape', () => {
    expect(detectAgentContext(subagentPayload({ command: 'ls' }))).toBe('subagent')
  })

  it('reads `subagent` from either agent field alone — detection must not hinge on both surviving', () => {
    expect(detectAgentContext({ session_id: 's', agent_id: 'a' })).toBe('subagent')
    expect(detectAgentContext({ session_id: 's', agent_type: 'general-purpose' })).toBe('subagent')
  })

  it('reads `main` from a session-identity payload without agent fields', () => {
    expect(detectAgentContext(mainPayload({ command: 'ls' }))).toBe('main')
  })

  it('is `undeterminable` for a payload with neither identity, or no object at all — fail-closed input', () => {
    expect(detectAgentContext({ hook_event_name: 'PreToolUse' })).toBe('undeterminable')
    expect(detectAgentContext(null)).toBe('undeterminable')
    expect(detectAgentContext('a string')).toBe('undeterminable')
  })
})

describe('checkBackgroundedBash() — the pure predicate (issue #694)', () => {
  it('DENIES: the recorded regression — a subagent backgrounding its own gate run', () => {
    const finding = checkBackgroundedBash('Bash', { command: 'pnpm gate:scoped', run_in_background: true }, 'subagent')
    expect(finding?.context).toBe('subagent')
  })

  it('ALLOWS: the same call from the main session — the harness wakes it with a task notification', () => {
    expect(checkBackgroundedBash('Bash', { command: 'pnpm gate:scoped', run_in_background: true }, 'main')).toBeNull()
  })

  it('ALLOWS: a foreground Bash call in a subagent — the pattern the guard teaches', () => {
    expect(checkBackgroundedBash('Bash', { command: 'pnpm gate:scoped', timeout: 600000 }, 'subagent')).toBeNull()
  })

  it('FAILS CLOSED: an undeterminable context denies a backgrounded call', () => {
    expect(checkBackgroundedBash('Bash', { run_in_background: true }, 'undeterminable')?.context).toBe('undeterminable')
  })

  it('does not let a falsy/absent run_in_background read as backgrounded', () => {
    expect(checkBackgroundedBash('Bash', { run_in_background: false }, 'subagent')).toBeNull()
    expect(checkBackgroundedBash('Bash', { command: 'ls' }, 'subagent')).toBeNull()
  })

  it('does not let a truthy-but-not-true value read as backgrounded (the harness sends a boolean)', () => {
    expect(checkBackgroundedBash('Bash', { run_in_background: 'true' }, 'subagent')).toBeNull()
  })

  it('never touches another tool, in any context', () => {
    expect(checkBackgroundedBash('Agent', { run_in_background: true }, 'subagent')).toBeNull()
  })

  it('never throws on a null / non-object tool_input', () => {
    expect(checkBackgroundedBash('Bash', null, 'subagent')).toBeNull()
    expect(checkBackgroundedBash('Bash', 'a string', 'undeterminable')).toBeNull()
  })
})

describe('checkBackgroundedBash() — the command-text bypass (issue #964)', () => {
  it('DENIES: a trailing bare `&` — the same detach as run_in_background: true', () => {
    expect(checkBackgroundedBash('Bash', { command: 'pnpm gate:scoped &' }, 'subagent')?.signal).toBe('command-text')
  })

  it('DENIES: `nohup … &`, even when the `&` is not the last character', () => {
    expect(checkBackgroundedBash('Bash', { command: 'nohup pnpm gate:scoped & echo started' }, 'subagent')?.signal).toBe(
      'command-text',
    )
  })

  it('DENIES: nohup after a `;`/`&&`/`|` separator, not just at the start of the command', () => {
    expect(checkBackgroundedBash('Bash', { command: 'cd /repo && nohup pnpm build &' }, 'subagent')?.signal).toBe(
      'command-text',
    )
  })

  it('ALLOWS: `&&` chaining — not a backgrounding operator', () => {
    expect(checkBackgroundedBash('Bash', { command: 'pnpm build && pnpm test' }, 'subagent')).toBeNull()
  })

  it('ALLOWS: `2>&1` and `&>`/`>&` redirection — fd duplication, not backgrounding', () => {
    expect(checkBackgroundedBash('Bash', { command: 'pnpm build > out.log 2>&1' }, 'subagent')).toBeNull()
    expect(checkBackgroundedBash('Bash', { command: 'pnpm build &> out.log' }, 'subagent')).toBeNull()
  })

  it('ALLOWS: a literal `&` inside a quoted string argument', () => {
    expect(checkBackgroundedBash('Bash', { command: 'echo "foo & bar"' }, 'subagent')).toBeNull()
    expect(checkBackgroundedBash('Bash', { command: "echo 'run in background &'" }, 'subagent')).toBeNull()
  })

  it('ALLOWS: a backslash-escaped `&` outside quotes', () => {
    expect(checkBackgroundedBash('Bash', { command: 'echo foo \\& bar' }, 'subagent')).toBeNull()
  })

  it('ALLOWS: "nohup" appearing only as a substring of another word, or with no `&` at all', () => {
    expect(checkBackgroundedBash('Bash', { command: 'echo "not-a-nohup-call"' }, 'subagent')).toBeNull()
    expect(checkBackgroundedBash('Bash', { command: 'nohup pnpm build > out.log' }, 'subagent')).toBeNull()
  })

  it('ALLOWS the same trailing `&`/`nohup` commands from the main session', () => {
    expect(checkBackgroundedBash('Bash', { command: 'pnpm gate:scoped &' }, 'main')).toBeNull()
    expect(checkBackgroundedBash('Bash', { command: 'nohup pnpm gate:scoped &' }, 'main')).toBeNull()
  })
})

describe('checkMonitorCall() — the Monitor-tool bypass (issue #964)', () => {
  it('DENIES a Monitor call from a subagent', () => {
    expect(checkMonitorCall('Monitor', 'subagent')?.signal).toBe('monitor')
  })

  it('DENIES a Monitor call from an undeterminable context — fails closed', () => {
    expect(checkMonitorCall('Monitor', 'undeterminable')?.signal).toBe('monitor')
  })

  it('ALLOWS a Monitor call from the main session', () => {
    expect(checkMonitorCall('Monitor', 'main')).toBeNull()
  })

  it('never touches another tool', () => {
    expect(checkMonitorCall('Bash', 'subagent')).toBeNull()
  })
})

describe('formatGuardMessage()', () => {
  it('names the issue, the wake that never comes, and the full foreground alternative', () => {
    const msg = formatGuardMessage(checkBackgroundedBash('Bash', { run_in_background: true }, 'subagent')!)
    expect(msg).toContain('issue #694')
    expect(msg).toContain('SendMessage')
    expect(msg).toContain('FOREGROUND')
    expect(msg).toContain('600000')
    expect(msg).toContain('preview.ts start')
    expect(msg).toMatch(/trailing `&`/)
  })

  it('says plainly that an undeterminable context is a fail-closed denial', () => {
    const msg = formatGuardMessage(checkBackgroundedBash('Bash', { run_in_background: true }, 'undeterminable')!)
    expect(msg).toMatch(/fails? CLOSED/i)
  })
})

describe('denyOutputFor() — the PreToolUse control object', () => {
  it('emits a deny decision for a finding', () => {
    const out = denyOutputFor(checkBackgroundedBash('Bash', { run_in_background: true }, 'subagent'))
    expect(out?.hookSpecificOutput.hookEventName).toBe('PreToolUse')
    expect(out?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(out?.hookSpecificOutput.permissionDecisionReason).toContain('issue #694')
  })

  it('emits nothing (null) for an allowed call, so the call proceeds untouched', () => {
    expect(denyOutputFor(null)).toBeNull()
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

  it('END TO END: blocks a subagent backgrounding its gate run', () => {
    const deny = runHook(subagentPayload({ command: 'pnpm gate:scoped', run_in_background: true }))
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('issue #694')
  })

  it('END TO END: stays silent for the main session backgrounding the same command', () => {
    expect(runHook(mainPayload({ command: 'pnpm gate:scoped', run_in_background: true }))).toBeNull()
  })

  it('END TO END: stays silent for a foreground subagent call', () => {
    expect(runHook(subagentPayload({ command: 'pnpm gate:scoped', timeout: 600000 }))).toBeNull()
  })

  it('END TO END: blocks a subagent command with a trailing `&` (issue #964)', () => {
    const deny = runHook(subagentPayload({ command: 'pnpm gate:scoped &' }))
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('#964')
  })

  it('END TO END: blocks a subagent Monitor call (issue #964)', () => {
    const deny = runHook({ ...subagentPayload({}), tool_name: 'Monitor', tool_input: {} })
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('Monitor')
  })

  it('END TO END: stays silent for a main-session Monitor call', () => {
    expect(runHook({ ...mainPayload({}), tool_name: 'Monitor', tool_input: {} })).toBeNull()
  })

  it('END TO END: denies uninspectable stdin (not JSON) — fail-closed', () => {
    expect(runHook('not json')?.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('END TO END: stays silent on empty stdin (a bare manual run is not a tool call to police)', () => {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], { cwd: root, input: '', encoding: 'utf8' }).trim()
    expect(out).toBe('')
  })
})

describe('the subagent-background-guard.sh hot-path pre-filter', () => {
  function runPrefilter(payload: unknown): string {
    return execFileSync('sh', [PREFILTER], {
      cwd: root,
      input: typeof payload === 'string' ? payload : JSON.stringify(payload),
      encoding: 'utf8',
    }).trim()
  }

  it('exits silently on a foreground call without ever starting the guard — the hot path', () => {
    expect(runPrefilter(subagentPayload({ command: 'ls' }))).toBe('')
  })

  it('forwards a backgrounded subagent call to the guard, whose deny comes back on stdout', () => {
    const out = runPrefilter(subagentPayload({ command: 'pnpm gate:scoped', run_in_background: true }))
    expect(JSON.parse(out).hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('tolerates whitespace around the key\'s colon (serialization robustness)', () => {
    const out = runPrefilter('{"tool_name":"Bash","agent_id":"a","tool_input":{"run_in_background" : true}}')
    expect(JSON.parse(out).hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('forwards a textual false positive (key quoted inside the command), which the guard then allows', () => {
    const out = runPrefilter(mainPayload({ command: 'grep run_in_background docs; echo \'"run_in_background": true\'' }))
    expect(out).toBe('')
  })
})

describe('the --dry-run path (ADR-0004: an unattended hook needs a way to be exercised by hand)', () => {
  function dryRun(args: string[]): { context: string; decision: string; reason?: string } {
    return JSON.parse(execFileSync('pnpm', ['exec', 'tsx', SCRIPT, '--dry-run', ...args], { cwd: root, encoding: 'utf8' }))
  }

  it('accepts an explicit --context so each branch can be exercised directly', () => {
    expect(dryRun(['--tool', 'Bash', '--context', 'subagent', '--input', '{"run_in_background":true}']).decision).toBe('deny')
    expect(dryRun(['--tool', 'Bash', '--context', 'main', '--input', '{"run_in_background":true}']).decision).toBe('allow')
    expect(dryRun(['--tool', 'Bash', '--context', 'subagent', '--input', '{"command":"ls"}']).decision).toBe('allow')
  })

  it('derives the context from --payload exactly as the hook would', () => {
    const out = dryRun([
      '--tool', 'Bash',
      '--payload', '{"session_id":"s","agent_id":"a"}',
      '--input', '{"run_in_background":true}',
    ])
    expect(out.context).toBe('subagent')
    expect(out.decision).toBe('deny')
  })

  it('is fail-closed with no payload at all: context undeterminable, backgrounded call denied', () => {
    const out = dryRun(['--tool', 'Bash', '--input', '{"run_in_background":true}'])
    expect(out.context).toBe('undeterminable')
    expect(out.decision).toBe('deny')
  })
})
