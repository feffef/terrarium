// Coverage for the create_session repo guard (issue #3190; rationale in
// `scripts/hooks/create-session-repo-guard.ts`).
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkCreateSessionRepo, denyOutputFor } from '../../scripts/hooks/create-session-repo-guard.ts'
import { runTsx } from '../support/run-script.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'hooks', 'create-session-repo-guard.ts')
const TOOL = 'mcp__claude-code-remote__create_session'

describe('checkCreateSessionRepo() — the pure predicate', () => {
  it('ALLOWS a call with source_url', () => {
    expect(checkCreateSessionRepo(TOOL, { source_url: 'https://github.com/feffef/terrarium', prompt: 'x' })).toBe(false)
  })

  it.each([
    ['missing', { prompt: 'x' }],
    ['an empty string', { prompt: 'x', source_url: '' }],
    ['whitespace only', { source_url: '  ' }],
    ['null', { source_url: null }],
    ['not a string', { source_url: 5 }],
  ])('DENIES source_url %s', (_label, input) => {
    expect(checkCreateSessionRepo(TOOL, input)).toBe(true)
  })

  it('DENIES a null or non-object tool_input', () => {
    expect(checkCreateSessionRepo(TOOL, null)).toBe(true)
    expect(checkCreateSessionRepo(TOOL, 'a string')).toBe(true)
  })

  it('ignores another tool', () => {
    expect(checkCreateSessionRepo('mcp__claude-code-remote__send_message', {})).toBe(false)
    expect(checkCreateSessionRepo('Bash', {})).toBe(false)
  })
})

describe('denyOutputFor()', () => {
  it('names the cause and the fix', () => {
    const reason = denyOutputFor(TOOL, {})?.hookSpecificOutput.permissionDecisionReason
    expect(reason).toContain('no repository')
    expect(reason).toContain('source_url')
    expect(reason).toContain('issue #3190')
  })

  it('returns null for an allowed call', () => {
    expect(denyOutputFor(TOOL, { source_url: 'https://github.com/feffef/terrarium' })).toBeNull()
  })
})

describe('the CLI as the PreToolUse hook invokes it', () => {
  const run = (stdin: string) => runTsx(SCRIPT, { input: stdin }).trim()
  const payload = (tool_input: unknown) => JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: TOOL, tool_input })

  it('denies a call without source_url', () => {
    expect(JSON.parse(run(payload({ prompt: 'x' }))).hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('stays silent for a call with source_url', () => {
    expect(run(payload({ source_url: 'https://github.com/feffef/terrarium' }))).toBe('')
  })

  it('denies an unparseable payload (fails closed)', () => {
    expect(JSON.parse(run('not json')).hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('--dry-run prints the decision', () => {
    const out = JSON.parse(runTsx(SCRIPT, { args: ['--dry-run', '--tool', TOOL, '--input', '{}'] }))
    expect(out.decision).toBe('deny')
  })
})
