// Coverage for the commit-trailer guard (issue #921; rationale and detection
// contract in `scripts/commit-trailer-guard.ts`). The pure core is pinned
// directly; the CLI's stdin→deny-JSON path, `--dry-run`, and the hot-path
// pre-filter are exercised end to end against the real scripts — the same
// reviewability bar the sibling guards' specs set for an unattended hook
// (ADR-0004).
import { execFileSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { SESSION_TRAILER } from '../../scripts/git-helpers.ts'
import {
  checkCommitTrailer,
  commitInvocationIndex,
  denyOutputFor,
  formatGuardMessage,
} from '../../scripts/commit-trailer-guard.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'commit-trailer-guard.ts')
const PREFILTER = join(root, 'scripts', 'commit-trailer-guard.sh')

/** A PreToolUse payload in the shape the harness sends for a Bash call. */
function bashPayload(command: string): Record<string, unknown> {
  return {
    session_id: '657b9532-8ed5-5695-a08d-d87a60f7a665',
    transcript_path: '/root/.claude/projects/x/657b9532.jsonl',
    hook_event_name: 'PreToolUse',
    tool_name: 'Bash',
    tool_input: { command },
  }
}

/** The exact recorded regression: a hand-typed two-line ADR-0017 footer inside
 *  a `git commit -m` heredoc-style message (four sessions, 2026-08-07 through
 *  2026-08-12 — see the issue). */
const HAND_TYPED_COMMIT = [
  'git commit -m "fix(gate): quiet the dry-run fetch',
  '',
  'Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>',
  'Claude-Session: https://claude.ai/code/session_01QMtUQrTK3LHJhs1rom6i2x"',
].join('\n')

describe('commitInvocationIndex() — where a `git commit` starts in a command', () => {
  it('finds the plain invocation', () => {
    expect(commitInvocationIndex('git commit -m "x"')).toBe(0)
  })

  it('finds one behind global options — `-C <path>` and `--no-pager`', () => {
    expect(commitInvocationIndex('git -C /repo commit -m "x"')).toBe(0)
    expect(commitInvocationIndex('git --no-pager commit')).toBe(0)
    expect(commitInvocationIndex('git -c user.name=x commit -m "y"')).toBe(0)
  })

  it('finds one later in a chain, returning its own offset', () => {
    const command = 'git add -A && git commit -m "x"'
    expect(commitInvocationIndex(command)).toBe(command.indexOf('git commit'))
  })

  it('is -1 for a git call that is not a commit, and for no git at all', () => {
    expect(commitInvocationIndex('git log --oneline -5')).toBe(-1)
    expect(commitInvocationIndex('git show HEAD')).toBe(-1)
    expect(commitInvocationIndex('pnpm gate:scoped')).toBe(-1)
  })

  it('does not match `commit` as a bare word or inside a longer token', () => {
    expect(commitInvocationIndex('git log --grep=commit')).toBe(-1)
    expect(commitInvocationIndex('echo commit')).toBe(-1)
  })
})

describe('checkCommitTrailer() — the pure predicate (issue #921)', () => {
  it('DENIES: the recorded regression — a hand-typed two-line footer in `git commit -m`', () => {
    const finding = checkCommitTrailer('Bash', { command: HAND_TYPED_COMMIT })
    expect(finding?.kinds).toEqual(['coauthor', 'session'])
  })

  it('DENIES: the `Claude-Session:` half alone', () => {
    const command = 'git commit -m "docs: tidy\n\nClaude-Session: https://claude.ai/code/session_01ABC"'
    expect(checkCommitTrailer('Bash', { command })?.kinds).toEqual(['session'])
  })

  it('DENIES: the `Co-Authored-By:` half alone, pinned to the no-reply address', () => {
    const command = 'git commit -m "docs: tidy\n\nCo-Authored-By: Claude Opus 5 <noreply@anthropic.com>"'
    expect(checkCommitTrailer('Bash', { command })?.kinds).toEqual(['coauthor'])
  })

  it('DENIES: a MALFORMED hand-typed session trailer — the bare-id shape the hook would rewrite', () => {
    // Broader than SESSION_TRAILER on purpose: typing the line at all is the
    // mistake, and a value recalled from memory is exactly the bad case.
    const command = 'git commit -m "x\n\nClaude-Session: session_01ABC"'
    expect(checkCommitTrailer('Bash', { command })?.kinds).toEqual(['session'])
  })

  it('DENIES: a lower-cased `Co-authored-by:` — git trailers conventionally use that case', () => {
    const command = 'git commit -m "x\n\nCo-authored-by: Claude Opus 5 <noreply@anthropic.com>"'
    expect(checkCommitTrailer('Bash', { command })?.kinds).toEqual(['coauthor'])
  })

  it('DENIES: a heredoc-delivered message carrying the footer', () => {
    const command = [
      "git commit -F - <<'EOF'",
      'feat: a thing',
      '',
      'Claude-Session: https://claude.ai/code/session_01ABC',
      'EOF',
    ].join('\n')
    expect(checkCommitTrailer('Bash', { command })?.kinds).toEqual(['session'])
  })

  it('ALLOWS: the pattern the guard teaches — a plain commit with no trailer at all', () => {
    expect(checkCommitTrailer('Bash', { command: 'git commit -m "fix: a real message"' })).toBeNull()
  })

  it('ALLOWS: a HUMAN co-author at a non-Anthropic address — an ordinary, correct trailer', () => {
    const command = 'git commit -m "feat: pairing\n\nCo-Authored-By: Ada <ada@example.com>"'
    expect(checkCommitTrailer('Bash', { command })).toBeNull()
  })

  it('ALLOWS: reading trailers without committing — the guard only polices `git commit`', () => {
    expect(checkCommitTrailer('Bash', { command: 'git log -1 --format=%B | grep Claude-Session' })).toBeNull()
    expect(checkCommitTrailer('Bash', { command: 'grep -rn "Co-Authored-By" scripts/' })).toBeNull()
  })

  it('ALLOWS: a trailer mentioned BEFORE the commit — only the invocation onward is inspected', () => {
    const command = 'grep -c Claude-Session log.txt && git commit -m "chore: count"'
    expect(checkCommitTrailer('Bash', { command })).toBeNull()
  })

  it('ALLOWS: running the repo\'s own lander, which commits from inside a script', () => {
    expect(checkCommitTrailer('Bash', { command: 'pnpm exec tsx scripts/log-session.ts --land' })).toBeNull()
  })

  it('never touches another tool, whatever the input carries', () => {
    expect(checkCommitTrailer('Edit', { command: HAND_TYPED_COMMIT })).toBeNull()
    expect(checkCommitTrailer('Write', { command: HAND_TYPED_COMMIT })).toBeNull()
  })

  it('never throws on a null / non-object / command-less tool_input', () => {
    expect(checkCommitTrailer('Bash', null)).toBeNull()
    expect(checkCommitTrailer('Bash', 'a string')).toBeNull()
    expect(checkCommitTrailer('Bash', {})).toBeNull()
    expect(checkCommitTrailer('Bash', { command: 42 })).toBeNull()
  })

  it('CONTAINMENT: every message SESSION_TRAILER matches also trips the guard', () => {
    // Pins the guard's broader key check against the single-homed pattern
    // (git-helpers.ts) so the two cannot drift apart into disagreement.
    const canonical = 'Claude-Session: https://claude.ai/code/session_01QMtUQrTK3LHJhs1rom6i2x'
    expect(SESSION_TRAILER.test(canonical)).toBe(true)
    expect(checkCommitTrailer('Bash', { command: `git commit -m "x\n\n${canonical}"` })?.kinds).toEqual(['session'])
  })
})

describe('formatGuardMessage()', () => {
  it('names the issue, the mechanism that already lands the trailer, and the fix', () => {
    const msg = formatGuardMessage(checkCommitTrailer('Bash', { command: HAND_TYPED_COMMIT })!)
    expect(msg).toContain('issue #921')
    expect(msg).toContain('.githooks/commit-msg')
    expect(msg).toMatch(/NO trailer at all/)
  })

  it('names exactly the trailer line(s) that tripped it, so the fix is unambiguous', () => {
    const session = formatGuardMessage(
      checkCommitTrailer('Bash', { command: 'git commit -m "x\n\nClaude-Session: session_01ABC"' })!,
    )
    expect(session).toContain('Claude-Session:')
    expect(session).not.toContain('Co-Authored-By:')
  })
})

describe('denyOutputFor() — the PreToolUse control object', () => {
  it('emits a deny decision for a finding', () => {
    const out = denyOutputFor(checkCommitTrailer('Bash', { command: HAND_TYPED_COMMIT }))
    expect(out?.hookSpecificOutput.hookEventName).toBe('PreToolUse')
    expect(out?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(out?.hookSpecificOutput.permissionDecisionReason).toContain('issue #921')
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

  it('END TO END: blocks the hand-typed footer commit', () => {
    const deny = runHook(bashPayload(HAND_TYPED_COMMIT))
    expect(deny?.hookSpecificOutput.permissionDecision).toBe('deny')
    expect(deny?.hookSpecificOutput.permissionDecisionReason).toContain('issue #921')
  })

  it('END TO END: stays silent for an ordinary commit', () => {
    expect(runHook(bashPayload('git commit -m "fix: a real message"'))).toBeNull()
  })

  it('END TO END: stays silent for a non-commit Bash call', () => {
    expect(runHook(bashPayload('pnpm gate:scoped'))).toBeNull()
  })

  it('END TO END: denies uninspectable stdin (not JSON) — fail-closed', () => {
    expect(runHook('not json')?.hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('END TO END: stays silent on empty stdin (a bare manual run is not a tool call to police)', () => {
    const out = execFileSync('pnpm', ['exec', 'tsx', SCRIPT], { cwd: root, input: '', encoding: 'utf8' }).trim()
    expect(out).toBe('')
  })
})

describe('the commit-trailer-guard.sh hot-path pre-filter', () => {
  function runPrefilter(payload: unknown): string {
    return execFileSync('sh', [PREFILTER], {
      cwd: root,
      input: typeof payload === 'string' ? payload : JSON.stringify(payload),
      encoding: 'utf8',
    }).trim()
  }

  it('exits silently on an ordinary command without ever starting the guard — the hot path', () => {
    expect(runPrefilter(bashPayload('pnpm gate:scoped'))).toBe('')
    expect(runPrefilter(bashPayload('git commit -m "fix: a real message"'))).toBe('')
  })

  it('forwards a trailer-carrying commit to the guard, whose deny comes back on stdout', () => {
    const out = runPrefilter(bashPayload(HAND_TYPED_COMMIT))
    expect(JSON.parse(out).hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('forwards a textual false positive (trailer named but not committed), which the guard then allows', () => {
    expect(runPrefilter(bashPayload('grep -rn "Co-Authored-By" scripts/'))).toBe('')
  })
})

describe('the --dry-run path (ADR-0004: an unattended hook needs a way to be exercised by hand)', () => {
  function dryRun(args: string[]): { decision: string; kinds?: string[]; reason?: string } {
    return JSON.parse(execFileSync('pnpm', ['exec', 'tsx', SCRIPT, '--dry-run', ...args], { cwd: root, encoding: 'utf8' }))
  }

  it('prints the deny decision, and which trailer kinds tripped it, for a supplied input', () => {
    const out = dryRun(['--tool', 'Bash', '--input', JSON.stringify({ command: HAND_TYPED_COMMIT })])
    expect(out.decision).toBe('deny')
    expect(out.kinds).toEqual(['coauthor', 'session'])
  })

  it('prints the allow decision for an ordinary commit and a non-Bash tool', () => {
    expect(dryRun(['--tool', 'Bash', '--input', '{"command":"git commit -m \\"fix: x\\""}']).decision).toBe('allow')
    expect(dryRun(['--tool', 'Edit', '--input', '{"command":"git commit -m \\"x\\nClaude-Session: y\\""}']).decision).toBe('allow')
  })

  // The guard denies its own Bash probe when `--input` carries a trailer inline
  // — so inline JSON cannot express the inputs most worth probing. `--input-file`
  // is the reachable path; see the doc's false-positive shapes.
  it('reads the input from --input-file, the only way to probe a denying input from a shell', () => {
    const file = join(tmpdir(), 'commit-trailer-guard-dryrun.json')
    writeFileSync(file, JSON.stringify({ command: HAND_TYPED_COMMIT }))
    try {
      const out = dryRun(['--tool', 'Bash', '--input-file', file])
      expect(out.decision).toBe('deny')
      expect(out.kinds).toEqual(['coauthor', 'session'])
    } finally {
      rmSync(file, { force: true })
    }
  })

  it('fails loudly on an unreadable --input-file rather than silently allowing', () => {
    expect(() => dryRun(['--tool', 'Bash', '--input-file', join(tmpdir(), 'no-such-file.json')])).toThrow()
  })
})
