// Coverage for scripts/guard-wrap.sh (issue #1223): the shared wiring that
// stops a fail-closed guard's crash-before-`runIfMain`'s-try/catch (a `tsx`
// cold-start failure, a module-resolution error, a throw during import) from
// reading as a silent allow. A plain unit test can't observe the live
// `.claude/settings.json`-wired interception (docs/agents/guards.md's own
// limit on what these specs can prove) — this pins the wrapper's own
// pass-through/synthesize logic by invoking it directly against deliberately
// well- and ill-behaved fake commands. The PR description carries the
// complementary live probe against a real guard.
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const WRAPPER = join(root, 'scripts', 'guard-wrap.sh')

/** Runs the wrapper with `sh`, feeding `stdin` through untouched — the same
 *  shape `.claude/settings.json` invokes it with. */
function runWrapper(args: string[], stdin = '{}'): { stdout: string; status: number } {
  try {
    const stdout = execFileSync('sh', [WRAPPER, ...args], { cwd: root, input: stdin, encoding: 'utf8' })
    return { stdout, status: 0 }
  } catch (err) {
    const e = err as { stdout?: string; status?: number }
    return { stdout: e.stdout ?? '', status: e.status ?? 1 }
  }
}

describe('scripts/guard-wrap.sh (issue #1223)', () => {
  it('passes through a clean exit-0 ALLOW (no stdout) unchanged', () => {
    const { stdout, status } = runWrapper(['test-guard', '--', 'true'])
    expect(stdout).toBe('')
    expect(status).toBe(0)
  })

  it('passes through a clean exit-0 DENY (real deny JSON) byte for byte', () => {
    const denyJson = '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"real deny"}}'
    // A fake "guard" that behaves like every real one: prints its own deny
    // JSON and still exits 0 (main() "Always exits 0" — the guards' own
    // documented contract, e.g. commit-trailer-guard.ts).
    const { stdout, status } = runWrapper(['test-guard', '--', 'printf', '%s', denyJson])
    expect(stdout).toBe(denyJson)
    expect(status).toBe(0)
  })

  it('SYNTHESIZES a deny when the wrapped command crashes with no output — the bug this closes', () => {
    const { stdout, status } = runWrapper(['test-guard', '--', 'false'])
    expect(status).toBe(0) // the wrapper itself never propagates the crash as its own nonzero exit
    const deny = JSON.parse(stdout)
    expect(deny.hookSpecificOutput.hookEventName).toBe('PreToolUse')
    expect(deny.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny.hookSpecificOutput.permissionDecisionReason).toContain('test-guard')
    expect(deny.hookSpecificOutput.permissionDecisionReason).toContain('issue #1223')
  })

  it('names the guard and reports the real exit code in the synthesized reason', () => {
    const { stdout } = runWrapper(['my-fancy-guard', '--', 'sh', '-c', 'exit 42'])
    const deny = JSON.parse(stdout)
    expect(deny.hookSpecificOutput.permissionDecisionReason).toContain('my-fancy-guard')
    expect(deny.hookSpecificOutput.permissionDecisionReason).toMatch(/exited 42 with no output/)
  })

  it('does NOT synthesize a deny for a nonzero exit that DID print something', () => {
    // Not a shape any current guard produces, but the wrapper's contract is
    // "empty stdout is what makes a nonzero exit ambiguous" — real output
    // alongside a nonzero exit is passed through untouched rather than
    // guessed at.
    const { stdout, status } = runWrapper(['test-guard', '--', 'sh', '-c', 'printf not-empty; exit 1'])
    expect(status).toBe(0)
    expect(stdout).toBe('not-empty')
  })

  it('forwards stdin to the wrapped command unchanged', () => {
    const { stdout } = runWrapper(['test-guard', '--', 'cat'], '{"tool_name":"Bash"}')
    expect(stdout).toBe('{"tool_name":"Bash"}')
  })
})
