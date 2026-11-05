// The cost of a run by phase, from a small fixture transcript.
import { describe, expect, it } from 'vitest'
import { breakdown, costOf, phaseOf, requestsOf } from '../../scripts/cost.ts'

const rec = (id: string, at: string, model: string, usage: Record<string, unknown>) => ({ type: 'assistant', timestamp: at, message: { id, model, usage } })

describe('requestsOf', () => {
  it('counts a request once however many content blocks it was written as, keeping the last record', () => {
    const rs = requestsOf([
      rec('m1', '2026-11-05T10:00:00Z', 'claude-sonnet-5-5', { output_tokens: 1 }),
      rec('m1', '2026-11-05T10:00:01Z', 'claude-sonnet-5-5', { output_tokens: 90 }),
      { type: 'user', timestamp: '2026-11-05T10:00:02Z' },
    ])
    expect(rs).toHaveLength(1)
    expect(rs[0]!.usage.output_tokens).toBe(90)
  })
})

describe('costOf', () => {
  it('prices input, cache reads, 1h and 5m cache writes and output by model', () => {
    const usage = { input_tokens: 1e6, cache_read_input_tokens: 1e6, cache_creation: { ephemeral_5m_input_tokens: 1e6, ephemeral_1h_input_tokens: 1e6 }, output_tokens: 1e6 }
    // sonnet: 2 + 0.2 + 2.5 + 4 + 10; opus: 4 + 0.2 + 5 + 8 + 20
    expect(costOf({ at: 0, model: 'claude-sonnet-5-5', usage })).toBeCloseTo(18.7)
    expect(costOf({ at: 0, model: 'claude-opus-5-5', usage })).toBeCloseTo(37.2)
  })
  it('refuses a model it has no price for', () => {
    expect(() => costOf({ at: 0, model: 'claude-unknown-9', usage: {} })).toThrow('no price for model claude-unknown-9')
  })
})

describe('phaseOf', () => {
  it('reads the phase from the dispatch description prefix', () => {
    expect(['Rater A: clarity', 'Research claude-code', 'Write hooks', 'Gate judge 3', 'A judge a1', 'Code review', 'Fix links'].map(phaseOf)).toEqual(['rate', 'research', 'write', 'gate', 'elect', 'review', 'other'])
  })
})

describe('breakdown', () => {
  const lead = requestsOf([
    rec('l1', '2026-11-05T10:00:00Z', 'claude-sonnet-5-5', { input_tokens: 100_000 }),
    rec('l2', '2026-11-05T10:10:00Z', 'claude-sonnet-5-5', { input_tokens: 200_000 }),
    rec('l3', '2026-11-05T10:20:00Z', 'claude-sonnet-5-5', { input_tokens: 300_000 }),
  ])
  const agents = [
    { label: 'Write hooks', requests: requestsOf([rec('w1', '2026-11-05T10:05:00Z', 'claude-opus-5-5', { input_tokens: 1e6 })]) },
    { label: 'Write rules', requests: requestsOf([rec('w2', '2026-11-05T10:06:00Z', 'claude-opus-5-5', { input_tokens: 1e6 })]) },
    { label: 'Gate judge 1', requests: requestsOf([rec('g1', '2026-11-05T10:15:00Z', 'claude-sonnet-5-5', { input_tokens: 1e6 })]) },
  ]
  const marks = [{ phase: 'tally', at: '2026-11-05T10:01:00Z' }, { phase: 'gate', at: '2026-11-05T10:12:00Z' }, { phase: 'record', at: '2026-11-05T10:30:00Z' }]

  it('sums the lead, groups agents by phase and checks the lead at each phase start, counting from the first', () => {
    const b = breakdown(lead, agents, marks)
    expect(b.agentsUsd).toEqual({ write: 8, gate: 2 })
    expect(b.leadUsd).toBe(1.2)
    expect(b.totalUsd).toBe(11.2)
    expect(b.lead).toEqual([
      { phase: 'tally', at: '2026-11-05T10:01:00Z', contextK: 100, costUsd: 0 },
      { phase: 'gate', at: '2026-11-05T10:12:00Z', contextK: 200, costUsd: 0.4 },
      { phase: 'record', at: '2026-11-05T10:30:00Z', contextK: 300, costUsd: 1 },
    ])
  })
  it('keeps only the first start of a phase that ran in several rounds', () => {
    const rounds = [...marks, { phase: 'gate', at: '2026-11-05T10:25:00Z' }]
    expect(breakdown(lead, agents, rounds).lead.map((p) => p.phase)).toEqual(['tally', 'gate', 'record'])
  })
})
