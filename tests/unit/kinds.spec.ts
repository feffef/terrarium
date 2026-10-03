// L3 — the collection-kind registry (ADR-0025, issue #642). Kinds are the
// cross-Tenant read contracts that make `#catalog`/`queryAcrossTenants` possible;
// every kind carries a *minimum contract* (a Zod object merged into each opted-in
// collection's own schema — shared/expand.ts).
import { describe, expect, it } from 'vitest'
import { KINDS, type KindDef } from '../../shared/kinds.ts'
import { sessionSchema } from '../../shared/schemas/session.ts'

describe('KINDS registry', () => {
  it('every kind carries a contract (a zod object) and a valid collection type', () => {
    for (const [name, def] of Object.entries(KINDS) as [string, KindDef][]) {
      expect(['page', 'data'], `kind "${name}"`).toContain(def.type)
      expect(typeof def.contract?.safeParse, `kind "${name}" contract`).toBe('function')
    }
  })

  it('ships the `page` kind with the optional cross-cutting page metadata', () => {
    expect(KINDS.page.type).toBe('page')
    expect(Object.keys(KINDS.page.contract.shape).sort()).toEqual(['publishedAt', 'summary'])
    // Optional — a pages collection is heterogeneous (index landings carry neither).
    expect(KINDS.page.contract.safeParse({}).success).toBe(true)
    expect(
      KINDS.page.contract.safeParse({ publishedAt: '2026-07-22T10:00:00Z', summary: 'a day' }).success,
    ).toBe(true)
  })

  it('page contract rejects a non-UTC publish instant (the single-homed refinement)', () => {
    expect(KINDS.page.contract.safeParse({ publishedAt: '2026-07-22' }).success).toBe(false)
    expect(KINDS.page.contract.safeParse({ publishedAt: '2026-07-22T10:00:00+02:00' }).success).toBe(false)
  })

  it('ships the `session` data kind whose contract IS the shared session schema', () => {
    expect(KINDS.session.type).toBe('data')
    expect(KINDS.session.contract).toBe(sessionSchema)
  })
})
