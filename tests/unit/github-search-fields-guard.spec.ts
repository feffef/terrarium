// Coverage for the GitHub search fields guard (issue #1860; rationale in
// `scripts/hooks/github-search-fields-guard.ts`).
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { checkSearchFields, denyOutputFor, SEARCH_FIELDS_TOOLS } from '../../scripts/hooks/github-search-fields-guard.ts'
import { runTsx } from '../support/run-script.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const SCRIPT = join(root, 'scripts', 'hooks', 'github-search-fields-guard.ts')

describe('checkSearchFields() — the pure predicate', () => {
  describe.each(SEARCH_FIELDS_TOOLS)('%s', (tool) => {
    it.each([
      ['missing', { query: 'is:open guard' }],
      ['empty', { query: 'is:open', fields: [] }],
      ['not an array', { query: 'is:open', fields: 'number,title' }],
      ['null', { query: 'is:open', fields: null }],
    ])('DENIES fields %s', (_label, input) => {
      expect(checkSearchFields(tool, input)).toBe(true)
    })

    it('DENIES a null or non-object tool_input (no fields to find)', () => {
      expect(checkSearchFields(tool, null)).toBe(true)
      expect(checkSearchFields(tool, 'a string')).toBe(true)
    })

    it('ALLOWS a non-empty fields list, body included as an explicit opt-in', () => {
      expect(checkSearchFields(tool, { query: 'x', fields: ['number', 'title', 'state'] })).toBe(false)
      expect(checkSearchFields(tool, { query: 'x', fields: ['number', 'body'] })).toBe(false)
    })
  })

  it('never touches another tool', () => {
    expect(checkSearchFields('mcp__github__list_issues', {})).toBe(false)
    expect(checkSearchFields('mcp__github__search_code', {})).toBe(false)
    expect(checkSearchFields('Bash', {})).toBe(false)
  })
})

describe('denyOutputFor()', () => {
  it('builds a deny that names the fix and the integration doc', () => {
    const reason = denyOutputFor('mcp__github__search_issues', {})?.hookSpecificOutput.permissionDecisionReason
    expect(reason).toContain('fields')
    expect(reason).toContain('docs/agents/github-integration.md')
    expect(reason).toContain('issue #1860')
  })

  it('returns null for an allowed call', () => {
    expect(denyOutputFor('mcp__github__search_issues', { fields: ['number'] })).toBeNull()
  })
})

describe('the CLI as the PreToolUse hook invokes it', () => {
  const run = (stdin: string) => runTsx(SCRIPT, { input: stdin }).trim()
  const payload = (tool_input: unknown) =>
    JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: 'mcp__github__search_pull_requests', tool_input })

  it('denies a call without fields', () => {
    expect(JSON.parse(run(payload({ query: 'x' }))).hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('stays silent for a call with fields', () => {
    expect(run(payload({ query: 'x', fields: ['number'] }))).toBe('')
  })

  it('denies an unparseable payload (fails closed)', () => {
    expect(JSON.parse(run('not json')).hookSpecificOutput.permissionDecision).toBe('deny')
  })

  it('--dry-run prints the decision', () => {
    const out = JSON.parse(runTsx(SCRIPT, { args: ['--dry-run', '--tool', 'mcp__github__search_issues', '--input', '{}'] }))
    expect(out.decision).toBe('deny')
  })
})
