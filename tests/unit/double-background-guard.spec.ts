// Coverage for the double-background guard (issue #1208; rationale and
// detection contract in `scripts/double-background-guard.ts`). The pure core
// is pinned directly; the CLI's stdin→deny-JSON path, `--dry-run`, and the
// hot-path pre-filter are exercised end to end against the real scripts —
// the same reviewability bar the sibling guards' specs set for an
// unattended hook (ADR-0004). Per docs/agents/guards.md's warning, these
// assertions target the underlying property (both signals present, either
// alone, adversarial command text) rather than a handful of hand-picked
// substrings.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkDoubleBackground, denyOutputFor, formatGuardMessage } from '../../scripts/double-background-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'double-background-guard.ts')
const PREFILTER = join(root, 'scripts', 'double-background-guard.sh')

/** A PreToolUse payload in the shape the harness sends for a Bash call —
 *  identity fields present but irrelevant here, since this guard is
 *  deliberately caller-agnostic (issue #1208: no `detectAgentContext` gate). */
function bashPayload(toolInput: Record<string, unknown>): Record<string, unknown> {
  return {
    session_id: '657b9532-8ed5-5695-a08d-d87a60f7a665',
    transcript_path: '/root/.claude/projects/x/657b9532.jsonl',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: toolInput,
  }
}

describe('checkDoubleBackground() — the pure predicate (issue #1208)', () => {
  it('DENIES: run_in_background:true stacked on a trailing `&`', () => {
    expect(checkDoubleBackground('Bash', { command: 'pnpm gate:scoped &', run_in_background: true })).toBe(true)
  })

  it('DENIES: run_in_background:true stacked on `nohup ... &`, the recorded regression', () => {
    expect(checkDoubleBackground('Bash', { command: 'nohup pnpm gate:scoped &', run_in_background: true })).toBe(true)
  })

  it('DENIES: run_in_background:true stacked on the recorded merge-pr.ts regression shape', () => {
    expect(
      checkDoubleBackground('Bash', { command: 'pnpm exec tsx scripts/merge-pr.ts 123 &', run_in_background: true }),
    ).toBe(true)
  })

  it('DENIES: a bare mid-command `&`, not just a trailing one, stacked with the flag', () => {
    expect(checkDoubleBackground('Bash', { command: 'pnpm gate:scoped & echo started', run_in_background: true })).toBe(
      true,
    )
  })

  it('ALLOWS: run_in_background:true alone, no `&` in the command — the ordinary, correct way to background', () => {
    expect(checkDoubleBackground('Bash', { command: 'pnpm gate:scoped', run_in_background: true })).toBe(false)
    expect(checkDoubleBackground('Bash', { command: 'pnpm exec vitest run', run_in_background: true })).toBe(false)
  })

  it('ALLOWS: a trailing `&` alone, no run_in_background flag set — the shell backgrounds its own job', () => {
    expect(checkDoubleBackground('Bash', { command: 'pnpm gate:scoped &' })).toBe(false)
    expect(checkDoubleBackground('Bash', { command: 'nohup pnpm gate:scoped &' })).toBe(false)
  })

  it('ALLOWS: run_in_background:false stacked with a `&` — the flag is not actually set', () => {
    expect(checkDoubleBackground('Bash', { command: 'pnpm gate:scoped &', run_in_background: false })).toBe(false)
  })

  it('ALLOWS: a truthy-but-not-true run_in_background value (the harness sends a boolean)', () => {
    expect(checkDoubleBackground('Bash', { command: 'pnpm gate:scoped &', run_in_background: 'true' })).toBe(false)
  })

  it('ALLOWS: `&&` chaining and `2>&1`/`&>` redirection with run_in_background:true — not backgrounding operators', () => {
    expect(checkDoubleBackground('Bash', { command: 'pnpm build && pnpm test', run_in_background: true })).toBe(false)
    expect(checkDoubleBackground('Bash', { command: 'pnpm build > out.log 2>&1', run_in_background: true })).toBe(false)
    expect(checkDoubleBackground('Bash', { command: 'pnpm build &> out.log', run_in_background: true })).toBe(false)
  })

  it('ALLOWS: a literal `&` inside a quoted string argument, even with run_in_background:true', () => {
    expect(checkDoubleBackground('Bash', { command: 'echo "foo & bar"', run_in_background: true })).toBe(false)
    expect(checkDoubleBackground('Bash', { command: "echo 'run in background &'", run_in_background: true })).toBe(false)
  })

  it('ALLOWS: a backslash-escaped `&` outside quotes, even with run_in_background:true', () => {
    expect(checkDoubleBackground('Bash', { command: 'echo foo \\& bar', run_in_background: true })).toBe(false)
  })

  it('never touches another tool, whatever the input carries', () => {
    expect(checkDoubleBackground('Monitor', { command: 'pnpm gate:scoped &', run_in_background: true })).toBe(false)
    expect(checkDoubleBackground('Edit', { command: 'pnpm gate:scoped &', run_in_background: true })).toBe(false)
  })

  it('never throws on a null / non-object / command-less tool_input', () => {
    expect(checkDoubleBackground('Bash', null)).toBe(false)
    expect(checkDoubleBackground('Bash', 'a string')).toBe(false)
    expect(checkDoubleBackground('Bash', {})).toBe(false)
    expect(checkDoubleBackground('Bash', { run_in_background: true })).toBe(false)
    expect(checkDoubleBackground('Bash', { command: 42, run_in_background: true })).toBe(false)
  })

  it('DENIES a multi-line command carrying `&` on a later line — the whole command text is scanned, not just the first line', () => {
    const command = 'cd /repo\nnohup pnpm gate:scoped &'
    expect(checkDoubleBackground('Bash', { command, run_in_background: true })).toBe(true)
  })
})

describe('formatGuardMessage()', () => {
  it('names the issue, the pick-one-mechanism fix, and the sibling guard it is not', () => {
    const msg = formatGuardMessage()
    expect(msg).toContain('issue #1208')
    expect(msg).toMatch(/pick ONE background mechanism/)
    expect(msg).toContain('subagent-background-guard.ts')
  })
})

describe('denyOutputFor() — the PreToolUse control object', () => {
  it('emits a deny decision for a finding', () => {
    const out = denyOutputFor(true)
    expect(out?.hookSpecificOutput.hookEventName).toBe('PreToolUse')
    expect(out?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(out?.hookSpecificOutput.permissionDecisionReason).toContain('issue #1208')
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

  it('END TO END: blocks the double-backgrounded call, for any caller context', () => {
    const deny = runHook(bashPayload({ command: 'nohup pnpm gate:scoped &', run_in_background: true }))
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('issue #1208')
  })

  it('END TO END: stays silent for run_in_background:true alone', () => {
    expect(runHook(bashPayload({ command: 'pnpm gate:scoped', run_in_background: true }))).toBeNull()
  })

  it('END TO END: stays silent for a trailing `&` alone', () => {
    expect(runHook(bashPayload({ command: 'pnpm gate:scoped &' }))).toBeNull()
  })

  it('END TO END: denies uninspectable stdin (not JSON) — fail-closed', () => {
    expect(runHook('not json')?.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('END TO END: stays silent on empty stdin (a bare manual run is not a tool call to police)', () => {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], { cwd: root, input: '', encoding: 'utf8' }).trim()
    expect(out).toBe('')
  })
})

describe('the double-background-guard.sh hot-path pre-filter', () => {
  function runPrefilter(payload: unknown): string {
    return execFileSync('sh', [PREFILTER], {
      cwd: root,
      input: typeof payload === 'string' ? payload : JSON.stringify(payload),
      encoding: 'utf8',
    }).trim()
  }

  it('exits silently on a plain foreground call without ever starting the guard — the hot path', () => {
    expect(runPrefilter(bashPayload({ command: 'pnpm gate:scoped' }))).toBe('')
  })

  it('exits silently when only one of the two signals is present', () => {
    expect(runPrefilter(bashPayload({ command: 'pnpm gate:scoped', run_in_background: true }))).toBe('')
    expect(runPrefilter(bashPayload({ command: 'pnpm gate:scoped &' }))).toBe('')
  })

  it('forwards a double-backgrounded call to the guard, whose deny comes back on stdout', () => {
    const out = runPrefilter(bashPayload({ command: 'nohup pnpm gate:scoped &', run_in_background: true }))
    expect(JSON.parse(out).hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('tolerates whitespace around the run_in_background key\'s colon (serialization robustness)', () => {
    const out = runPrefilter('{"tool_name":"Bash","tool_input":{"command":"cmd &","run_in_background" : true}}')
    expect(JSON.parse(out).hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('forwards a textual false positive (the payload mentions the key and an `&` in prose, but run_in_background is not actually set), which the guard then allows', () => {
    const out = runPrefilter(
      bashPayload({ command: 'grep -c "\\"run_in_background\\": true" docs/agents/guards.md; echo "foo & bar"' }),
    )
    expect(out).toBe('')
  })
})

describe('the --dry-run path (ADR-0004: an unattended hook needs a way to be exercised by hand)', () => {
  function dryRun(args: string[]): { decision: string; reason?: string } {
    return JSON.parse(execFileSync('pnpm', ['exec', 'tsx', SCRIPT, '--dry-run', ...args], { cwd: root, encoding: 'utf8' }))
  }

  it('prints the deny decision for a double-backgrounded input', () => {
    const out = dryRun(['--tool', 'Bash', '--input', JSON.stringify({ command: 'pnpm gate:scoped &', run_in_background: true })])
    expect(out.decision).toBe('deny')
    expect(out.reason).toContain('issue #1208')
  })

  it('prints the allow decision for a single-signal input and a non-Bash tool', () => {
    expect(dryRun(['--tool', 'Bash', '--input', '{"command":"pnpm gate:scoped","run_in_background":true}']).decision).toBe(
      'allow',
    )
    expect(dryRun(['--tool', 'Edit', '--input', '{"command":"pnpm gate:scoped \\u0026","run_in_background":true}']).decision).toBe(
      'allow',
    )
  })

  // The guard denies its own Bash probe when `--input` carries a double-backgrounded
  // command inline — so inline JSON cannot express the input most worth probing.
  // `--input-file` is the reachable path, mirroring commit-trailer-guard.ts's spec.
  it('reads the input from --input-file, the only way to probe a denying input from a shell', () => {
    const dir = mkdtempSync(join(tmpdir(), 'double-background-guard-'))
    const file = join(dir, 'dryrun.json')
    writeFileSync(file, JSON.stringify({ command: 'nohup pnpm gate:scoped &', run_in_background: true }))
    try {
      const out = dryRun(['--tool', 'Bash', '--input-file', file])
      expect(out.decision).toBe('deny')
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it('fails loudly on an unreadable --input-file rather than silently allowing', () => {
    expect(() => dryRun(['--tool', 'Bash', '--input-file', join(tmpdir(), 'no-such-file.json')])).toThrow()
  })
})
