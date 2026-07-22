// L3 — the collection-kind registry (ADR-0025, issue #642). Kinds are the
// cross-Tenant read contracts that make `#catalog`/`queryAcrossTenants` possible;
// `resolveKind` is the resolution seam, tested here directly. The injectable
// `registry` param mirrors `resolveSpaceRoute`'s injectable `map`, so the
// data-kind path can be exercised without minting a real permanent contract.
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { KINDS, resolveKind, type KindDef } from '../../shared/kinds.ts'

describe('KINDS registry', () => {
  it('ships the `page` kind as a schema-less marker (page fields are built-in)', () => {
    // `toEqual` to the exact literal already asserts there is no `schema` key —
    // and the `satisfies`-narrowed type of `KINDS.page` has no `schema` property
    // to read directly, which is itself the guarantee.
    expect(KINDS.page).toEqual({ type: 'page' })
  })

  it('is a plain object every entry of which names a valid collection type', () => {
    for (const [name, def] of Object.entries(KINDS)) {
      expect(['page', 'data'], `kind "${name}"`).toContain(def.type)
    }
  })
})

describe('resolveKind()', () => {
  it('resolves a known kind', () => {
    expect(resolveKind('page')).toBe(KINDS.page)
  })

  it('throws — pointing at shared/kinds.ts — on an unknown kind', () => {
    expect(() => resolveKind('nope')).toThrow(/unknown collection kind "nope".*shared\/kinds\.ts/)
  })

  it('resolves a data kind from an injected registry (the schema-bearing path)', () => {
    const schema = z.object({ title: z.string() })
    const registry: Record<string, KindDef> = { note: { type: 'data', schema } }
    const resolved = resolveKind('note', registry)
    expect(resolved.type).toBe('data')
    expect(resolved.schema).toBe(schema)
  })

  it('does not fall through to the real KINDS when a registry is injected', () => {
    expect(() => resolveKind('page', { note: { type: 'data', schema: z.object({}) } })).toThrow(
      /unknown collection kind "page"/,
    )
  })
})
