// Coverage for the tail-pipe guard (issue #873; rationale and detection
// contract in `scripts/tail-pipe-guard.ts`). Five tests: the pure core's
// decisions, and a fail-closed check of the real script's stdin path.
import { execFileSync } from 'node:child_process'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkTailPipe } from '../../scripts/tail-pipe-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'tail-pipe-guard.ts')

describe('checkTailPipe() — the pure predicate (issue #873)', () => {
  it('DENIES: a backgrounded command piped into a trailing tail/head/echo', () => {
    expect(checkTailPipe('Bash', { command: 'pnpm exec tsx scripts/session-frictions.ts | head -500', run_in_background: true })).toBe(
      'backgrounded',
    )
  })

  it('DENIES: a known long-runner piped into a trailing tail/head/echo, even in the foreground', () => {
    expect(checkTailPipe('Bash', { command: 'pnpm gate:scoped | tail -100' })).toBe('long-runner')
    expect(checkTailPipe('Bash', { command: 'pnpm exec vitest run | tail -50' })).toBe('long-runner')
  })

  it('ALLOWS: a short foreground command piped into tail/head', () => {
    expect(checkTailPipe('Bash', { command: 'git log --oneline | head -20' })).toBeNull()
    expect(checkTailPipe('Bash', { command: 'ls | head' })).toBeNull()
    // Multi-line Bash is routine here: the long-runner is a DIFFERENT statement
    // from the piped one, so matching the whole command would deny this.
    expect(checkTailPipe('Bash', { command: 'pnpm build > build.log 2>&1\ngit log --oneline | head -5' })).toBeNull()
  })

  it('ALLOWS: no trailing pipe, and a non-Bash tool', () => {
    expect(checkTailPipe('Bash', { command: 'pnpm gate:scoped > log.txt 2>&1' })).toBeNull()
    expect(checkTailPipe('Edit', { command: 'pnpm gate | tail', run_in_background: true })).toBeNull()
    expect(checkTailPipe('Bash', null)).toBeNull()
  })
})

describe('the CLI as the PreToolUse hook would invoke it (stdin JSON → stdout deny)', () => {
  it('END TO END: fails closed on unparseable stdin', () => {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], { cwd: root, input: 'not json', encoding: 'utf8' }).trim()
    const deny = out ? JSON.parse(out) : null
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('issue #873')
  })
})
