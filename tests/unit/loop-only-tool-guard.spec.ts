// Coverage for the /loop-only tool guard (issue #814). Two doc-only fixes
// (#241, #425) failed to stop `ScheduleWakeup` being called in plain scheduled
// and interactive sessions, so the owner chose a mechanical guard. Everything
// that decides allow/deny is pure — `detectSessionMode` over parsed transcript
// records, `checkLoopOnlyToolCall` over (tool, input, mode) — and is pinned
// here directly; the CLI's stdin→deny-JSON and `--dry-run` paths are exercised
// end to end against the real script so the blocked call is proven, not merely
// asserted in the abstract.
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  checkLoopOnlyToolCall,
  denyOutputFor,
  detectSessionMode,
  formatGuardMessage,
  LOOP_ONLY_TOOLS,
} from '../../scripts/loop-only-tool-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'loop-only-tool-guard.ts')

/** A transcript `user` record carrying a slash-command expansion, in the exact
 *  shape a live transcript uses (verified against a real jsonl, not guessed). */
function commandTurn(name: string): Record<string, unknown> {
  return {
    type: 'user',
    message: { role: 'user', content: `<command-message>${name}</command-message>\n<command-name>/${name}</command-name>` },
  }
}

/** A transcript `assistant` record carrying one tool_use block. */
function toolUseTurn(name: string, input: Record<string, unknown>): Record<string, unknown> {
  return { type: 'assistant', message: { role: 'assistant', content: [{ type: 'tool_use', name, input }] } }
}

describe('detectSessionMode() — the pure mode reader', () => {
  it('reads `loop` from a /loop slash-command expansion in a user turn', () => {
    expect(detectSessionMode([commandTurn('loop')])).toBe('loop')
  })

  it('reads `loop` from a Skill tool_use naming the loop skill', () => {
    expect(detectSessionMode([toolUseTurn('Skill', { skill: 'loop' })])).toBe('loop')
  })

  it('reads `non-loop` for a plain scheduled session — the shape every recorded misuse had', () => {
    expect(detectSessionMode([commandTurn('frictions-to-fixes'), toolUseTurn('Agent', { prompt: 'survey' })])).toBe('non-loop')
  })

  it('does not mistake a lookalike command (/loop-something) for a real /loop', () => {
    expect(detectSessionMode([commandTurn('loop-review')])).toBe('non-loop')
  })

  it('does not take the word "loop" quoted inside a tool_result as evidence of a loop', () => {
    const readingALogAboutLoops: Record<string, unknown> = {
      type: 'user',
      message: { role: 'user', content: [{ type: 'tool_result', content: '<command-name>/loop</command-name>' }] },
    }
    expect(detectSessionMode([commandTurn('digest'), readingALogAboutLoops])).toBe('non-loop')
  })

  it('is `undeterminable` when the transcript is unavailable (null) or empty — fail-closed input', () => {
    expect(detectSessionMode(null)).toBe('undeterminable')
    expect(detectSessionMode([])).toBe('undeterminable')
  })
})

describe('checkLoopOnlyToolCall() — the pure predicate (issue #814)', () => {
  it('DENIES: the recorded regression — ScheduleWakeup in a plain scheduled, non-/loop session', () => {
    const finding = checkLoopOnlyToolCall('ScheduleWakeup', { seconds: 300 }, 'non-loop')
    expect(finding?.tool).toBe('ScheduleWakeup')
    expect(finding?.mode).toBe('non-loop')
  })

  it('ALLOWS: the same call inside a /loop session — the tool\'s one valid mode', () => {
    expect(checkLoopOnlyToolCall('ScheduleWakeup', { seconds: 300 }, 'loop')).toBeNull()
  })

  it('FAILS CLOSED: an undeterminable mode denies', () => {
    expect(checkLoopOnlyToolCall('ScheduleWakeup', { seconds: 300 }, 'undeterminable')?.mode).toBe('undeterminable')
  })

  it('never touches a tool outside the registry, in any mode', () => {
    expect(checkLoopOnlyToolCall('Bash', { command: 'ls' }, 'non-loop')).toBeNull()
    expect(checkLoopOnlyToolCall('Bash', { command: 'ls' }, 'undeterminable')).toBeNull()
  })

  it('exempts the cancel call (`stop: true`) in every mode — denying it would strand a pending wakeup', () => {
    expect(checkLoopOnlyToolCall('ScheduleWakeup', { stop: true }, 'non-loop')).toBeNull()
    expect(checkLoopOnlyToolCall('ScheduleWakeup', { stop: true }, 'undeterminable')).toBeNull()
  })

  it('does not let a falsy/absent `stop` masquerade as the cancel exemption', () => {
    expect(checkLoopOnlyToolCall('ScheduleWakeup', { stop: false, seconds: 60 }, 'non-loop')).not.toBeNull()
    expect(checkLoopOnlyToolCall('ScheduleWakeup', { seconds: 60 }, 'non-loop')).not.toBeNull()
  })

  it('never throws on a null / non-object tool_input — still denied outside the valid mode', () => {
    expect(checkLoopOnlyToolCall('ScheduleWakeup', null, 'non-loop')).not.toBeNull()
    expect(checkLoopOnlyToolCall('ScheduleWakeup', 'a string', 'non-loop')).not.toBeNull()
    expect(checkLoopOnlyToolCall('ScheduleWakeup', undefined, 'loop')).toBeNull()
  })

  it('is registry-driven: a second entry needs no predicate change', () => {
    const registry = [{ tool: 'SomeFutureLoopTool', instead: ['do nothing'] }]
    expect(checkLoopOnlyToolCall('SomeFutureLoopTool', {}, 'non-loop', registry)).not.toBeNull()
    expect(checkLoopOnlyToolCall('ScheduleWakeup', {}, 'non-loop', registry)).toBeNull()
  })
})

describe('the seed registry', () => {
  it('carries ScheduleWakeup, with a named alternative for every recorded misuse situation', () => {
    const entry = LOOP_ONLY_TOOLS.find((t) => t.tool === 'ScheduleWakeup')
    expect(entry).toBeDefined()
    expect(entry!.instead.length).toBeGreaterThan(0)
  })
})

describe('formatGuardMessage()', () => {
  it('names the tool, the one valid mode, the real consequence, and the alternatives', () => {
    const msg = formatGuardMessage(checkLoopOnlyToolCall('ScheduleWakeup', {}, 'non-loop')!)
    expect(msg).toContain('issue #814')
    expect(msg).toContain('ScheduleWakeup')
    expect(msg).toContain('/loop')
    expect(msg).toContain('send_later')
    expect(msg).toContain('stop: true')
  })

  it('says plainly that an undeterminable mode is a fail-closed denial', () => {
    const msg = formatGuardMessage(checkLoopOnlyToolCall('ScheduleWakeup', {}, 'undeterminable')!)
    expect(msg).toMatch(/fails? CLOSED/i)
  })
})

describe('denyOutputFor() — the PreToolUse control object', () => {
  it('emits a deny decision for a finding', () => {
    const out = denyOutputFor(checkLoopOnlyToolCall('ScheduleWakeup', {}, 'non-loop'))
    expect(out?.hookSpecificOutput.hookEventName).toBe('PreToolUse')
    expect(out?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(out?.hookSpecificOutput.permissionDecisionReason).toContain('/loop')
  })

  it('emits nothing (null) for an allowed call, so the call proceeds untouched', () => {
    expect(denyOutputFor(null)).toBeNull()
  })
})

describe('the CLI as the PreToolUse hook would invoke it (stdin JSON → stdout deny)', () => {
  function runHook(payload: unknown): { hookSpecificOutput: Record<string, string> } | null {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], {
      cwd: root,
      input: JSON.stringify(payload),
      encoding: 'utf8',
    }).trim()
    return out ? JSON.parse(out) : null
  }

  it('END TO END: blocks ScheduleWakeup when no transcript is readable (fail-closed)', () => {
    const deny = runHook({ hook_event_name: 'PreToolUse', tool_name: 'ScheduleWakeup', tool_input: { seconds: 300 } })
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('issue #814')
  })

  it('END TO END: stays silent for a tool outside the registry', () => {
    expect(runHook({ hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'ls' } })).toBeNull()
  })

  it('END TO END: stays silent on empty stdin (a bare manual run is not a tool call to police)', () => {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], { cwd: root, input: '', encoding: 'utf8' }).trim()
    expect(out).toBe('')
  })
})

describe('the --dry-run path (ADR-0004: an unattended hook needs a way to be exercised by hand)', () => {
  function dryRun(args: string[]): { mode: string; decision: string; reason?: string } {
    return JSON.parse(execFileSync('pnpm', ['exec', 'tsx', SCRIPT, '--dry-run', ...args], { cwd: root, encoding: 'utf8' }))
  }

  it('reports the deny decision and the mode it read, running nothing', () => {
    const out = dryRun(['--tool', 'ScheduleWakeup'])
    expect(out.mode).toBe('undeterminable')
    expect(out.decision).toBe('deny')
    expect(out.reason).toContain('ScheduleWakeup')
  })

  it('accepts an explicit --mode so each branch can be exercised without a transcript', () => {
    expect(dryRun(['--tool', 'ScheduleWakeup', '--mode', 'loop']).decision).toBe('allow')
    expect(dryRun(['--tool', 'ScheduleWakeup', '--mode', 'non-loop']).decision).toBe('deny')
  })

  it('accepts --input so the cancel exemption can be checked by hand', () => {
    expect(dryRun(['--tool', 'ScheduleWakeup', '--mode', 'non-loop', '--input', '{"stop":true}']).decision).toBe('allow')
  })
})
