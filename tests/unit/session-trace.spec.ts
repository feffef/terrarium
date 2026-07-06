// Unit coverage for the session-trace extractor + stitch (ADR-0009 amendment) —
// the pure, deterministic core that turns a transcript into the mechanical half
// of a session log and merges it with the authored scratch. The git plumbing
// lives in log-session.ts (already covered); here we pin the derivation and the
// merge rules, and prove a stitched entry satisfies the frozen schema.
import { describe, expect, it } from 'vitest'
import {
  DERIVED_REASON,
  extractTrace,
  parseTranscript,
  stitch,
  type AuthoredScratch,
} from '../../scripts/session-trace.ts'
import { validateEntry } from '../../scripts/log-session.ts'

// A tiny synthetic transcript: two assistant turns, a Read, an Edit, a Skill, a
// subagent, a noise read (node_modules), spanning two timestamps.
const transcript = [
  { type: 'user', sessionId: 'session_01ABC', cwd: '/repo', gitBranch: 'feat/x', entrypoint: 'remote', version: '2.1.0', timestamp: '2026-07-06T10:00:00Z', message: { content: 'go' } },
  { type: 'assistant', timestamp: '2026-07-06T10:00:10.000Z', message: { model: 'claude-opus-4-8', content: [
    { type: 'tool_use', name: 'Read', input: { file_path: '/repo/CONTEXT.md' } },
    { type: 'tool_use', name: 'Read', input: { file_path: '/repo/node_modules/dep/index.js' } },
  ] } },
  { type: 'assistant', timestamp: '2026-07-06T10:05:00Z', message: { model: 'claude-opus-4-8', content: [
    { type: 'tool_use', name: 'Edit', input: { file_path: '/repo/app.ts' } },
    { type: 'tool_use', name: 'Skill', input: { skill: 'tdd' } },
    { type: 'tool_use', name: 'Agent', input: { subagent_type: 'Explore', description: 'find X' } },
  ] } },
].map((r) => JSON.stringify(r)).join('\n')

describe('extractTrace()', () => {
  const trace = extractTrace(parseTranscript(transcript))

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
    expect(trace.toolCounts).toEqual({ Read: 2, Edit: 1, Skill: 1, Agent: 1 })
    expect(trace.subagents).toEqual([{ type: 'Explore', task: 'find X', model: undefined }])
  })

  it('filters noise, then relativizes repo paths to how the agent cites them', () => {
    expect(trace.filesRead).toEqual(['CONTEXT.md']) // node_modules dropped, cwd stripped
    expect(trace.filesEdited).toEqual(['app.ts'])
    expect(trace.skillsUsed).toEqual(['tdd'])
  })
})

describe('stitch()', () => {
  const trace = extractTrace(parseTranscript(transcript))
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

  it('keeps the agent-curated reason and does not duplicate an already-cited read', () => {
    const docs = entry.docsRead as { path: string; reason: string }[]
    const ctx = docs.filter((d) => d.path === 'CONTEXT.md')
    expect(ctx).toHaveLength(1)
    expect(ctx[0]?.reason).toBe('the domain model') // authored reason preserved, not clobbered
  })

  it('folds an observed-but-uncited skill in with the placeholder reason', () => {
    const skills = entry.skillsUsed as { name: string; reason: string }[]
    expect(skills).toEqual([{ name: 'tdd', reason: DERIVED_REASON }])
  })

  it('drops empty mechanical collections but a stitched entry stays schema-valid', () => {
    const res = validateEntry(entry)
    expect(res.ok).toBe(true)
  })
})
