// The Journal's `routines` entry: one Routine's runs, every field mandatory (issue #2239).
import { describe, expect, it } from 'vitest'
import { routineSchema } from '../../tenant.config'

const run = {
  session: 'session_01CWSnzXtHSt7wjmNA2hA2ST',
  startedAt: '2026-09-09T01:00:00Z',
  durationSeconds: 900,
  inputTokens: 78,
  outputTokens: 10_826,
  cacheReadTokens: 3_814_284,
  cacheWriteTokens: 74_723,
  costUsd: 1.17,
}

describe('routineSchema', () => {
  it('accepts a Routine with its runs', () => {
    expect(routineSchema.safeParse({ name: 'digest', runs: [run] }).success).toBe(true)
  })

  it.each(Object.keys(run))('rejects a run without %s', (field) => {
    const { [field]: _, ...partial } = run as Record<string, unknown>
    expect(routineSchema.safeParse({ name: 'digest', runs: [partial] }).success).toBe(false)
  })
})
