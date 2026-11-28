// Coverage for the merge-without-close Stop hook (#2913; rationale in
// `scripts/hooks/merge-close-stop.ts`).
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
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
const merge = { type: 'assistant', message: { content: [{ type: 'tool_use', id: 'm1', name: 'Bash', input: { command: 'pnpm tsx scripts/github/merge-pr.ts 12' } }] } }
const merged = { type: 'user', message: { content: [{ type: 'tool_result', tool_use_id: 'm1', content: '{ "merged": true }' }] } }
const close = tool('Skill', { skill: 'close-session' })

describe('the Stop hook', () => {
  const run = (stopHookActive: boolean, records: object[] = [merge, merged], scratch = true) => {
    const dir = mkdtempSync(join(tmpdir(), 'merge-close-'))
    const transcript = join(dir, 't.jsonl')
    writeFileSync(transcript, records.map((r) => JSON.stringify(r)).join('\n'))
    if (scratch) {
      mkdirSync(join(dir, '.session-logs'))
      writeFileSync(join(dir, '.session-logs/pending.scratch.json'), '{}')
    }
    return runTsx(SCRIPT, {
      input: JSON.stringify({ transcript_path: transcript, stop_hook_active: stopHookActive }),
      env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
    })
  }
  it('blocks the stop once, with a reason', () => {
    const out = JSON.parse(run(false))
    expect(out.decision).toBe('block')
    expect(out.reason).toContain('close-session')
  })
  it('passes once close-session ran after the merge, or without a merge', () => {
    expect(run(false, [merge, merged, close])).toBe('')
    expect(run(false, [tool('Bash', { command: 'ls' })])).toBe('')
  })
  it('blocks when close-session ran only before the merge', () => {
    expect(JSON.parse(run(false, [close, merge, merged])).decision).toBe('block')
  })
  it('passes a re-entered stop', () => {
    expect(run(true)).toBe('')
  })
  describe('a PR the owner merged (#3714)', () => {
    // Real notification text from a scheduled run; the transcript wrapper is unverified.
    const text = '<wake reason="external-event" current-time="2026-11-26T16:34:33Z">\n  <event source="github" kind="pull_request.closed" from="system" trust="relay">\n    <!-- The PR has been merged. -->\n    {"outcome":"merged","pr":"feffef/terrarium#3693"}\n  </event>\n</wake>'
    const wrappers = {
      string: { type: 'user', message: { role: 'user', content: text } },
      blocks: { type: 'user', message: { role: 'user', content: [{ type: 'text', text }] } },
      queued: { type: 'attachment', attachment: { type: 'queued_command', prompt: text } },
    }
    it.each(Object.entries(wrappers))('blocks after a %s notification, until close-session runs', (_, rec) => {
      expect(JSON.parse(run(false, [rec])).decision).toBe('block')
      expect(run(false, [rec, close])).toBe('')
    })
    it('ignores a notice for a PR this session merged itself, but not for an unknown PR', () => {
      const notice = (n: number) => ({ type: 'user', message: { content: text.replace('#3693', `#${n}`) } })
      expect(run(false, [merge, merged, close, notice(12)])).toBe('')
      expect(JSON.parse(run(false, [merge, merged, close, notice(13)])).decision).toBe('block')
      expect(JSON.parse(run(false, [close, notice(12)])).decision).toBe('block')
    })
    it('ignores other events, closed-unmerged PRs and quoted text', () => {
      const other = text.replace('"outcome":"merged"', '"outcome":"closed"')
      expect(run(false, [{ type: 'user', message: { content: other } }])).toBe('')
      expect(run(false, [{ type: 'user', message: { content: text.replace('pull_request.closed', 'issue_comment.created').replace('merged', 'x') } }])).toBe('')
      expect(run(false, [tool('Bash', { command: `echo '${text}'` })])).toBe('')
    })
  })
  describe('closure without a log (#3728)', () => {
    const author = tool('Bash', { command: 'pnpm exec tsx scripts/session/log-session.ts --author x.json' })
    it('blocks when close-session or --author ran and no scratch exists', () => {
      for (const records of [[close], [author]]) {
        const out = JSON.parse(run(false, records, false))
        expect(out.decision).toBe('block')
        expect(out.reason).toContain('no log was written')
      }
    })
    it('does not count a dry run or a read of the script as an attempt', () => {
      for (const command of ['pnpm exec tsx scripts/session/log-session.ts --dry-run --author x.json', 'grep -n -- --author scripts/session/log-session.ts', 'cat scripts/session/log-session.ts | grep --author']) {
        expect(run(false, [tool('Bash', { command })], false)).toBe('')
      }
    })
    it('passes when the scratch exists, when nothing attempted closure, or on a re-entered stop', () => {
      expect(run(false, [close, author], true)).toBe('')
      expect(run(false, [tool('Bash', { command: 'ls' })], false)).toBe('')
      expect(run(true, [close], false)).toBe('')
    })
  })
})
