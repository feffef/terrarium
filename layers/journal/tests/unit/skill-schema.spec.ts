// The Skill Inventory entry's optional `runCosts` (issue #2239).
import { describe, expect, it } from 'vitest'
import { skillSchema } from '../../tenant.config'

const entry = { name: 'digest', category: 'platform-operation', importance: 'routine', role: 'r', observations: [] }
const run = { session: 'session_01CWSnzXtHSt7wjmNA2hA2ST', date: '2026-09-09', inputTokens: 78, outputTokens: 10_826, cacheReadTokens: 3_814_284, cacheWriteTokens: 74_723, costUsd: 1.17 }

describe('skillSchema runCosts', () => {
  it('is optional', () => {
    expect(skillSchema.safeParse(entry).success).toBe(true)
  })

  it('accepts one row per run', () => {
    expect(skillSchema.safeParse({ ...entry, runCosts: [run] }).success).toBe(true)
  })

  it('rejects a row without a session id', () => {
    const { session: _, ...anonymous } = run
    expect(skillSchema.safeParse({ ...entry, runCosts: [anonymous] }).success).toBe(false)
  })
})
