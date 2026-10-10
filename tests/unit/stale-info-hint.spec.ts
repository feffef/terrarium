// Coverage for the stale-info push hint (issue #1610; contract in
// `scripts/stale-info-hint.ts`).
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { staleInfoHint } from '../../scripts/stale-info-hint.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const PUSH = 'git push --force-with-lease origin claude/x'
const REJECTED = 'To https://github.com/o/r\n ! [rejected]        claude/x -> claude/x (stale info)\nerror: failed to push some refs'
const failure = (command: string, error: string) => ({ tool_name: 'Bash', tool_input: { command }, error })

describe('staleInfoHint() — the pure core', () => {
  it('hints on a failed lease push whose output says stale info', () => {
    expect(staleInfoHint(failure(PUSH, `Exit code 1\n${REJECTED}`))).toContain('git remote prune origin')
  })

  it('hints on a PostToolUse payload too (the push was chained before a step that succeeded)', () => {
    const payload = { tool_name: 'Bash', tool_input: { command: `${PUSH} || true` }, tool_response: { stdout: '', stderr: REJECTED } }
    expect(staleInfoHint(payload)).toContain('git remote prune origin')
  })

  it('says nothing for a successful push or a push failing for another reason', () => {
    expect(staleInfoHint(failure(PUSH, 'To https://github.com/o/r\n   abc..def  claude/x -> claude/x'))).toBeNull()
    expect(staleInfoHint(failure(PUSH, ' ! [rejected]        claude/x -> claude/x (non-fast-forward)'))).toBeNull()
    expect(staleInfoHint(failure(PUSH, ' ! [remote rejected] claude/x -> claude/x (fetch first)'))).toBeNull()
  })

  it('says nothing when the command is not a git push', () => {
    expect(staleInfoHint(failure('cat old-push.log', REJECTED))).toBeNull()
    expect(staleInfoHint(failure('git fetch origin main', REJECTED))).toBeNull()
    expect(staleInfoHint({ tool_name: 'Read', tool_input: { command: PUSH }, error: REJECTED })).toBeNull()
  })

  it('never combines matches across lines', () => {
    // `git` on one line, `push` on another: not a push.
    expect(staleInfoHint(failure('git status\necho push', REJECTED))).toBeNull()
    // The rejection marker and "(stale info)" on different lines: not git's rejection line.
    expect(staleInfoHint(failure(PUSH, ' ! [rejected] claude/x -> claude/x\nnote: (stale info) is discussed in #1610'))).toBeNull()
    // Prose mentioning stale info, no rejection line.
    expect(staleInfoHint(failure(PUSH, 'a "stale info" push failure is explained in pr-workflow'))).toBeNull()
  })

  it('never throws on a malformed payload', () => {
    for (const p of [null, undefined, 'x', 42, {}, { tool_name: 'Bash' }, { tool_name: 'Bash', tool_input: null, error: REJECTED }]) {
      expect(staleInfoHint(p)).toBeNull()
    }
  })
})

describe('the hook entry (sh pre-filter → tsx)', () => {
  const run = (stdin: string) =>
    spawnSync('sh', ['scripts/stale-info-hint.sh'], { cwd: root, input: stdin, encoding: 'utf8' })

  it('emits additionalContext under the event that fired', () => {
    for (const event of ['PostToolUse', 'PostToolUseFailure']) {
      const { stdout, status } = run(JSON.stringify({ hook_event_name: event, ...failure(PUSH, REJECTED) }))
      expect(status).toBe(0)
      const out = JSON.parse(stdout).hookSpecificOutput
      expect(out.hookEventName).toBe(event)
      expect(out.additionalContext).toContain('--force-with-lease')
    }
  })

  it('fails open: invalid JSON that passes the pre-filter writes nothing and exits 0', () => {
    const { stdout, status } = run('{ not json (stale info)')
    expect(status).toBe(0)
    expect(stdout).toBe('')
  })

  it('writes nothing for a payload the pre-filter drops', () => {
    const { stdout, status } = run(JSON.stringify(failure(PUSH, 'Everything up-to-date')))
    expect(status).toBe(0)
    expect(stdout).toBe('')
  })
})
