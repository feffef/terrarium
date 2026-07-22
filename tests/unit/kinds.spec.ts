// L3 — the collection-kind registry (ADR-0025, issue #642). Kinds are the
// cross-Tenant read contracts that make `#catalog`/`queryAcrossTenants` possible;
// every kind carries a *minimum contract* (a Zod object merged into each opted-in
// collection's own schema — shared/expand.ts). `resolveKind` is the resolution
// seam, tested here directly. The injectable `registry` param mirrors
// `resolveSpaceRoute`'s injectable `map`, so the resolution path can be exercised
// without minting a real permanent contract.
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { KINDS, resolveKind, type KindDef } from '../../shared/kinds.ts'
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

describe('resolveKind()', () => {
  it('resolves a known kind', () => {
    expect(resolveKind('page')).toBe(KINDS.page)
  })

  it('throws — pointing at shared/kinds.ts — on an unknown kind', () => {
    expect(() => resolveKind('nope')).toThrow(/unknown collection kind "nope".*shared\/kinds\.ts/)
  })

  it('resolves a data kind from an injected registry', () => {
    const contract = z.object({ title: z.string() })
    const registry: Record<string, KindDef> = { note: { type: 'data', contract } }
    const resolved = resolveKind('note', registry)
    expect(resolved.type).toBe('data')
    expect(resolved.contract).toBe(contract)
  })

  it('does not fall through to the real KINDS when a registry is injected', () => {
    expect(() => resolveKind('page', { note: { type: 'data', contract: z.object({}) } })).toThrow(
      /unknown collection kind "page"/,
    )
  })
})
