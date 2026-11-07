// Coverage for the merge-without-close Stop hook (#2913; rationale in
// `scripts/hooks/merge-close-stop.ts`).
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runTsx } from '../support/run-script.ts'

const SCRIPT = join(resolve(dirname(fileURLToPath(import.meta.url)), '../..'), 'scripts/hooks/merge-close-stop.ts')

const tool = (name: string, input: Record<string, unknown>) => ({
  type: 'assistant',
  message: { content: [{ type: 'tool_use', name, input }] },
})
const merge = tool('Bash', { command: 'pnpm tsx scripts/github/merge-pr.ts 12' })
const close = tool('Skill', { skill: 'close-session' })

describe('the Stop hook', () => {
  const run = (stopHookActive: boolean, records: object[] = [merge]) => {
    const transcript = join(mkdtempSync(join(tmpdir(), 'merge-close-')), 't.jsonl')
    writeFileSync(transcript, records.map((r) => JSON.stringify(r)).join('\n'))
    return runTsx(SCRIPT, { input: JSON.stringify({ transcript_path: transcript, stop_hook_active: stopHookActive }) })
  }
  it('blocks the stop once, with a reason', () => {
    const out = JSON.parse(run(false))
    expect(out.decision).toBe('block')
    expect(out.reason).toContain('close-session')
  })
  it('passes once close-session ran after the merge, or without a merge', () => {
    expect(run(false, [merge, close])).toBe('')
    expect(run(false, [tool('Bash', { command: 'ls' })])).toBe('')
  })
  it('blocks when close-session ran only before the merge', () => {
    expect(JSON.parse(run(false, [close, merge])).decision).toBe('block')
  })
  it('passes a re-entered stop', () => {
    expect(run(true)).toBe('')
  })
})
