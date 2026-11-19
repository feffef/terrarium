import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { reviewedShasFromTranscript, reviewerAgentIds } from '../../scripts/session/review-proof.ts'

const SHA = '0123456789abcdef0123456789abcdef01234567'
const jsonl = (...recs: object[]) => recs.map((r) => JSON.stringify(r)).join('\n')
const toolUse = (name: string, input: object, id = 'toolu_1') => ({
  type: 'assistant',
  message: { content: [{ type: 'tool_use', id, name, input }] },
})
const user = (content: unknown) => ({ type: 'user', message: { content } })
const none = new Set<string>()

describe('reviewedShasFromTranscript() (#3483)', () => {
  it('counts a code-review Skill call whose args name the sha', () => {
    const t = jsonl(toolUse('Skill', { skill: 'code-review', args: `origin/main (head ${SHA})` }))
    expect(reviewedShasFromTranscript(t, none)).toEqual([SHA])
  })

  it('counts the slash command with its args, not a tool_result that quotes one', () => {
    const cmd = `<command-message>code-review</command-message>\n<command-name>/code-review</command-name>\n<command-args>origin/main ${SHA}</command-args>`
    expect(reviewedShasFromTranscript(jsonl(user(cmd)), none)).toEqual([SHA])
    const quoted = [{ type: 'tool_result', content: cmd }]
    expect(reviewedShasFromTranscript(jsonl(user(quoted)), none)).toEqual([])
  })

  it('ignores a call that names no sha and any other Skill', () => {
    const t = jsonl(
      toolUse('Skill', { skill: 'code-review', args: 'origin/main' }),
      toolUse('Skill', { skill: 'tdd', args: SHA }),
    )
    expect(reviewedShasFromTranscript(t, none)).toEqual([])
  })

  it('counts a SendMessage to a run reviewer, not to any other agent', () => {
    const t = jsonl(toolUse('SendMessage', { to: 'a1', message: `re-check ${SHA}` }))
    expect(reviewedShasFromTranscript(t, new Set(['a1']))).toEqual([SHA])
    expect(reviewedShasFromTranscript(t, new Set(['a2']))).toEqual([])
  })

  it('does not count a plain Agent reviewer', () => {
    expect(reviewedShasFromTranscript(jsonl(toolUse('Agent', { prompt: `review ${SHA}` })), none)).toEqual([])
  })

  it('counts reviewedHead in a clear-backlog-build notification, not in another workflow', () => {
    const note = (id: string) =>
      `<task-notification>\n<tool-use-id>${id}</tool-use-id>\n<result>[{"branch":"b","reviewedHead":"${SHA}"}]</result>\n</task-notification>`
    const t = (id: string) =>
      jsonl(toolUse('Workflow', { name: 'clear-backlog-build', args: {} }, 'toolu_w'), user(note(id)))
    expect(reviewedShasFromTranscript(t('toolu_w'), none)).toEqual([SHA])
    expect(reviewedShasFromTranscript(t('toolu_other'), none)).toEqual([])
  })

  it('reads reviewedHead from the output file when the notification cut the result', () => {
    const note = `<task-notification>\n<tool-use-id>toolu_w</tool-use-id>\n<output-file>/tasks/w.output</output-file>\n<status>completed</status>\n<result>[{"branch":"a","reviews":"... (truncated 9000 chars)</result>\n</task-notification>`
    const t = jsonl(toolUse('Workflow', { name: 'clear-backlog-build', args: {} }, 'toolu_w'), user(note))
    const full = JSON.stringify({ result: [{ branch: 'a' }, { branch: 'b', reviewedHead: SHA }] }, null, 2)
    expect(reviewedShasFromTranscript(t, none, (p) => (p === '/tasks/w.output' ? full : null))).toEqual([SHA])
    expect(reviewedShasFromTranscript(t, none, () => null)).toEqual([])
  })
})

describe('reviewerAgentIds() (#3483)', () => {
  it("returns the reviewers every workflow run's journal started, not its builders", () => {
    const dir = mkdtempSync(join(tmpdir(), 'review-proof-'))
    const transcript = join(dir, 'uuid.jsonl')
    writeFileSync(transcript, '')
    const run = (id: string, ...recs: object[]) => {
      const d = join(dir, 'uuid', 'subagents', 'workflows', id)
      mkdirSync(d, { recursive: true })
      writeFileSync(join(d, 'journal.jsonl'), jsonl(...recs))
    }
    run(
      'wf_1',
      { type: 'launched' },
      { type: 'started', agentId: 'b1', label: 'build fix/1-x' },
      { type: 'started', agentId: 's1', label: 'Standards fix/1-x r1' },
      { type: 'result', agentId: 'x1', label: 'Spec fix/1-x r1' },
    )
    run('wf_2', { type: 'started', agentId: 'p2', label: 'Both fix/2-y r2' })
    try {
      expect([...reviewerAgentIds(transcript)].sort()).toEqual(['p2', 's1'])
      expect(reviewerAgentIds(join(dir, 'none.jsonl')).size).toBe(0)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
