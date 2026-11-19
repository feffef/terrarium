import { describe, expect, it } from 'vitest'
import { reviewedShasFromTranscript } from '../../scripts/session/review-proof.ts'

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
})
