// The Skill Inventory entry's optional `runUsage` (issue #2239).
import { describe, expect, it } from 'vitest'
import { skillSchema } from '../../tenant.config'

const entry = { name: 'digest', category: 'platform-operation', importance: 'routine', role: 'r', observations: [] }
const runUsage = { asOf: '2026-10-18', runs: 8, inputTokens: 120, outputTokens: 30_000, cacheReadTokens: 2_000_000, cacheWriteTokens: 150_000, costUsd: 1.13 }

describe('skillSchema runUsage', () => {
  it('is optional', () => {
    expect(skillSchema.safeParse(entry).success).toBe(true)
  })

  it('accepts a per-run mean with an asOf date', () => {
    expect(skillSchema.safeParse({ ...entry, runUsage }).success).toBe(true)
  })

  it('rejects one without an asOf date', () => {
    const { asOf: _, ...undated } = runUsage
    expect(skillSchema.safeParse({ ...entry, runUsage: undated }).success).toBe(false)
  })
})
