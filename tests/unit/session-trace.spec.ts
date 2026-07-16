// Unit coverage for the session-trace extractor + stitch (ADR-0009 amendment) —
// the pure, deterministic core that turns a transcript into the mechanical half
// of a session log and merges it with the authored scratch. The git plumbing
// lives in log-session.ts (already covered); here we pin the derivation and the
// merge rules, and prove a stitched entry satisfies the frozen schema.
import { describe, expect, it } from 'vitest'
import {
  DERIVED_REASON,
  DERIVED_REASON_COMMAND,
  DERIVED_REASON_EDITED,
  deriveTrigger,
  extractTrace,
  normalizeRemoteSessionId,
  parseTranscript,
  resolveGroundTruthSessionId,
  stitch,
  type AuthoredScratch,
} from '../../scripts/session-trace.ts'
import { validateEntry } from '../../scripts/log-session.ts'

// A tiny synthetic transcript: two assistant turns, a Read, an Edit, a Skill, a
// subagent, a noise read (node_modules), spanning two timestamps — plus the two
// harness shapes a slash-command expansion arrives in (string content and a text
// block), and a tool_result carrying a command tag that must NOT count.
const transcript = [
  { type: 'user', sessionId: 'session_01ABC', cwd: '/repo', gitBranch: 'feat/x', entrypoint: 'remote', version: '2.1.0', timestamp: '2026-07-06T10:00:00Z', message: { content: '<command-message>digest is running…</command-message>\n<command-name>/digest</command-name>' } },
  { type: 'user', timestamp: '2026-07-06T10:00:01Z', message: { content: [
    { type: 'text', text: '<command-name>frictions-to-fixes</command-name>\n<command-args></command-args>' },
  ] } },
  { type: 'user', timestamp: '2026-07-06T10:00:02Z', message: { content: [
    { type: 'tool_result', content: 'transcript excerpt: <command-name>/not-invoked</command-name>' },
  ] } },
  { type: 'assistant', timestamp: '2026-07-06T10:00:10.000Z', message: { model: 'claude-opus-4-8', content: [
    { type: 'tool_use', name: 'Read', input: { file_path: '/repo/CONTEXT.md' } },
    { type: 'tool_use', name: 'Read', input: { file_path: '/repo/node_modules/dep/index.js' } },
  ] } },
  { type: 'assistant', timestamp: '2026-07-06T10:05:00Z', message: { model: 'claude-opus-4-8', content: [
    { type: 'tool_use', name: 'Read', input: { file_path: '/repo/app.ts' } },
    { type: 'tool_use', name: 'Edit', input: { file_path: '/repo/app.ts' } },
    { type: 'tool_use', name: 'Skill', input: { skill: 'tdd' } },
    { type: 'tool_use', name: 'Agent', input: { subagent_type: 'Explore', description: 'find X' } },
  ] } },
].map((r) => JSON.stringify(r)).join('\n')

// Isolate every extractTrace() call from the real sandbox's own
// CLAUDE_CODE_REMOTE_SESSION_ID (issue #387/#449) — otherwise a test run
// FROM WITHIN a live Claude Code Remote session picks up that session's own
// id instead of the synthetic transcript's, exactly the failure mode this
// feature closes.
const NO_ENV = {}

describe('extractTrace()', () => {
  const trace = extractTrace(parseTranscript(transcript), NO_ENV)

  it('derives identity + timings from the transcript, not self-report', () => {
    expect(trace.session).toBe('session_01ABC')
    expect(trace.gitBranch).toBe('feat/x')
    expect(trace.entrypoint).toBe('remote')
    expect(trace.startedAt).toBe('2026-07-06T10:00:00Z')
    expect(trace.endedAt).toBe('2026-07-06T10:05:00Z')
    expect(trace.durationSec).toBe(300)
  })

  it('counts models + tools and captures subagents', () => {
    expect(trace.models).toEqual({ 'claude-opus-4-8': 2 })
    expect(trace.toolCounts).toEqual({ Read: 3, Edit: 1, Skill: 1, Agent: 1 })
    expect(trace.subagents).toEqual([{ type: 'Explore', task: 'find X', model: undefined }])
  })

  it('filters noise, then relativizes repo paths to how the agent cites them', () => {
    expect(trace.filesRead).toEqual(['CONTEXT.md', 'app.ts']) // node_modules dropped, cwd stripped
    expect(trace.filesEdited).toEqual(['app.ts'])
  })

  it('unions Skill tool calls with slash-command expansions, ignoring tool_results', () => {
    expect(trace.skillsUsed).toEqual(['tdd', 'digest', 'frictions-to-fixes']) // '/not-invoked' excluded
    expect(trace.commandSkills).toEqual(['digest', 'frictions-to-fixes'])
    expect(trace.toolCounts.Skill).toBe(1) // the expansion is not a tool call
  })

  it('omits trigger for a non-remote_trigger session (this fixture is entrypoint: remote)', () => {
    expect(trace.entrypoint).toBe('remote')
    expect(trace.trigger).toBeUndefined()
  })
})

describe('deriveTrigger() — issue #449 Gap 1', () => {
  const records = (userContent: unknown) =>
    parseTranscript(
      [
        JSON.stringify({
          type: 'user',
          timestamp: '2026-07-13T04:08:40Z',
          entrypoint: 'remote_trigger',
          message: { content: userContent },
        }),
      ].join('\n'),
    )

  it('derives the slash-command name from a Routine-fired first turn', () => {
    const trace = extractTrace(
      records('<command-message>audit-docs is running…</command-message>\n<command-name>/audit-docs</command-name>'),
      NO_ENV,
    )
    expect(trace.trigger).toBe('audit-docs')
  })

  it('falls back to the first line of a freeform Routine prompt with no slash command', () => {
    const trace = extractTrace(
      records('Check whether the deploy PR is still green and merge it if so.\nMore detail below.'),
      NO_ENV,
    )
    expect(trace.trigger).toBe('Check whether the deploy PR is still green and merge it if so.')
  })

  it('is absent for a non-remote_trigger session even with a slash command in the first turn', () => {
    const jsonl = [
      JSON.stringify({
        type: 'user',
        timestamp: '2026-07-13T04:08:40Z',
        entrypoint: 'remote',
        message: { content: '<command-name>/digest</command-name>' },
      }),
    ].join('\n')
    expect(deriveTrigger(parseTranscript(jsonl), 'remote')).toBeUndefined()
  })

  it('is absent when the first user turn has no text at all', () => {
    const trace = extractTrace(records([{ type: 'tool_result', content: 'no text blocks here' }]), NO_ENV)
    expect(trace.trigger).toBeUndefined()
  })
})

describe('normalizeRemoteSessionId() / resolveGroundTruthSessionId() — issue #387', () => {
  it('maps a CLAUDE_CODE_REMOTE_SESSION_ID cse_ id onto the session_ form', () => {
    expect(normalizeRemoteSessionId('cse_019W471jzQDwoZmKzJKtE4vk')).toBe('session_019W471jzQDwoZmKzJKtE4vk')
  })

  it('returns undefined for an absent or differently-shaped value', () => {
    expect(normalizeRemoteSessionId(undefined)).toBeUndefined()
    expect(normalizeRemoteSessionId('not-a-cse-id')).toBeUndefined()
  })

  it('prefers the normalized env id over the transcript session id when both are present', () => {
    expect(
      resolveGroundTruthSessionId('b84dc292-4954-52dc-b693-5681f040259e', {
        CLAUDE_CODE_REMOTE_SESSION_ID: 'cse_019W471jzQDwoZmKzJKtE4vk',
      }),
    ).toBe('session_019W471jzQDwoZmKzJKtE4vk')
  })

  it('falls back to the transcript session id for a plain local CLI session (no CCR env var)', () => {
    expect(resolveGroundTruthSessionId('b84dc292-4954-52dc-b693-5681f040259e', {})).toBe(
      'b84dc292-4954-52dc-b693-5681f040259e',
    )
  })

  it('returns undefined when neither source is available', () => {
    expect(resolveGroundTruthSessionId(undefined, {})).toBeUndefined()
  })
})

describe('stitch()', () => {
  const trace = extractTrace(parseTranscript(transcript), NO_ENV)
  const scratch: AuthoredScratch = {
    session: 'session_01ABC',
    goal: 'Prove the stitch',
    status: 'completed',
    outcome: 'It merges',
    summary: 'Authored summary.',
    docsRead: [{ path: 'CONTEXT.md', reason: 'the domain model' }],
    skillsUsed: [],
    frictions: [],
  }
  const entry = stitch(scratch, trace)

  it('takes interpretive fields from the scratch and mechanical from the trace', () => {
    expect(entry.summary).toBe('Authored summary.')
    expect(entry.startedAt).toBe('2026-07-06T10:00:00Z') // derived, not authored
    expect(entry.durationSec).toBe(300)
    expect(entry.models).toEqual({ 'claude-opus-4-8': 2 })
    expect(entry.gitBranch).toBe('feat/x')
  })

  it('takes session from the resolved ground truth, not the hand-typed authored value (issue #387/#449 postmortem)', () => {
    // The exact failure mode this closes: an authored scratch typed with the
    // wrong id must not win over what the trace/environment actually resolved.
    const wronglyAuthored: AuthoredScratch = { ...scratch, session: 'session_TOTALLY_WRONG' }
    const mismatched = stitch(wronglyAuthored, trace)
    expect(mismatched.session).toBe('session_01ABC') // trace's resolved ground truth, not the authored typo
  })

  it('falls back to the authored session only when the trace has none at all', () => {
    const noSessionTrace = { ...trace, session: undefined }
    const fallback = stitch(scratch, noSessionTrace)
    expect(fallback.session).toBe('session_01ABC') // scratch.session, the last resort
  })

  it('keeps the agent-curated reason and does not duplicate an already-cited read', () => {
    const docs = entry.docsRead as { path: string; reason: string }[]
    const ctx = docs.filter((d) => d.path === 'CONTEXT.md')
    expect(ctx).toHaveLength(1)
    expect(ctx[0]?.reason).toBe('the domain model') // authored reason preserved, not clobbered
  })

  it('folds an uncited-but-also-edited read in with the edited-specific reason', () => {
    const docs = entry.docsRead as { path: string; reason: string }[]
    const appTs = docs.filter((d) => d.path === 'app.ts')
    expect(appTs).toEqual([{ path: 'app.ts', reason: DERIVED_REASON_EDITED }])
  })

  it('folds an observed-but-uncited skill in, with provenance for command-invoked ones', () => {
    const skills = entry.skillsUsed as { name: string; reason: string }[]
    expect(skills).toEqual([
      { name: 'tdd', reason: DERIVED_REASON },
      { name: 'digest', reason: DERIVED_REASON_COMMAND },
      { name: 'frictions-to-fixes', reason: DERIVED_REASON_COMMAND },
    ])
  })

  it('drops empty mechanical collections but a stitched entry stays schema-valid', () => {
    const res = validateEntry(entry)
    expect(res.ok).toBe(true)
  })

  it('omits trigger when the trace has none, carries it through and stays schema-valid when it does', () => {
    expect('trigger' in entry).toBe(false)
    const withTrigger = stitch(scratch, { ...trace, trigger: 'audit-docs' })
    expect(withTrigger.trigger).toBe('audit-docs')
    expect(validateEntry(withTrigger).ok).toBe(true)
  })

  it('omits learnings/ideas entirely when the scratch has none', () => {
    expect('learnings' in entry).toBe(false)
    expect('ideas' in entry).toBe(false)
  })

  it('carries authored learnings/ideas through and stays schema-valid', () => {
    const withSparks = stitch(
      { ...scratch, learnings: ['layer `~/` resolves to the main app'], ideas: ['cluster frictions into tags'] },
      trace,
    )
    expect(withSparks.learnings).toEqual(['layer `~/` resolves to the main app'])
    expect(withSparks.ideas).toEqual(['cluster frictions into tags'])
    expect(validateEntry(withSparks).ok).toBe(true)
  })
})
