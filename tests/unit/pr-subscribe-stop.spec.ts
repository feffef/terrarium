// Coverage for the open-without-subscribe Stop hook (#2961; rationale in
// `scripts/hooks/pr-subscribe-stop.ts`).
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runTsx } from '../support/run-script.ts'

const SCRIPT = join(resolve(dirname(fileURLToPath(import.meta.url)), '../..'), 'scripts/hooks/pr-subscribe-stop.ts')

const tool = (name: string, input: Record<string, unknown> = {}) => ({
  type: 'assistant',
  message: { content: [{ type: 'tool_use', name, input }] },
})
const open = tool('mcp__github__create_pull_request')
const subscribe = tool('mcp__claude-code-remote__subscribe_pr_activity')

describe('the PR-subscribe Stop hook', () => {
  const run = (stopHookActive: boolean, records: object[] = [open]) => {
    const transcript = join(mkdtempSync(join(tmpdir(), 'pr-subscribe-')), 't.jsonl')
    writeFileSync(transcript, records.map((r) => JSON.stringify(r)).join('\n'))
    return runTsx(SCRIPT, { input: JSON.stringify({ transcript_path: transcript, stop_hook_active: stopHookActive }) })
  }
  it('blocks the stop once when a PR was opened and never subscribed to', () => {
    const out = JSON.parse(run(false))
    expect(out.decision).toBe('block')
    expect(out.reason).toContain('subscribe_pr_activity')
  })
  it('passes once the PR was subscribed to, in either order', () => {
    expect(run(false, [open, subscribe])).toBe('')
    expect(run(false, [subscribe, open])).toBe('')
  })
  it('passes without an opened PR', () => {
    expect(run(false, [tool('Bash', { command: 'ls' })])).toBe('')
  })
  it('passes a re-entered stop', () => {
    expect(run(true)).toBe('')
  })
})
